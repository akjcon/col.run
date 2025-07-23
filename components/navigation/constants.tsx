import {
  Home,
  Target,
  Dumbbell,
  MessageCircle,
  Calendar,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "default";
  modal?: boolean;
  beta?: boolean;
}

export const navigationItems: NavItem[] = [
  {
    href: "/home",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/overview",
    label: "Overview",
    icon: Target,
  },
  {
    href: "/phase",
    label: "Phases",
    icon: Calendar,
  },
  {
    href: "/strength",
    label: "Strength",
    icon: Dumbbell,
  },
  {
    href: "/chat",
    label: "AI Chat",
    icon: MessageCircle,
  },
];

export const sidebarVariants = {
  expanded: {
    width: "14rem",
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
  collapsed: {
    width: "3.5rem",
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

export const textVariants = {
  hidden: {
    opacity: 0,
    x: -10,
    transition: {
      duration: 0.1,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};
