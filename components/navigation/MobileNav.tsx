"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home,
  BarChart3,
  CalendarDays,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/lib/chat-context";
import type { LucideIcon } from "lucide-react";

const SLOTS = 5;

const routeItems = [
  { icon: Home, label: "Home", href: "/home", slot: 0 },
  { icon: BarChart3, label: "Overview", href: "/overview", slot: 1 },
  { icon: CalendarDays, label: "Calendar", href: "/calendar", slot: 3 },
  { icon: User, label: "Profile", href: "/settings", slot: 4 },
];

export function MobileNav() {
  const pathname = usePathname();
  const { toggleChat, isOpen: isChatOpen } = useChatContext();
  const prefersReducedMotion = useReducedMotion();

  const activeRoute = routeItems.find((r) => pathname.startsWith(r.href));
  const thumbSlot = isChatOpen ? -1 : (activeRoute?.slot ?? -1);

  const springTransition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.4, bounce: 0 };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      aria-label="Main"
    >
      <div className="relative flex w-full max-w-md items-center rounded-full bg-white/80 p-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
        {/* Thumb track */}
        <div className="pointer-events-none absolute inset-1.5">
          <motion.div
            className="relative h-full rounded-full bg-neutral-900/[0.08] overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:border before:border-black/15 before:[mask-image:linear-gradient(to_bottom,black_50%,rgba(0,0,0,0.3))] after:pointer-events-none after:absolute after:inset-[1px] after:rounded-full after:border after:border-white/70 after:[mask-image:linear-gradient(to_bottom,black_20%,transparent)]"
            style={{ width: `${100 / SLOTS}%` }}
            animate={{
              x: `${(thumbSlot >= 0 ? thumbSlot : activeRoute?.slot ?? 0) * 100}%`,
              opacity: thumbSlot >= 0 ? 1 : 0,
            }}
            transition={springTransition}
          />
        </div>

        <NavTab href="/home" icon={Home} label="Home" active={thumbSlot === 0} />
        <NavTab href="/overview" icon={BarChart3} label="Overview" active={thumbSlot === 1} />

        {/* Coach — center accent */}
        <div className="relative z-10 flex flex-1 items-center justify-center">
          <motion.button
            onClick={toggleChat}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full touch-manipulation",
              "transition-[background-color,box-shadow] duration-200 ease-out",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
              isChatOpen
                ? "bg-[#E98A15] shadow-[0_2px_8px_rgba(233,138,21,0.25)]"
                : "bg-[#E98A15]/10"
            )}
            aria-label={isChatOpen ? "Close coach chat" : "Open coach chat"}
          >
            <MessageCircle
              className={cn(
                "h-[18px] w-[18px] transition-colors duration-200 ease-out",
                isChatOpen ? "text-white" : "text-[#E98A15]"
              )}
            />
          </motion.button>
        </div>

        <NavTab href="/calendar" icon={CalendarDays} label="Calendar" active={thumbSlot === 3} />
        <NavTab href="/settings" icon={User} label="Profile" active={thumbSlot === 4} />
      </div>
    </nav>
  );
}

function NavTab({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative z-10 flex flex-1 flex-col items-center gap-0.5 rounded-full py-2.5 touch-manipulation",
        "text-[10px] font-medium transition-[color,transform] duration-150 ease-out",
        "active:scale-[0.96]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-900",
        active ? "text-neutral-900" : "text-neutral-400"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
