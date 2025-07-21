import {
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChatMessage } from "@/lib/types";
import {
  baseApi,
  sanitizeForFirestore,
  normalizeTimestamps,
  handleFirestoreError,
} from "./baseApi";

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Save chat message
    saveChatMessage: builder.mutation<
      string,
      {
        userId: string;
        message: Omit<ChatMessage, "id" | "timestamp">;
      }
    >({
      queryFn: async ({ userId, message }) => {
        try {
          const chatRef = collection(db, "users", userId, "chatHistory");
          const sanitizedMessage = sanitizeForFirestore({
            ...message,
            timestamp: serverTimestamp(),
          });

          const docRef = await addDoc(chatRef, sanitizedMessage);
          return { data: docRef.id };
        } catch (error) {
          return { error: handleFirestoreError(error, "save chat message") };
        }
      },
      invalidatesTags: (result, error, { userId }) => [
        { type: "User", id: userId },
        "ChatHistory",
      ],
    }),

    // Get chat history
    getChatHistory: builder.query<
      ChatMessage[],
      { userId: string; limit?: number }
    >({
      queryFn: async ({ userId, limit: limitCount = 50 }) => {
        try {
          const chatRef = collection(db, "users", userId, "chatHistory");
          const q = query(
            chatRef,
            orderBy("timestamp", "desc"),
            limit(limitCount)
          );
          const snapshot = await getDocs(q);

          const messages = snapshot.docs
            .map(
              (doc) =>
                normalizeTimestamps({
                  id: doc.id,
                  ...doc.data(),
                } as unknown as ChatMessage) as ChatMessage
            )
            .reverse(); // Return in chronological order

          return { data: messages };
        } catch (error) {
          return { error: handleFirestoreError(error, "get chat history") };
        }
      },
      providesTags: ["ChatHistory"],
    }),

    // Send chat message (combines LLM call with saving)
    sendChatMessage: builder.mutation<
      { message: string },
      {
        userId?: string;
        messages: Array<{ role: "user" | "assistant"; content: string }>;
      }
    >({
      queryFn: async ({ userId, messages }) => {
        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ messages, userId }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || "Failed to send chat message");
          }

          const result = await response.json();
          return { data: result };
        } catch (error) {
          return { error: handleFirestoreError(error, "send chat message") };
        }
      },
      invalidatesTags: (result, error, { userId }) =>
        userId ? [{ type: "User", id: userId }, "ChatHistory"] : [],
    }),
  }),
});

export const {
  useSaveChatMessageMutation,
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
} = chatApi;
