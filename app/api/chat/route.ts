import { NextRequest } from "next/server";
import {
  quickChatResponse,
  shouldUseFullContext,
  streamChatResponse,
} from "@/lib/llm-service";
import { getUserData, saveChatMessage } from "@/lib/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import type { ChatContext } from "@/lib/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

    // If no userId, use quick response (non-streaming fallback)
    if (!userId) {
      const response = await quickChatResponse(lastMessage.content);
      return new Response(response, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Get user data for personalized responses
    const userData = await getUserData(userId);

    if (!userData) {
      const response = await quickChatResponse(lastMessage.content);
      return new Response(response, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
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

    const useFullContext = shouldUseFullContext(lastMessage.content);

    // For non-full-context simple questions, still stream but through a simpler path
    if (!useFullContext && !context) {
      const response = await quickChatResponse(lastMessage.content, userData);
      // Save messages
      try {
        await saveChatMessage(userId, { role: "user", content: lastMessage.content });
        await saveChatMessage(userId, { role: "assistant", content: response });
      } catch (saveError) {
        console.error("Failed to save chat messages:", saveError);
      }
      return new Response(response, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Stream the response
    const stream = await streamChatResponse(messages, userData, context);
    const encoder = new TextEncoder();
    let fullResponse = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();

          // Save messages after stream completes
          try {
            await saveChatMessage(userId, {
              role: "user",
              content: lastMessage.content,
            });
            await saveChatMessage(userId, {
              role: "assistant",
              content: fullResponse,
            });
          } catch (saveError) {
            console.error("Failed to save chat messages:", saveError);
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
