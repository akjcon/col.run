"use client";

import {
  Tooltip as TooltipPrimitive,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipProps {
  content?: string;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
}

export function Tooltip({ content, side = "right", children }: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <TooltipPrimitive>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side}>
          <p>{content}</p>
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  );
}
