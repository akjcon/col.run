"use client";

import { Drawer } from "vaul";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserData } from "@/lib/types";
import { Send } from "lucide-react";
import { useState, useRef, useEffect, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useSendChatMessageMutation } from "@/lib/store/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ChatDrawerProps {
  children: React.ReactNode;
  userData: UserData | null;
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Chat interface component with forwardRef
const ChatInterface = forwardRef<
  HTMLDivElement,
  {
    userData: UserData | null;
    userId: string;
    className?: string;
  }
>(({ userData, userId, className }, ref) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: userData?.generatedProfile?.recommendedPlan
        ? `Hi! I'm your training assistant. I have access to your ${userData.generatedProfile.recommendedPlan.planType} plan and the full Training for the Uphill Athlete book. How can I help you today?`
        : "Hi! I'm your training assistant. I have access to the full Training for the Uphill Athlete book. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [quickQuestion, setQuickQuestion] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [sendChatMessage, { isLoading: isChatLoading }] =
    useSendChatMessageMutation();

  const sendMessage = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");

    try {
      const result = await sendChatMessage({
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        userId: userId || undefined,
      }).unwrap();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (quickQuestion) {
      setChatInput(quickQuestion);
      setQuickQuestion("");
      inputRef.current?.focus();
    }
  }, [quickQuestion]);

  return (
    <div
      ref={ref}
      className={cn("mx-auto flex h-full max-w-2xl flex-col", className)}
    >
      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-white p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 p-3">
              <LoadingSpinner variant="inline" size="sm" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      <Card className="mx-4 border-x-0 border-b-0 rounded-none shadow-none">
        <CardContent className="p-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() =>
                setQuickQuestion("What should I focus on for today's workout?")
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Today&apos;s Focus
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "How should I adjust my pace if I'm feeling tired today?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Pace Adjustment
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "What's the best way to recover after today's workout?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Recovery Tips
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  userData?.trainingBackground?.goals.raceDistance
                    ? `What's the race strategy for my ${userData.trainingBackground.goals.raceDistance} based on my training?`
                    : "What's the race strategy based on my training?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Race Strategy
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your training..."
            className="min-h-[100px] w-full resize-none rounded-lg border border-gray-200 p-2 pr-12 text-base focus:border-gray-300 focus:outline-none focus:ring-0"
            disabled={isChatLoading}
            rows={2}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          <Button
            onClick={sendMessage}
            disabled={!chatInput.trim() || isChatLoading}
            className="absolute bottom-[18px] right-3 h-9 w-9 rounded-lg bg-gray-600 p-4 text-white hover:bg-gray-800"
            size="sm"
          >
            {isChatLoading ? (
              <LoadingSpinner variant="button" size="sm" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Press Enter to send</p>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";

export default function ChatDrawer({
  children,
  userData,
  userId,
  isOpen,
  onOpenChange,
}: ChatDrawerProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      {children}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[90vh] flex-col rounded-t-[10px] border-t border-gray-200 bg-white">
          {/* Handle Bar */}
          <div className="flex justify-center p-2">
            <div className="h-1 w-12 rounded-full bg-gray-300" />
          </div>

          {/* Header */}
          <div className="border-b border-gray-200 px-4 pb-2">
            <h2 className="text-sm font-medium text-gray-900">
              Training Assistant
            </h2>
            <p className="text-xs text-gray-600">
              Ask about your training plan, workouts, or general advice
            </p>
          </div>

          {/* Chat Interface */}
          <ChatInterface
            userData={userData}
            userId={userId}
            className="flex-1 overflow-hidden"
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
