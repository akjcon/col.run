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
import type { ChatContext, ProposedPlanChange } from "@/lib/types";

export interface PlanModificationData {
  reasoning: string;
  changes: ProposedPlanChange[];
  status: "proposed" | "applying" | "applied" | "error";
  evaluation?: { structural: number; safety: number; methodology: number; overall: number };
  error?: string;
  validationWarnings?: string[];
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
  status?: string;
  error?: string;
  // Non-fatal save failure — response is shown in real-time but didn't
  // persist to chatHistory. Distinct from `error` (which marks the whole
  // message as failed). Surfaces as a small inline notice.
  saveWarning?: string;
  planModification?: PlanModificationData;
  paceZoneUpdate?: PaceZoneUpdateData;
}

// ---------------------------------------------------------------------------
// Affirmative-intent matcher
// ---------------------------------------------------------------------------
// When a proposal card is on screen and the user types a short pure
// affirmative (or refusal) instead of clicking the button, treat it as
// the click. Keep matching strict: only short, content-free replies. If
// the user adds qualifications ("yes but also..."), fall through to the
// LLM so we don't accidentally apply something they wanted to amend.

const AFFIRMATIVE_PATTERNS = [
  "yes",
  "yes please",
  "yeah",
  "yep",
  "yup",
  "yas",
  "sure",
  "ok",
  "okay",
  "k",
  "do it",
  "go for it",
  "go ahead",
  "lets do it",
  "let's do it",
  "sounds good",
  "looks good",
  "great",
  "perfect",
  "apply",
  "apply it",
  "approve",
  "approved",
  "confirm",
  "confirmed",
  "👍",
  "✅",
];

const NEGATIVE_PATTERNS = [
  "no",
  "nope",
  "nah",
  "decline",
  "reject",
  "dismiss",
  "cancel",
  "skip",
  "skip it",
  "keep current",
  "leave it",
  "never mind",
  "nevermind",
  "no thanks",
  "no thank you",
  "❌",
  "👎",
];

const AFFIRMATIVE_SET = new Set(AFFIRMATIVE_PATTERNS);
const NEGATIVE_SET = new Set(NEGATIVE_PATTERNS);

/**
 * Inspect a user message to decide whether it's a stand-alone yes/no
 * reply to a pending proposal. Returns "apply" / "decline" / null. Only
 * matches short, pure replies — any extra qualification (commas, "but",
 * "and") falls through to the LLM.
 */
export function interpretAffirmativeIntent(
  text: string
): "apply" | "decline" | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed || trimmed.length > 20) return null;
  // Strip a trailing punctuation char so "yes!" / "yes." still match.
  const cleaned = trimmed.replace(/[!.?\s]+$/g, "");
  if (AFFIRMATIVE_SET.has(cleaned)) return "apply";
  if (NEGATIVE_SET.has(cleaned)) return "decline";
  return null;
}

function getWelcomeMessage(ctx: ChatContext | null): string {
  if (!ctx || ctx.trigger === "sidebar") {
    return "Hey! I'm your training coach. Ask me anything about your plan, workouts, or running in general.";
  }
  switch (ctx.trigger) {
    case "workout":
      return `I can see you're looking at today's ${ctx.workout?.title || "workout"}${ctx.workout?.miles ? ` (${Math.round(ctx.workout.miles * 10) / 10} mi)` : ""}. How can I help?`;
    case "tomorrow":
      return `Let's get you ready for tomorrow's ${ctx.workout?.title || "workout"}. What do you need?`;
    case "progress":
      return `You're on week ${ctx.progress?.currentWeek || "?"} of ${ctx.progress?.totalWeeks || "?"}${ctx.progress?.phaseName ? ` — ${ctx.progress.phaseName}` : ""}. What would you like to know?`;
    case "pace-zones":
      return "Questions about your pace zones? I can explain how they work, help you dial them in, or update your threshold pace.";
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
