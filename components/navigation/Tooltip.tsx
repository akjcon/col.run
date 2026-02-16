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
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}

export function Tooltip({
  content,
  side = "right",
  align = "center",
  sideOffset = 8,
  children,
}: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <TooltipPrimitive>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset} avoidCollisions={false}>
          {content}
        </TooltipContent>
      </TooltipPrimitive>
    </TooltipProvider>
  );
}
