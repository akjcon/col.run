import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import {
  streamChatResponse,
  buildChatConfig,
} from "@/lib/llm-service";
import { getAdminDb } from "@/lib/firebase-admin";
import { validateWeek, validateDay } from "@/lib/blocks/validation";
import type { ChatContext, UserData, TrainingPlan, TrainingBackground, CoachMemoryEntry, ChatToolCall, ProposedPlanChange } from "@/lib/types";
import type { Week, Day } from "@/lib/blocks/types";
import { readCoachMemory, executeCoachMemoryUpdate, type CoachMemoryUpdate } from "@/lib/coach-memory";
import { recordServerEvent } from "@/lib/events-server";

// =============================================================================
// Firestore Read Tool Executor
// =============================================================================

interface FirestoreReadInput {
  path: string;
  limit?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
}

// Allowlist of paths the LLM may query through read_athlete_data. Anything
// not on this list is rejected — prevents the model from pulling Strava
// tokens, Clerk metadata, or anything else that ends up persisted into
// chatHistory via toolCallLog.
const READ_ATHLETE_DATA_ALLOWLIST = new Set<string>([
  "athleteSnapshot/current",
  "fitness/profile",
  "fitness/experience",
  "workoutLogs",
  "activities",
  "backgrounds",
]);

// Defense in depth: even on allowlisted paths, strip token-shaped fields
// before they end up in tool results (and downstream in chatHistory).
const TOKEN_FIELD_NAMES = new Set([
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "expiresAt",
  "expires_at",
  "apiKey",
  "api_key",
  "secret",
]);

function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(redactSensitive) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = TOKEN_FIELD_NAMES.has(k) ? "[redacted]" : redactSensitive(v);
    }
    return out as T;
  }
  return value;
}

async function executeFirestoreRead(
  userId: string,
  input: FirestoreReadInput
): Promise<string> {
  try {
    // Reject anything not on the allowlist. Collection reads pass just the
    // collection name (e.g. "workoutLogs"); doc reads pass "col/docId" (we
    // match on the literal known doc paths).
    const path = input.path?.trim() ?? "";
    const pathParts = path.split("/");
    const collectionName = pathParts[0];
    const isAllowed =
      READ_ATHLETE_DATA_ALLOWLIST.has(path) ||
      (pathParts.length === 1 && READ_ATHLETE_DATA_ALLOWLIST.has(collectionName));
    if (!isAllowed) {
      return JSON.stringify({
        error: `Path "${path}" is not accessible via read_athlete_data. Allowed: ${Array.from(READ_ATHLETE_DATA_ALLOWLIST).join(", ")}`,
      });
    }

    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);

    // Single document read (e.g. "athleteSnapshot/current", "fitness/profile")
    if (pathParts.length === 2) {
      const docSnap = await userRef
        .collection(pathParts[0])
        .doc(pathParts[1])
        .get();
      if (!docSnap.exists) return JSON.stringify({ exists: false });
      return JSON.stringify(redactSensitive(docSnap.data()));
    }

    // Collection read (e.g. "workoutLogs", "activities")
    let q: FirebaseFirestore.Query = userRef.collection(collectionName);

    if (input.orderBy) {
      q = q.orderBy(input.orderBy, input.orderDirection || "desc");
    }

    q = q.limit(input.limit || 10);

    const snap = await q.get();
    const docs = snap.docs.map((d) => redactSensitive({ id: d.id, ...d.data() }));
    return JSON.stringify(docs);
  } catch (error) {
    return JSON.stringify({ error: String(error) });
  }
}

export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Raw shape coming back from the LLM tool call — fields are optional until
// validation; the validator promotes good ones into ProposedPlanChange.
interface RawProposedChange {
  type?: "replace_week" | "replace_day" | "append_weeks";
  weekNumber?: number;
  dayOfWeek?: string;
  week?: Week;
  day?: Day;
  weeks?: Week[];
  summary?: string;
}

interface ToolInput {
  reasoning: string;
  changes: RawProposedChange[];
}

interface ThresholdPaceToolInput {
  reasoning: string;
  newThresholdPace: number;
}

interface ValidationResult {
  reasoning: string;
  changes: ProposedPlanChange[];
  validationErrors: string[];
}

// Validate raw LLM tool output and promote it to ProposedPlanChange. For
// append_weeks the server stamps an authoritative weekNumber (= the first
// new week's number, derived from a running count starting at the plan's
// totalWeeks) so the client UI doesn't render "New Week 0" when the LLM
// omits it. An unknown / malformed change always lands in validationErrors
// instead of silently dropping.
function validateProposedChanges(
  input: ToolInput,
  activePlan: TrainingPlan | null
): ValidationResult {
  const validChanges: ProposedPlanChange[] = [];
  const validationErrors: string[] = [];
  let runningWeekCount = activePlan?.totalWeeks ?? 0;

  for (const change of input.changes) {
    const summary = change.summary ?? "";

    if (change.type === "replace_week") {
      if (!change.week || typeof change.weekNumber !== "number") {
        validationErrors.push(
          `replace_week missing required fields (weekNumber, week)`
        );
        continue;
      }
      const result = validateWeek(change.week);
      if (!result.valid) {
        const msg = `Week ${change.weekNumber}: ${result.errors.join(", ")}`;
        console.warn(`Invalid week change:`, msg);
        validationErrors.push(msg);
        continue;
      }
      validChanges.push({
        type: "replace_week",
        weekNumber: change.weekNumber,
        week: change.week,
        summary,
      });
    } else if (change.type === "replace_day") {
      if (
        !change.day ||
        typeof change.weekNumber !== "number" ||
        !change.dayOfWeek
      ) {
        validationErrors.push(
          `replace_day missing required fields (weekNumber, dayOfWeek, day)`
        );
        continue;
      }
      const result = validateDay(change.day);
      if (!result.valid) {
        const msg = `${change.dayOfWeek} (Week ${change.weekNumber}): ${result.errors.join(", ")}`;
        console.warn(`Invalid day change:`, msg);
        validationErrors.push(msg);
        continue;
      }
      validChanges.push({
        type: "replace_day",
        weekNumber: change.weekNumber,
        dayOfWeek: change.dayOfWeek,
        day: change.day,
        summary,
      });
    } else if (change.type === "append_weeks") {
      if (!Array.isArray(change.weeks) || change.weeks.length === 0) {
        validationErrors.push(
          `append_weeks requires a non-empty 'weeks' array`
        );
        continue;
      }
      // All-or-nothing per-change validation so the LLM gets a clear
      // signal instead of a partial append.
      const errors: string[] = [];
      change.weeks.forEach((week, i) => {
        const result = validateWeek(week);
        if (!result.valid) {
          errors.push(`New week #${i + 1}: ${result.errors.join(", ")}`);
        }
      });
      if (errors.length > 0) {
        console.warn(`Invalid append_weeks change:`, errors.join("; "));
        validationErrors.push(...errors);
        continue;
      }
      const firstNew = runningWeekCount + 1;
      validChanges.push({
        type: "append_weeks",
        weekNumber: firstNew,
        weeks: change.weeks,
        summary,
      });
      runningWeekCount += change.weeks.length;
    } else {
      validationErrors.push(
        `Unknown change type: ${JSON.stringify(change.type)}`
      );
    }
  }

  return { reasoning: input.reasoning, changes: validChanges, validationErrors };
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

// Save chat message using Admin SDK. Throws on failure — callers decide
// how to react. Swallowing here historically produced silent gaps in
// chatHistory (response shown to user, never persisted, lost on reload).
const MAX_SAVE_ATTEMPTS = 2;
const SAVE_RETRY_DELAY_MS = 200; // targets transient Firestore commit blips

async function saveMessageAdmin(
  userId: string,
  message: { role: string; content: string; toolCalls?: ChatToolCall[] }
): Promise<void> {
  const adminDb = getAdminDb();
  const doc: Record<string, unknown> = {
    role: message.role,
    content: message.content,
    timestamp: new Date(),
  };
  if (message.toolCalls && message.toolCalls.length > 0) {
    doc.toolCalls = message.toolCalls;
  }
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("chatHistory")
        .add(doc);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_SAVE_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, SAVE_RETRY_DELAY_MS));
      }
    }
  }
  throw lastErr;
}

// Caps for tool-call audit fields stored on the assistant chatHistory doc.
// Firestore allows 1MB per doc; we leave a wide margin so a runaway tool
// loop can't render a chat session unsavable.
const TOOL_RESULT_MAX_CHARS = 2000;
const TOOL_INPUT_MAX_CHARS = 4000;
const MAX_TOOL_CALL_LOG_ENTRIES = 30;

function truncateResult(result: string): string {
  if (result.length <= TOOL_RESULT_MAX_CHARS) return result;
  return result.slice(0, TOOL_RESULT_MAX_CHARS) + `…[truncated, total ${result.length} chars]`;
}

// `input` is `unknown` and can be a large object (e.g. a propose_plan_changes
// payload with 7 days × 10 blocks per week × N weeks). Serialize and cap.
function truncateInput(input: unknown): unknown {
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return "[unserializable]";
  }
  if (serialized.length <= TOOL_INPUT_MAX_CHARS) return input;
  return {
    truncated: true,
    totalChars: serialized.length,
    preview: serialized.slice(0, TOOL_INPUT_MAX_CHARS),
  };
}

export async function POST(req: NextRequest) {
  try {
    // Capture the real Clerk session userId so server-side analytics events
    // can flag impersonation when the body userId differs.
    const { userId: clerkUserId } = await auth();

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

    // Helper for the three chat_error event call sites (user save, assistant
    // save, stream error). Centralizing keeps `realUserId` and structure
    // consistent and makes future call sites a one-liner.
    const recordChatError = (
      stage: string,
      extra: Record<string, unknown> = {}
    ) => {
      void recordServerEvent({
        userId,
        realUserId: clerkUserId,
        eventType: "chat_error",
        metadata: { stage, ...extra },
      });
    };

    // Sanitize an error for storage in event metadata. Captures the type
    // and the first line of the message; keeps stack frames, Firestore
    // paths, and Anthropic prompt fragments out of the analytics doc.
    const summarizeError = (err: unknown): { name: string; message: string } => {
      if (err instanceof Error) {
        return {
          name: err.name,
          message: err.message.split("\n")[0].slice(0, 200),
        };
      }
      return { name: "Unknown", message: String(err).slice(0, 200) };
    };

    // Kick off the user-message save and the user-data read in parallel.
    // The user save is durability insurance (so the question survives a
    // downstream failure); nothing in the LLM path reads from it, so
    // there's no reason to block time-to-first-token on it. Both promises
    // are awaited as one Promise.allSettled so we can react to either
    // failure independently.
    const [userSaveResult, userData] = await Promise.all([
      saveMessageAdmin(userId, {
        role: "user",
        content: lastMessage.content,
      }).then(
        () => ({ ok: true as const }),
        (err: unknown) => ({ ok: false as const, err })
      ),
      getServerUserData(userId),
    ]);

    if (!userSaveResult.ok) {
      console.error("Failed to save user chat message:", userSaveResult.err);
      recordChatError("user_message_save", { error: summarizeError(userSaveResult.err) });
      // Continue — the LLM can still respond; client retains the message
      // in memory so the conversation isn't immediately broken.
    }

    if (!userData) {
      // Fallback: minimal user data so streaming still works. Mirrors the
      // main path's save flow — without this, a user whose profile read
      // failed would see an assistant response that never persists,
      // exactly the bug the main path was rewritten to avoid.
      const fallbackData: UserData = {
        profile: { id: userId, email: "", name: "User", createdAt: Date.now(), completedOnboarding: false },
        chatHistory: [],
      };

      const stream = await streamChatResponse(messages, fallbackData, context, null);
      const encoder = new TextEncoder();
      let fallbackFullText = "";
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            stream.on("text", (text) => {
              fallbackFullText += text;
              controller.enqueue(encoder.encode(JSON.stringify({ type: "text", data: text }) + "\n"));
            });
            await stream.finalMessage();

            // Save assistant message before closing the stream.
            try {
              await saveMessageAdmin(userId, {
                role: "assistant",
                content: fallbackFullText,
              });
            } catch (saveErr) {
              recordChatError("assistant_message_save_fallback", {
                error: summarizeError(saveErr),
                contentLength: fallbackFullText.length,
              });
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "save_error",
                    data: {
                      message:
                        "Your response was generated but couldn't be saved. It may not appear if you refresh.",
                    },
                  }) + "\n"
                )
              );
            }

            controller.close();
          } catch (err) {
            console.error("Stream error:", err);
            const errMsg = err instanceof Error ? err.message : "Unknown error";
            const isRateLimit = errMsg.includes("rate_limit") || errMsg.includes("429") || errMsg.includes("too many requests");

            // Save partial content so a stream-mid-response failure doesn't
            // wipe everything the user already saw.
            if (fallbackFullText.length > 0) {
              try {
                await saveMessageAdmin(userId, {
                  role: "assistant",
                  content: `${fallbackFullText}\n\n[Response was interrupted by an error]`,
                });
              } catch (saveErr) {
                recordChatError("partial_save_after_stream_error_fallback", {
                  error: summarizeError(saveErr),
                });
              }
            }
            recordChatError("stream_error_fallback", {
              error: summarizeError(err),
              code: isRateLimit ? "RATE_LIMITED" : "STREAM_ERROR",
              hadPartialContent: fallbackFullText.length > 0,
            });

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

    // Read athlete snapshot and coach memory in parallel
    let coachMemory: CoachMemoryEntry[] = [];
    try {
      const adminDb = getAdminDb();
      const [snapshotDoc, memory] = await Promise.all([
        adminDb
          .collection("users")
          .doc(userId)
          .collection("athleteSnapshot")
          .doc("current")
          .get(),
        readCoachMemory(userId),
      ]);

      if (snapshotDoc.exists) {
        const snap = snapshotDoc.data()!;
        (userData as unknown as Record<string, unknown>).athleteSnapshot = snap;
      }
      coachMemory = memory;
    } catch (err) {
      console.warn("Could not read athlete snapshot/memory for chat:", err);
    }

    const activePlan = userData.activePlan || null;

    // Stream the response with NDJSON events
    const stream = await streamChatResponse(messages, userData, context, activePlan, coachMemory);
    const encoder = new TextEncoder();
    let fullText = "";

    // Audit log of every tool the LLM invoked during this turn, including
    // tool inputs and (for server-executed tools) truncated results. Saved
    // alongside the assistant message so /admin/chats can show what the
    // coach actually did vs. what it claimed.
    const toolCallLog: ChatToolCall[] = [];

    const readableStream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: object) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };

        try {
          // Send status as soon as a tool_use block starts streaming
          // (before the full JSON is received), so the client can show a spinner
          const attachToolStartListener = (s: typeof stream) => {
            s.on("streamEvent", (event) => {
              if (
                event.type === "content_block_start" &&
                event.content_block.type === "tool_use"
              ) {
                const name = event.content_block.name;
                if (name === "propose_plan_changes") {
                  sendEvent({ type: "status", data: "Preparing plan changes..." });
                } else if (name === "update_threshold_pace") {
                  sendEvent({ type: "status", data: "Updating pace zones..." });
                } else if (name === "read_athlete_data") {
                  sendEvent({ type: "status", data: "Looking up your data..." });
                } else if (name === "update_coach_memory") {
                  sendEvent({ type: "status", data: "Updating notes..." });
                }
              }
            });
          };

          // Stream text events in real-time
          stream.on("text", (text) => {
            fullText += text;
            sendEvent({ type: "text", data: text });
          });
          attachToolStartListener(stream);

          // Wait for the full message to resolve (accumulates tool_use blocks)
          let finalMessage = await stream.finalMessage();

          // Handle server-side tool calls (multi-turn loop)
          // read_athlete_data and update_coach_memory execute and return results
          // to the LLM so it can continue generating
          const SERVER_TOOLS = new Set(["read_athlete_data", "update_coach_memory"]);
          while (finalMessage.stop_reason === "tool_use") {
            const serverToolCalls = finalMessage.content.filter(
              (b): b is Anthropic.Messages.ToolUseBlock =>
                b.type === "tool_use" && SERVER_TOOLS.has(b.name)
            );

            // If no server-side tool calls, break to handle client tools below
            if (serverToolCalls.length === 0) break;

            // Execute all server-side tool calls
            const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
            for (const call of serverToolCalls) {
              let result: string;
              if (call.name === "read_athlete_data") {
                result = await executeFirestoreRead(
                  userId,
                  call.input as FirestoreReadInput
                );
              } else {
                result = await executeCoachMemoryUpdate(
                  userId,
                  call.input as CoachMemoryUpdate
                );
              }
              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: result,
              });
              if (toolCallLog.length < MAX_TOOL_CALL_LOG_ENTRIES) {
                toolCallLog.push({
                  name: call.name,
                  input: truncateInput(call.input),
                  result: truncateResult(result),
                });
              }
            }

            // Also include tool results for any non-server tools (return empty to satisfy API)
            const otherToolCalls = finalMessage.content.filter(
              (b): b is Anthropic.Messages.ToolUseBlock =>
                b.type === "tool_use" && !SERVER_TOOLS.has(b.name)
            );
            for (const call of otherToolCalls) {
              toolResults.push({
                type: "tool_result",
                tool_use_id: call.id,
                content: "Tool acknowledged — will be processed after response.",
              });
            }

            // Continue the conversation with tool results
            const anthropicClient = new Anthropic();
            const chatConfig = await buildChatConfig(userData, context, activePlan, coachMemory);
            const continuationStream = anthropicClient.messages.stream({
              model: "claude-opus-4-6",
              max_tokens: 16000,
              temperature: 0.6,
              system: chatConfig.systemPrompt,
              tools: chatConfig.tools,
              messages: [
                ...messages.map((msg) => ({
                  role: msg.role as "user" | "assistant",
                  content: msg.content,
                })),
                { role: "assistant" as const, content: finalMessage.content },
                { role: "user" as const, content: toolResults },
              ],
            });

            continuationStream.on("text", (text) => {
              fullText += text;
              sendEvent({ type: "text", data: text });
            });
            attachToolStartListener(continuationStream);

            finalMessage = await continuationStream.finalMessage();
          }

          // Process ALL remaining tool_use blocks (plan mods, threshold pace)
          const toolBlocks = finalMessage.content.filter(
            (b): b is Anthropic.Messages.ToolUseBlock =>
              b.type === "tool_use"
          );

          for (const toolBlock of toolBlocks) {
            if (toolCallLog.length < MAX_TOOL_CALL_LOG_ENTRIES) {
              toolCallLog.push({
                name: toolBlock.name,
                input: truncateInput(toolBlock.input),
              });
            }
            if (toolBlock.name === "propose_plan_changes") {
              const validated = validateProposedChanges(toolBlock.input as ToolInput, activePlan);
              if (validated.changes.length > 0) {
                sendEvent({
                  type: "plan_modification",
                  data: {
                    reasoning: validated.reasoning,
                    changes: validated.changes,
                    ...(validated.validationErrors.length > 0
                      ? { validationWarnings: validated.validationErrors }
                      : {}),
                  },
                });
                void recordServerEvent({
                  userId,
                  realUserId: clerkUserId,
                  eventType: "plan_change_proposed",
                  metadata: {
                    changeCount: validated.changes.length,
                    types: validated.changes.map((c) => c.type),
                  },
                });
              } else if (validated.validationErrors.length > 0) {
                // All changes failed validation — tell the user
                sendEvent({
                  type: "plan_modification_failed",
                  data: {
                    reasoning: validated.reasoning,
                    errors: validated.validationErrors,
                  },
                });
              }
            } else if (toolBlock.name === "update_threshold_pace") {
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
              void recordServerEvent({
                userId,
                realUserId: clerkUserId,
                eventType: "pace_zone_update_proposed",
                metadata: {
                  newThresholdPace: pace,
                  currentThresholdPace,
                },
              });
            }
          }

          // Build the tool-call summary suffix that gets appended to the
          // saved assistant content so /admin/chats can read proposals
          // inline with the text.
          const toolSummaries: string[] = [];
          for (const tb of toolBlocks) {
            if (tb.name === "propose_plan_changes") {
              const input = tb.input as ToolInput;
              const changeSummary = input.changes
                .map((c) => {
                  if (c.type === "replace_day") {
                    return `${c.dayOfWeek} (Week ${c.weekNumber}): ${c.summary}`;
                  }
                  if (c.type === "append_weeks") {
                    const count = c.weeks?.length ?? 0;
                    return `Append ${count} week${count === 1 ? "" : "s"}: ${c.summary}`;
                  }
                  return `Week ${c.weekNumber}: ${c.summary}`;
                })
                .join("; ");
              toolSummaries.push(`[Proposed changes: ${changeSummary}]`);
            } else if (tb.name === "update_threshold_pace") {
              const input = tb.input as ThresholdPaceToolInput;
              toolSummaries.push(`[Proposed threshold pace update: ${input.newThresholdPace.toFixed(2)} min/mi]`);
            }
          }

          const savedContent = toolSummaries.length > 0
            ? `${fullText}\n\n${toolSummaries.join("\n")}`
            : fullText;

          // Save the assistant message BEFORE closing the stream. Closing
          // first hides save failures from both client and analytics; doing
          // it here means we can react if persistence drops.
          try {
            await saveMessageAdmin(userId, {
              role: "assistant",
              content: savedContent,
              toolCalls: toolCallLog,
            });
          } catch (saveError) {
            console.error("Failed to save assistant message:", saveError);
            recordChatError("assistant_message_save", {
              error: summarizeError(saveError),
              contentLength: savedContent.length,
              toolCallCount: toolCallLog.length,
            });
            sendEvent({
              type: "save_error",
              data: {
                message:
                  "Your response was generated but couldn't be saved. It may not appear if you refresh.",
              },
            });
          }

          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          const isRateLimit = errMsg.includes("rate_limit") || errMsg.includes("429") || errMsg.includes("too many requests");
          const isOverloaded = errMsg.includes("overloaded") || errMsg.includes("529");

          // Persist whatever partial response we managed to stream, so the
          // user doesn't lose what they already saw on reload. Mark it as
          // interrupted so admins/users can tell.
          let partialSaveFailed = false;
          if (fullText.length > 0) {
            try {
              await saveMessageAdmin(userId, {
                role: "assistant",
                content: `${fullText}\n\n[Response was interrupted by an error]`,
                toolCalls: toolCallLog,
              });
            } catch (saveErr) {
              partialSaveFailed = true;
              console.error("Failed to save partial assistant message after stream error:", saveErr);
              recordChatError("partial_save_after_stream_error", {
                error: summarizeError(saveErr),
                partialContentLength: fullText.length,
              });
            }
          }

          recordChatError("stream_error", {
            error: summarizeError(err),
            code: isRateLimit ? "RATE_LIMITED" : isOverloaded ? "OVERLOADED" : "STREAM_ERROR",
            hadPartialContent: fullText.length > 0,
            partialContentLength: fullText.length,
            partialSaveFailed,
          });

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
