"use client";

import { useState, useEffect } from "react";
import { navigationItems, sidebarVariants, textVariants } from "./constants";
import { NavLink } from "./NavLink";
import { UserProfile } from "./UserProfile";
import { ToggleButton } from "./ToggleButton";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function SideNav() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load expanded state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("sideNavExpanded");
    if (stored !== null) {
      setIsExpanded(JSON.parse(stored));
    }
    setIsInitialized(true);
  }, []);

  // Save expanded state when it changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("sideNavExpanded", JSON.stringify(isExpanded));
    }
  }, [isExpanded, isInitialized]);

  return (
    <motion.aside
      initial={false}
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={sidebarVariants}
      className="relative flex h-screen flex-col border-r border-neutral-200 bg-white shadow-sm"
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

      {/* User Profile */}
      <div className="mt-auto border-t border-neutral-200 p-3">
        <UserProfile isExpanded={isExpanded} />
      </div>
    </motion.aside>
  );
}
