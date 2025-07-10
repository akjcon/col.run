import { NextRequest, NextResponse } from "next/server";
import {
  fullChatResponse,
  quickChatResponse,
  shouldUseFullContext,
} from "@/lib/llm-service";
import { getUserData, saveChatMessage } from "@/lib/firestore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      userId,
    }: {
      messages: ChatMessage[];
      userId?: string;
    } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];

    // If no userId, use quick response without personalization
    if (!userId) {
      console.log("Using quick response for unauthenticated user");
      const response = await quickChatResponse(lastMessage.content);
      return NextResponse.json({ message: response });
    }

    // Get user data for personalized responses
    const userData = await getUserData(userId);

    if (!userData) {
      console.log("User data not found, using quick response");
      const response = await quickChatResponse(lastMessage.content);
      return NextResponse.json({ message: response });
    }

    // Determine which LLM to use based on the message content
    const useFullContext = shouldUseFullContext(lastMessage.content);

    let response: string;

    if (useFullContext) {
      console.log("Using full context LLM with book knowledge");
      response = await fullChatResponse(messages, userData);
    } else {
      console.log("Using quick context LLM");
      response = await quickChatResponse(lastMessage.content, userData);
    }

    // Save the conversation to Firebase
    try {
      await saveChatMessage(userId, {
        role: "user",
        content: lastMessage.content,
      });

      await saveChatMessage(userId, {
        role: "assistant",
        content: response,
      });
    } catch (saveError) {
      console.error("Failed to save chat messages:", saveError);
      // Don't fail the whole request if saving fails
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
