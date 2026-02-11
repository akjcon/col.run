"use client";

import { Drawer } from "vaul";
import { Send, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useChatContext, type ChatMessage } from "@/lib/chat-context";
import { useUser } from "@/lib/user-context-rtk";
import type { ChatContext } from "@/lib/types";

// ---------------------------------------------------------------------------
// Suggested prompts by trigger
// ---------------------------------------------------------------------------

function getSuggestedPrompts(ctx: ChatContext | null) {
  switch (ctx?.trigger) {
    case "workout":
      return [
        { label: "Warm Up", prompt: "How should I warm up for this workout?" },
        {
          label: "Pacing",
          prompt: `What pace should I target for this ${ctx.workout?.title || "workout"}?`,
        },
        {
          label: "Modify",
          prompt: "I'm not feeling great. How should I modify this workout?",
        },
        {
          label: "Purpose",
          prompt: "What's the purpose of this workout in my plan?",
        },
      ];
    case "tomorrow":
      return [
        {
          label: "Prepare",
          prompt: `How should I prepare for tomorrow's ${ctx.workout?.title || "workout"}?`,
        },
        {
          label: "Nutrition",
          prompt: "What should I eat tonight to prepare?",
        },
        {
          label: "Swap Days",
          prompt: "Can I swap today and tomorrow's workouts?",
        },
      ];
    case "progress":
      return [
        {
          label: "On Track?",
          prompt: "Am I on track with my training plan?",
        },
        {
          label: "Adjust Volume",
          prompt: "Should I adjust my weekly mileage?",
        },
        {
          label: "Phase Goals",
          prompt: `What should I focus on during ${ctx.progress?.phaseName || "this phase"}?`,
        },
      ];
    default:
      return [
        {
          label: "Today's Focus",
          prompt: "What should I focus on for today's workout?",
        },
        {
          label: "Pace Adjustment",
          prompt: "How should I adjust my pace if I'm feeling tired?",
        },
        {
          label: "Recovery",
          prompt: "What's the best way to recover after today's workout?",
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Shared ChatUI — used by both mobile drawer and desktop panel
// ---------------------------------------------------------------------------

function ChatUI() {
  const {
    context,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
  } = useChatContext();
  const { userId } = useUser();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      };

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      const updatedMessages = [...messages, userMsg];
      setMessages([...updatedMessages, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages
              .filter((m) => m.id !== "welcome")
              .map((m) => ({ role: m.role, content: m.content })),
            userId,
            context,
          }),
        });

        if (!response.ok) throw new Error("Chat request failed");

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunk },
            ];
          });
        }
      } catch {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              content:
                last.content ||
                "Sorry, I encountered an error. Please try again.",
            },
          ];
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, userId, context, setMessages, setIsStreaming]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const suggestedPrompts = getSuggestedPrompts(context);
  const showSuggestions = messages.length <= 1 && !isStreaming;

  return (
    <>
      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg p-3",
                message.role === "user"
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-900"
              )}
            >
              {message.content ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              ) : (
                <div className="flex items-center gap-1 py-1">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:0ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:150ms]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:300ms]" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {showSuggestions && (
        <div className="border-t border-neutral-200">
          <div className="flex gap-2 overflow-x-auto p-3 pb-2">
            {suggestedPrompts.map((sp) => (
              <button
                key={sp.label}
                onClick={() => handlePromptClick(sp.prompt)}
                className="flex-shrink-0 whitespace-nowrap rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-neutral-200 p-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your training..."
            className="w-full resize-none rounded-lg border border-neutral-200 p-3 pr-12 text-sm focus:border-neutral-300 focus:outline-none focus:ring-0"
            disabled={isStreaming}
            rows={2}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="absolute bottom-3 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-neutral-400">
          Enter to send, Shift+Enter for newline
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobile — Vaul bottom drawer (only opens when viewport < md)
// ---------------------------------------------------------------------------

export function MobileChatDrawer() {
  const { isOpen, closeChat } = useChatContext();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Don't open Vaul on desktop — DesktopChatPanel handles it
  const shouldOpen = isOpen && !isDesktop;

  return (
    <Drawer.Root
      open={shouldOpen}
      onOpenChange={(open) => {
        if (!open) closeChat();
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[85vh] flex-col rounded-t-[10px] border-t border-neutral-200 bg-white">
          {/* Handle */}
          <div className="flex justify-center p-2">
            <div className="h-1 w-12 rounded-full bg-neutral-300" />
          </div>

          {/* Header */}
          <div className="border-b border-neutral-200 px-4 pb-3">
            <Drawer.Title className="text-base font-medium text-neutral-900">
              Coach
            </Drawer.Title>
            <p className="text-xs text-neutral-500">
              Ask about your workouts, plan, or training
            </p>
          </div>

          <ChatUI />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ---------------------------------------------------------------------------
// Desktop — side panel that lives inside the layout flex container
// ---------------------------------------------------------------------------

export function DesktopChatPanel() {
  const { isOpen, closeChat } = useChatContext();

  return (
    <div
      className={cn(
        "flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out",
        isOpen ? "w-[400px]" : "w-0"
      )}
    >
      <div className="flex h-full w-[400px] flex-col border-l border-neutral-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-base font-medium text-neutral-900">Coach</h2>
            <p className="text-xs text-neutral-500">
              Ask about your workouts, plan, or training
            </p>
          </div>
          <button
            onClick={closeChat}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ChatUI />
      </div>
    </div>
  );
}
