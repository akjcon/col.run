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
import { MessageCircle, Send, Bot, User, Loader2 } from "lucide-react";
import { useUser } from "@/lib/user-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function TrainingChat() {
  const { userData, isLoading: userLoading, userId } = useUser();

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
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

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
          userId: userId, // Include userId for personalized responses
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
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] md:min-h-screen bg-white">
      <div className="min-h-[calc(100vh-6rem)] md:h-full max-w-4xl mx-auto md:p-6 md:pt-2 flex flex-col">
        {/* Chat Interface */}
        <Card className="border shadow-sm flex-1 flex flex-col pb-0">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Training Plan Assistant
            </CardTitle>
            <CardDescription className="text-gray-600">
              Powered by your training book knowledge and current plan status
            </CardDescription>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <p
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {/* Quick Questions - Mobile/Compact */}
          <div className="border-t bg-gray-50 p-2 md:p-3">
            <p className="text-xs font-medium text-gray-700 mb-2 md:hidden">
              Quick Questions:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white"
                onClick={() =>
                  setInput("What should I focus on for today's workout?")
                }
              >
                Today&#39;s Workout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white"
                onClick={() =>
                  setInput("How should I fuel for my long runs this weekend?")
                }
              >
                Nutrition
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white"
                onClick={() =>
                  setInput(
                    "I'm feeling more tired than usual, should I adjust my training?"
                  )
                }
              >
                Recovery
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-auto p-2 bg-white"
                onClick={() =>
                  setInput(
                    userData?.trainingBackground?.goals.raceDistance
                      ? `What's the race strategy for my ${userData.trainingBackground.goals.raceDistance} based on my training?`
                      : "What's the race strategy based on my training?"
                  )
                }
              >
                Race Strategy
              </Button>
            </div>
          </div>

          {/* Input */}
          <div className="border-t p-3 md:p-4">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your training plan, workouts, nutrition, recovery, race strategy..."
                className="flex-1 min-h-[50px] md:min-h-[60px] max-h-[100px] md:max-h-[120px] p-2 md:p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="self-end px-3 md:px-4 py-2 md:py-3 h-20"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 px-1">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
