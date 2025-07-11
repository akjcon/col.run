"use client";

import { useState, useEffect, useRef } from "react";
import { Drawer } from "vaul";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

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
  messagesEndRef: React.RefObject<HTMLDivElement>;
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
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="border-b border-gray-200 p-4 pt-0 bg-white">
        <h3 className="font-bold text-gray-900 tracking-tight text-lg">
          Your Coach
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Ask about training, nutrition, or race strategy
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[75%] p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      <div className="border-t border-gray-200 p-3 pb-1 bg-white">
        <p className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-widest">
          Quick Questions
        </p>
        <div className="overflow-x-auto">
          <div className="flex gap-2 pb-2">
            <button
              onClick={() =>
                setQuickQuestion("What should I focus on for today's workout?")
              }
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-800 transition-colors whitespace-nowrap"
            >
              Today&apos;s Focus
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "How should I fuel for my long runs this weekend?"
                )
              }
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-800 transition-colors whitespace-nowrap"
            >
              Nutrition
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "I'm feeling more tired than usual, should I adjust my training?"
                )
              }
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-800 transition-colors whitespace-nowrap"
            >
              Recovery
            </button>
            <button
              onClick={() =>
                setQuickQuestion(
                  "My [injury] is acting up, what should I do? Do I need to adjust my training?"
                )
              }
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-800 transition-colors whitespace-nowrap"
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
              className="flex-shrink-0 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-xs text-gray-800 transition-colors whitespace-nowrap"
            >
              Race Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your training..."
            className="w-full min-h-[40px] max-h-[80px] p-2 pr-12 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-0 focus:border-gray-300 text-sm"
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
            className="absolute bottom-2 right-2 p-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
            size="sm"
          >
            {isChatLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-1">Press Enter to send</p>
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userId: userId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
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
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="bg-white flex flex-col rounded-t-[20px] h-[90%] mt-24 fixed bottom-0 left-0 right-0 z-[60]">
          <Drawer.Title className="sr-only">Chat with Coach</Drawer.Title>
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-zinc-300 mt-4 mb-2" />
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
