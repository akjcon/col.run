"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "./Tooltip";
import { NavItem, textVariants } from "./constants";

/**
 * Navigation link component for sidebar items
 * @param item - The navigation item configuration
 * @param isExpanded - Whether the sidebar is currently expanded
 * @param beta - Whether the feature is in beta
 * @param onModalClick - Callback for when a modal item is clicked
 */
export function NavLink({
  item,
  isExpanded,
  beta,
  onModalClick,
}: {
  item: NavItem;
  isExpanded: boolean;
  beta?: boolean;
  onModalClick?: () => void;
}) {
  const pathname = usePathname();
  const Icon = item.icon;
  const isActive = pathname === item.href;

  const handleClick = () => {
    if (item.modal && onModalClick) {
      onModalClick();
    }
  };

  const content = (
    <>
      {/* Fixed icon area  */}
      <div className="flex w-10 shrink-0 items-center justify-center">
        {item.variant === "primary" ? (
          <div
            className={cn(
              "rounded-full p-1 transition-all ease-in-out",
              "group-active:bg-orange-600 group-active:!scale-[0.98] group-active:!shadow-none",
              "group-hover:-rotate-2 group-hover:scale-105 group-active:rotate-3",
              "bg-[#E98A15] group-hover:shadow-md"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-white transition group-hover:scale-105" />
          </div>
        ) : (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition",
              isActive
                ? "text-neutral-900"
                : "text-neutral-600 group-hover:!text-neutral-900"
            )}
          />
        )}
      </div>

      {/* Text area - only visible when expanded */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={cn(
                "flex items-center gap-2 whitespace-nowrap text-sm",
                item.variant === "primary"
                  ? "ml-2 font-semibold text-[#E98A15]"
                  : isActive
                    ? "font-medium text-neutral-900"
                    : "text-neutral-700 group-hover:text-neutral-900"
              )}
            >
              <div className="text-sm">{item.label}</div>
              {beta && (
                <div className="rounded-md bg-neutral-100 px-1.5 py-px text-[10px] font-semibold text-neutral-600">
                  Beta
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  const className = cn(
    "group relative flex w-full items-center transition-all ease-out active:scale-[0.985]",
    "h-10 rounded-lg py-2",
    item.variant === "primary"
      ? cn(isExpanded ? "hover:bg-orange-50" : "hover:bg-transparent")
      : cn(isActive && "bg-neutral-100", !isActive && "hover:bg-neutral-50")
  );

  return (
    <Tooltip
      content={isExpanded ? undefined : item.label}
      side="right"
      align="center"
    >
      {item.modal ? (
        <button onClick={handleClick} className={className}>
          {content}
        </button>
      ) : (
        <Link href={item.href!} className={className}>
          {content}
        </Link>
      )}
    </Tooltip>
  );
}
