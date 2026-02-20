"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Settings } from "lucide-react";
import { textVariants } from "./constants";
import { SettingsPopover } from "./SettingsPopover";

/**
 * User profile component for the sidebar
 * @param isExpanded - Whether the sidebar is currently expanded
 */
export function UserProfile({ isExpanded }: { isExpanded: boolean }) {
  const { user } = useUser();

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg py-2 transition-all",
        isExpanded ? "px-2" : "justify-center"
      )}
    >
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "h-8 w-8",
          },
        }}
      />

      <AnimatePresence>
        {isExpanded && user && (
          <motion.div
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="min-w-0 flex-1"
          >
            <p className="text-sm font-medium text-neutral-900 truncate">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-neutral-500 truncate">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <SettingsPopover side="top" align="end">
              <button className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600">
                <Settings className="h-4 w-4" />
              </button>
            </SettingsPopover>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
