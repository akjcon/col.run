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
              "rounded-full bg-brand p-1 transition-[transform,box-shadow] duration-200 ease-out",
              "group-hover:-rotate-2 group-hover:scale-105 group-hover:shadow-md",
              "group-active:rotate-3 group-active:scale-[0.98] group-active:shadow-none"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-white transition-transform duration-200 group-hover:scale-105" />
          </div>
        ) : (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-150",
              isActive
                ? "text-neutral-900"
                : "text-neutral-600 group-hover:text-neutral-900"
            )}
          />
        )}
      </div>

      {/* Text area - only visible when expanded.
          Font weight stays consistent across states (font-medium) so the
          label width doesn't shift when the active route changes. */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={cn(
                "flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150",
                item.variant === "primary"
                  ? "ml-2 text-brand"
                  : isActive
                    ? "text-neutral-900"
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
    "group relative flex h-10 w-full items-center rounded-lg py-2",
    "transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]",
    item.variant === "primary"
      ? cn(isExpanded ? "hover:bg-orange-50" : "hover:bg-transparent")
      : cn(isActive ? "bg-neutral-100" : "hover:bg-neutral-50")
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
