"use client";

import { MessageCircle } from "lucide-react";
import { useChatContext } from "@/lib/chat-context";
import { cn } from "@/lib/utils";
import type { ChatContext } from "@/lib/types";

interface AskCoachButtonProps {
  context: ChatContext;
  label?: string;
  className?: string;
}

export function AskCoachButton({
  context,
  label = "Ask Coach",
  className,
}: AskCoachButtonProps) {
  const { openChat } = useChatContext();

  return (
    <button
      onClick={() => openChat(context)}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900",
        className
      )}
    >
      <MessageCircle className="h-3 w-3" />
      {label}
    </button>
  );
}
