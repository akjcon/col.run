import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  streamChatResponse,
} from "@/lib/llm-service";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateWeek, validateDay } from "@/lib/blocks/validation";
import type { ChatContext, UserData, TrainingPlan, TrainingBackground } from "@/lib/types";
import type { Week, Day } from "@/lib/blocks/types";

export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProposedChange {
  type: "replace_week" | "replace_day";
  weekNumber: number;
  dayOfWeek?: string;
  week?: Week;
  day?: Day;
  summary: string;
}

interface ToolInput {
  reasoning: string;
  changes: ProposedChange[];
}

interface ThresholdPaceToolInput {
  reasoning: string;
  newThresholdPace: number;
}

function validateProposedChanges(input: ToolInput): ToolInput {
  const validChanges: ProposedChange[] = [];

  for (const change of input.changes) {
    if (change.type === "replace_week" && change.week) {
      const result = validateWeek(change.week);
      if (result.valid) {
        validChanges.push(change);
      } else {
        console.warn(`Invalid week change for week ${change.weekNumber}:`, result.errors);
      }
    } else if (change.type === "replace_day" && change.day) {
      const result = validateDay(change.day);
      if (result.valid) {
        validChanges.push(change);
      } else {
        console.warn(`Invalid day change for ${change.dayOfWeek} week ${change.weekNumber}:`, result.errors);
      }
    }
  }

  return { reasoning: input.reasoning, changes: validChanges };
}

// Read user data using Admin SDK (server-side)
async function getServerUserData(userId: string): Promise<UserData | null> {
  try {
    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(userId);

    // Read profile, background, and active plan in parallel
    const [profileSnap, backgroundSnap, planSnap] = await Promise.all([
      userRef.get(),
      userRef.collection("backgrounds").orderBy("createdAt", "desc").limit(1).get(),
      userRef.collection("trainingPlans").where("isActive", "==", true).limit(1).get(),
    ]);

    if (!profileSnap.exists) return null;

    const profile = { id: userId, ...profileSnap.data() } as UserData["profile"];

    let trainingBackground: TrainingBackground | undefined;
    if (!backgroundSnap.empty) {
      trainingBackground = backgroundSnap.docs[0].data() as TrainingBackground;
    }

    let activePlan: TrainingPlan | undefined;
    if (!planSnap.empty) {
      const planDoc = planSnap.docs[0];
      activePlan = { id: planDoc.id, ...planDoc.data() } as TrainingPlan;
    }

    return {
      profile,
      trainingBackground,
      activePlan,
      chatHistory: [],
    };
  } catch (error) {
    console.error("Error reading user data via admin SDK:", error);
    return null;
  }
}

// Save chat message using Admin SDK
async function saveMessageAdmin(userId: string, message: { role: string; content: string }) {
  try {
    const adminDb = getAdminDb();
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("chatHistory")
      .add({
        ...message,
        timestamp: new Date(),
      });
  } catch (error) {
    console.error("Failed to save chat message:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      userId,
      context,
    }: {
      messages: ChatMessage[];
      userId?: string;
      context?: ChatContext;
    } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lastMessage = messages[messages.length - 1];

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user data via Admin SDK (server-side)
    const userData = await getServerUserData(userId);

    if (!userData) {
      // Fallback: minimal user data so streaming still works
      const fallbackData: UserData = {
        profile: { id: userId, email: "", name: "User", createdAt: Date.now(), completedOnboarding: false },
        chatHistory: [],
      };

      const stream = await streamChatResponse(messages, fallbackData, context, null);
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            stream.on("text", (text) => {
              controller.enqueue(encoder.encode(JSON.stringify({ type: "text", data: text }) + "\n"));
            });
            await stream.finalMessage();
            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
            const errMsg = err instanceof Error ? err.message : "Unknown error";
            const isRateLimit = errMsg.includes("rate_limit") || errMsg.includes("429") || errMsg.includes("too many requests");
            try {
              controller.enqueue(encoder.encode(JSON.stringify({
                type: "error",
                data: {
                  message: isRateLimit
                    ? "Too many requests. Please wait a moment and try again."
                    : "Something went wrong. Please try again.",
                  code: isRateLimit ? "RATE_LIMITED" : "STREAM_ERROR",
                },
              }) + "\n"));
              controller.close();
            } catch {
              controller.error(err);
            }
          }
        },
      });
      return new Response(readableStream, {
        headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
      });
    }

    // Read athlete snapshot for enriched coaching context
    try {
      const adminDb = getAdminDb();
      const snapshotDoc = await adminDb
        .collection("users")
        .doc(userId)
        .collection("athleteSnapshot")
        .doc("current")
        .get();

      if (snapshotDoc.exists) {
        const snap = snapshotDoc.data()!;
        (userData as unknown as Record<string, unknown>).athleteSnapshot = snap;
      }
    } catch (err) {
      console.warn("Could not read athlete snapshot for chat:", err);
    }

    const activePlan = userData.activePlan || null;

    // Stream the response with NDJSON events
    const stream = await streamChatResponse(messages, userData, context, activePlan);
    const encoder = new TextEncoder();
    let fullText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          // Stream text events in real-time
          stream.on("text", (text) => {
            fullText += text;
            sendEvent({ type: "text", data: text });
          });

          // Wait for the full message to resolve (accumulates tool_use blocks)
          const finalMessage = await stream.finalMessage();

          // Check for tool calls
          const toolBlock = finalMessage.content.find(
            (b): b is Anthropic.Messages.ToolUseBlock =>
              b.type === "tool_use"
          );

          if (toolBlock && toolBlock.name === "propose_plan_changes") {
            const validated = validateProposedChanges(toolBlock.input as ToolInput);
            if (validated.changes.length > 0) {
              sendEvent({ type: "plan_modification", data: validated });
            }
          } else if (toolBlock && toolBlock.name === "update_threshold_pace") {
            const input = toolBlock.input as ThresholdPaceToolInput;
            // Validate threshold pace is in range
            const pace = Math.max(4, Math.min(20, input.newThresholdPace));
            // Read current threshold from snapshot
            let currentThresholdPace: number | undefined;
            try {
              const adminDb = getAdminDb();
              const snapshotDoc = await adminDb
                .collection("users")
                .doc(userId)
                .collection("athleteSnapshot")
                .doc("current")
                .get();
              if (snapshotDoc.exists) {
                const snap = snapshotDoc.data()!;
                currentThresholdPace = snap.thresholdPace ?? snap.estimatedThresholdPace;
              }
            } catch {
              // Continue without current pace
            }

            sendEvent({
              type: "pace_zone_update",
              data: {
                reasoning: input.reasoning,
                newThresholdPace: pace,
                currentThresholdPace,
                status: "proposed",
              },
            });
          }

          controller.close();

          // Save messages in the background
          try {
            await saveMessageAdmin(userId, {
              role: "user",
              content: lastMessage.content,
            });

            if (toolBlock && toolBlock.name === "propose_plan_changes") {
              const input = toolBlock.input as ToolInput;
              const changeSummary = input.changes
                .map(
                  (c) =>
                    `${c.type === "replace_week" ? `Week ${c.weekNumber}` : `${c.dayOfWeek} (Week ${c.weekNumber})`}: ${c.summary}`
                )
                .join("; ");
              await saveMessageAdmin(userId, {
                role: "assistant",
                content: `${fullText}\n\n[Proposed changes: ${changeSummary}]`,
              });
            } else if (toolBlock && toolBlock.name === "update_threshold_pace") {
              const input = toolBlock.input as ThresholdPaceToolInput;
              await saveMessageAdmin(userId, {
                role: "assistant",
                content: `${fullText}\n\n[Proposed threshold pace update: ${input.newThresholdPace.toFixed(2)} min/mi]`,
              });
            } else {
              await saveMessageAdmin(userId, {
                role: "assistant",
                content: fullText,
              });
            }
          } catch (saveError) {
            console.error("Failed to save chat messages:", saveError);
          }
        } catch (err) {
          console.error("Stream error:", err);
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          const isRateLimit = errMsg.includes("rate_limit") || errMsg.includes("429") || errMsg.includes("too many requests");
          const isOverloaded = errMsg.includes("overloaded") || errMsg.includes("529");
          try {
            sendEvent({
              type: "error",
              data: {
                message: isRateLimit
                  ? "Too many requests. Please wait a moment and try again."
                  : isOverloaded
                    ? "The AI service is temporarily overloaded. Please try again in a minute."
                    : "Something went wrong. Please try again.",
                code: isRateLimit ? "RATE_LIMITED" : isOverloaded ? "OVERLOADED" : "STREAM_ERROR",
              },
            });
            controller.close();
          } catch {
            controller.error(err);
          }
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Detect rate limit errors from Anthropic
    const isRateLimit =
      error instanceof Error &&
      (error.message.includes("rate_limit") ||
        error.message.includes("429") ||
        error.message.includes("too many requests") ||
        error.message.includes("overloaded"));

    const isOverloaded =
      error instanceof Error &&
      (error.message.includes("overloaded") ||
        error.message.includes("529"));

    const status = isRateLimit ? 429 : isOverloaded ? 529 : 500;
    const userMessage = isRateLimit
      ? "Too many requests. Please wait a moment and try again."
      : isOverloaded
        ? "The AI service is temporarily overloaded. Please try again in a minute."
        : "Failed to process chat request";

    return new Response(
      JSON.stringify({
        error: userMessage,
        code: isRateLimit ? "RATE_LIMITED" : isOverloaded ? "OVERLOADED" : "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
