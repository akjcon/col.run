"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ChatContext } from "@/lib/types";
import type { Week, Day } from "@/lib/blocks/types";

export interface PlanModificationData {
  reasoning: string;
  changes: Array<{
    type: "replace_week" | "replace_day";
    weekNumber: number;
    dayOfWeek?: string;
    week?: Week;
    day?: Day;
    summary: string;
  }>;
  status: "proposed" | "applying" | "applied" | "error";
  evaluation?: { structural: number; safety: number; methodology: number; overall: number };
  error?: string;
}

export interface PaceZoneUpdateData {
  reasoning: string;
  newThresholdPace: number;
  currentThresholdPace?: number;
  status: "proposed" | "applying" | "applied" | "error";
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  planModification?: PlanModificationData;
  paceZoneUpdate?: PaceZoneUpdateData;
}

function getWelcomeMessage(ctx: ChatContext | null): string {
  if (!ctx || ctx.trigger === "sidebar") {
    return "Hey! I'm your training coach. Ask me anything about your plan, workouts, or running in general.";
  }
  switch (ctx.trigger) {
    case "workout":
      return `I can see you're looking at today's ${ctx.workout?.title || "workout"}${ctx.workout?.miles ? ` (${ctx.workout.miles} mi)` : ""}. How can I help?`;
    case "tomorrow":
      return `Let's get you ready for tomorrow's ${ctx.workout?.title || "workout"}. What do you need?`;
    case "progress":
      return `You're on week ${ctx.progress?.currentWeek || "?"} of ${ctx.progress?.totalWeeks || "?"}${ctx.progress?.phaseName ? ` — ${ctx.progress.phaseName}` : ""}. What would you like to know?`;
    default:
      return "Hey! I'm your training coach. Ask me anything about your plan, workouts, or running in general.";
  }
}

const defaultWelcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: getWelcomeMessage(null),
};

interface ChatContextValue {
  isOpen: boolean;
  context: ChatContext | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isStreaming: boolean;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  openChat: (ctx: ChatContext) => void;
  toggleChat: () => void;
  closeChat: () => void;
}

const ChatCtx = createContext<ChatContextValue>({
  isOpen: false,
  context: null,
  messages: [defaultWelcome],
  setMessages: () => {},
  isStreaming: false,
  setIsStreaming: () => {},
  openChat: () => {},
  toggleChat: () => {},
  closeChat: () => {},
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ChatContext | null>(null);

  // Open chat by default on desktop
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      setIsOpen(true);
    }
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([defaultWelcome]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Opens with fresh context + resets messages
  const openChat = useCallback((ctx: ChatContext) => {
    setContext(ctx);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: getWelcomeMessage(ctx),
      },
    ]);
    setIsStreaming(false);
    setIsOpen(true);
  }, []);

  // Toggles panel visibility — preserves messages
  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Hides panel — preserves messages so reopening shows previous conversation
  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <ChatCtx.Provider
      value={{
        isOpen,
        context,
        messages,
        setMessages,
        isStreaming,
        setIsStreaming,
        openChat,
        toggleChat,
        closeChat,
      }}
    >
      {children}
    </ChatCtx.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatCtx);
}
