"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Bot, User } from "lucide-react";
import { useUser } from "@/lib/user-context-rtk";
import { useSendChatMessageMutation } from "@/lib/store/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TrainingChat() {
  const { userData, isLoading: userLoading, userId } = useUser();
  const [sendChatMessage, { isLoading: isSending }] =
    useSendChatMessageMutation();

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const getWelcomeMessage = () => {
      if (!userData?.generatedProfile?.recommendedPlan) {
        return "Hi! I'm your training plan assistant. I have access to the full Training for the Uphill Athlete book. Ask me anything about training, nutrition, recovery, or race strategy!";
      }

      const plan = userData.generatedProfile.recommendedPlan;
      return `Hi! I'm your training plan assistant. I have access to the full Training for the Uphill Athlete book, your customized ${plan.planType} plan, and know you're currently on week ${plan.currentWeek} of ${plan.totalWeeks}. Ask me anything about your training, nutrition, recovery, specific workouts, or race strategy!`;
    };

    if (!userLoading) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: getWelcomeMessage(),
          timestamp: new Date(),
        },
      ]);
    }
  }, [userData, userLoading]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const result = await sendChatMessage({
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        userId: userId || undefined, // Include userId for personalized responses
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

  const quickQuestions = [
    "What's today's workout?",
    "How should I warm up?",
    "What's the purpose of Zone 2 training?",
    "How do I know if I'm training too hard?",
    "What should I eat before a long run?",
  ];

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-white pb-4 pt-6">
      <div className="mx-auto max-w-2xl px-4">
        <Card className="h-[calc(100vh-120px)] max-h-[800px] overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5" />
              <div>
                <CardTitle className="text-xl">
                  Training Plan Assistant
                </CardTitle>
                <CardDescription>
                  Powered by Training for the Uphill Athlete
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } p-4`}
              >
                <div className="flex max-w-[80%] gap-3">
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600" />
                    </div>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-start gap-3 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="rounded-lg bg-gray-100 px-4 py-2">
                  <LoadingSpinner variant="inline" size="sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Questions - Mobile/Compact */}
          <div className="border-t bg-gray-50 p-2 md:p-3">
            <p className="mb-2 text-xs font-medium text-gray-700 md:hidden">
              Quick Questions:
            </p>
            <p className="mb-2 hidden text-sm font-medium text-gray-700 md:block">
              Quick Questions:
            </p>
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(question)}
                  className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-700 shadow-sm transition-colors hover:bg-gray-100 md:px-3 md:py-1.5 md:text-sm"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Buttons Row */}
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto border-t bg-gray-50 p-2 md:gap-2 md:p-3">
            <button
              onClick={() =>
                setInput(
                  "What's the specific purpose of today's workout, and how should I approach it?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Today&apos;s Workout
            </button>
            <button
              onClick={() =>
                setInput(
                  userData?.trainingBackground?.goals.raceDistance
                    ? `What's a good nutrition plan during my ${userData.trainingBackground.goals.raceDistance}?`
                    : "What's a good nutrition plan during long runs?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Race Nutrition
            </button>
            <button
              onClick={() =>
                setInput(
                  "Based on my current training phase, what recovery strategies should I focus on?"
                )
              }
              className="flex-shrink-0 whitespace-nowrap rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-800 transition-colors hover:bg-gray-200"
            >
              Recovery Tips
            </button>
            <button
              onClick={() =>
                setInput(
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

          <div className="border-t p-3 md:p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your training plan, workouts, nutrition, recovery, race strategy..."
                className="max-h-[100px] min-h-[50px] flex-1 resize-none rounded-lg border border-gray-200 p-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 md:max-h-[120px] md:min-h-[60px] md:p-3 md:text-base"
                disabled={isSending}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isSending}
                className="h-20 self-end px-3 py-2 md:px-4 md:py-3"
              >
                {isSending ? (
                  <LoadingSpinner variant="button" size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 px-1 text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
