"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { textVariants } from "./constants";

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
    </div>
  );
}
