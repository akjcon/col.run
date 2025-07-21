"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useSendChatMessageMutation } from "@/lib/store/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserData {
  generatedProfile?: {
    recommendedPlan?: {
      planType: string;
      currentWeek: number;
      totalWeeks: number;
    };
  };
  trainingBackground?: {
    goals: {
      raceDistance?: string;
    };
  };
}

interface ChatDrawerProps {
  userData: UserData;
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const ChatInterface = ({
  messages,
  chatInput,
  setChatInput,
  isChatLoading,
  messagesEndRef,
  handleKeyPress,
  sendMessage,
  setQuickQuestion,
  userData,
}: {
  messages: Message[];
  chatInput: string;
  setChatInput: (value: string) => void;
  isChatLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  handleKeyPress: (e: React.KeyboardEvent) => void;
  sendMessage: () => void;
  setQuickQuestion: (question: string) => void;
  userData: UserData;
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Chat Header */}
      <div className="border-b border-gray-200 bg-white p-4 pt-0">
        <h3 className="text-lg font-bold tracking-tight text-gray-900">
          Your Coach
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Ask about training, nutrition, or race strategy
        </p>
      </div>

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
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      <div className="border-t border-gray-200 bg-white p-3 pb-1">
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-900">
          Quick Questions
        </p>
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-2">
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
                  "How should I fuel for my long runs this weekend?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Nutrition
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "I'm feeling more tired than usual, should I adjust my training?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Recovery
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "My [injury] is acting up, what should I do? Do I need to adjust my training?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Injury Advice
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
        </div>
      </div>

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
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Press Enter to send</p>
      </div>
    </div>
  );
};

export default function ChatDrawer({
  userData,
  userId,
  isOpen,
  onOpenChange,
  children,
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sendChatMessage] = useSendChatMessageMutation();

  // Initialize welcome message
  useEffect(() => {
    const getWelcomeMessage = () => {
      if (!userData?.generatedProfile?.recommendedPlan) {
        return "Hi! I'm your training plan assistant. I have access to the full Training for the Uphill Athlete book. Ask me anything about training, nutrition, recovery, or race strategy!";
      }

      const plan = userData.generatedProfile.recommendedPlan;
      return `Hi! I'm your training plan assistant. I have access to the full Training for the Uphill Athlete book, your customized ${plan.planType} plan, and know you're currently on week ${plan.currentWeek} of ${plan.totalWeeks}. Ask me anything about your training, nutrition, recovery, specific workouts, or race strategy!`;
    };

    if (userData) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: getWelcomeMessage(),
          timestamp: new Date(),
        },
      ]);
    }
  }, [userData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

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
    setIsChatLoading(true);

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
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const setQuickQuestion = (question: string) => {
    setChatInput(question);
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      {children}
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] mt-12 flex h-[90%] flex-col rounded-t-[30px] bg-white">
          <Drawer.Title className="sr-only">Chat with Coach</Drawer.Title>
          <div className="mx-auto mb-2 mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-zinc-300" />
          <ChatInterface
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            isChatLoading={isChatLoading}
            messagesEndRef={messagesEndRef}
            handleKeyPress={handleKeyPress}
            sendMessage={sendMessage}
            setQuickQuestion={setQuickQuestion}
            userData={userData}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
