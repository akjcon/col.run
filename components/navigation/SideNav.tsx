"use client";

import { useState, useEffect } from "react";
import { navigationItems, sidebarVariants, textVariants } from "./constants";
import { NavLink } from "./NavLink";
import { UserProfile } from "./UserProfile";
import { ToggleButton } from "./ToggleButton";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useChatContext } from "@/lib/chat-context";
import { Tooltip } from "./Tooltip";
import { cn } from "@/lib/utils";

export function SideNav() {
  // Read the persisted state synchronously from the data-attribute set by
  // the no-flash script in app/layout.tsx. This avoids the brief snap from
  // the default state to the user's saved state on every page load.
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.dataset.sideNav === "expanded";
  });
  const { toggleChat, isOpen: isChatOpen } = useChatContext();

  // Persist whenever the user toggles
  useEffect(() => {
    localStorage.setItem("sideNavExpanded", JSON.stringify(isExpanded));
    document.documentElement.dataset.sideNav = isExpanded ? "expanded" : "collapsed";
  }, [isExpanded]);

  return (
    <motion.aside
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className="relative flex h-screen flex-col border-r border-neutral-200 bg-white shadow-xs"
    >
      {/* Logo and Toggle Button */}
      <div className="flex h-14 items-center justify-between px-2">
        <div className="flex items-center">
          <ToggleButton
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />
          <Link href="/home" className="ml-3 flex items-center">
            <img src="/col_logo.svg" alt="col" className="h-8 w-auto" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={textVariants}
                  className="ml-3 text-xl font-medium text-neutral-900"
                >
                  col
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>

      {/* Divider */}
      <hr className="mx-4 border-neutral-200" />

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigationItems.map((item) => (
          <NavLink key={item.href} item={item} isExpanded={isExpanded} />
        ))}
      </nav>

      {/* Coach Button */}
      <div className="mt-auto px-2 pb-2">
        <Tooltip
          content={isExpanded ? undefined : "Coach"}
          side="right"
          align="center"
        >
          <button
            onClick={toggleChat}
            className={cn(
              "group relative flex h-10 w-full items-center rounded-lg py-2 text-left transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]",
              isChatOpen ? "bg-neutral-100" : "hover:bg-neutral-50"
            )}
          >
            <div className="flex w-10 shrink-0 items-center justify-center">
              <MessageCircle
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors duration-150",
                  isChatOpen
                    ? "text-neutral-900"
                    : "text-neutral-600 group-hover:text-neutral-900"
                )}
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <AnimatePresence>
                {isExpanded && (
                  <motion.span
                    variants={textVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="block whitespace-nowrap text-left text-sm font-medium text-neutral-700 group-hover:text-neutral-900"
                  >
                    Coach
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>
        </Tooltip>
      </div>

      {/* User Profile */}
      <div className="border-t border-neutral-200 p-3">
        <UserProfile isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
