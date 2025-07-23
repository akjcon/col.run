"use client";

import { cn } from "@/lib/utils";
import { ArrowLeftToLine, ArrowRightToLine, Menu } from "lucide-react";

/**
 * Toggle button component for expanding/collapsing the sidebar
 * @param isExpanded - Whether the sidebar is currently expanded
 * @param onToggle - Function to call when the toggle button is clicked
 */
export function ToggleButton({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex w-10 shrink-0 items-center justify-center">
      <button
        onClick={onToggle}
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center p-2",
          "group rounded-md transition-all duration-300 active:scale-95",
          "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border-transparent"
        )}
        type="button"
      >
        <div className="relative *:duration-300">
          <Menu
            className={cn(
              "h-4 w-4 shrink-0 transition-all",
              "group-hover:scale-80 scale-100 opacity-100 group-hover:opacity-0"
            )}
          />
          {isExpanded ? (
            <ArrowLeftToLine
              className={cn(
                "absolute inset-0 h-4 w-4 shrink-0 transition-all",
                "scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100"
              )}
            />
          ) : (
            <ArrowRightToLine
              className={cn(
                "absolute inset-0 h-4 w-4 shrink-0 transition-all",
                "scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-100"
              )}
            />
          )}
        </div>
      </button>
    </div>
  );
}
