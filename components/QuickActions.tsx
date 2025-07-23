import Link from "next/link";
import {
  Target,
  TrendingUp,
  Dumbbell,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Drawer } from "vaul";

interface QuickActionsProps {
  currentPhase?: {
    phase: string;
    weeks: string;
  };
}

export function QuickActions({ currentPhase }: QuickActionsProps) {
  const quickActions = [
    {
      title: "Training Overview",
      description: "Complete plan",
      icon: Target,
      href: "/overview",
    },
    {
      title: "Current Phase",
      description: `${currentPhase?.phase || "Base Phase"}`,
      icon: TrendingUp,
      href: "/phase",
    },
    {
      title: "Strength Training",
      description: "Exercises & progression",
      icon: Dumbbell,
      href: "/strength",
    },
  ];

  return (
    <div className="mx-4 grid grid-cols-2 gap-4">
      {quickActions.slice(0, 2).map((action, index) => (
        <Link key={index} href={action.href}>
          <div className="group rounded-2xl min-h-[162px] md:min-h-0 border border-neutral-200 bg-white p-6 transition-colors hover:bg-neutral-50">
            <div className="mb-3 flex items-center gap-4">
              <action.icon className="h-6 w-6 text-neutral-600" />
              <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
            </div>
            <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
              {action.title}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
      {quickActions.slice(2, 3).map((action, index) => (
        <Link key={index + 2} href={action.href}>
          <div className="group rounded-2xl border border-neutral-200 bg-white p-6 transition-colors hover:bg-neutral-50">
            <div className="mb-3 flex items-center gap-4">
              <action.icon className="h-6 w-6 text-neutral-600" />
              <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
            </div>
            <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
              {action.title}
            </h3>
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
              {action.description}
            </p>
          </div>
        </Link>
      ))}

      {/* Coach Quick Action - Now with Chat */}
      <Drawer.Trigger asChild>
        <button className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left transition-colors hover:bg-neutral-50">
          <div className="mb-3 flex items-center gap-4">
            <MessageCircle className="h-6 w-6 text-neutral-600" />
            <ArrowRight className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-neutral-600" />
          </div>
          <h3 className="mb-1 text-sm font-semibold tracking-tight text-neutral-900">
            Ask Your Coach
          </h3>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-600">
            Personalized advice
          </p>
        </button>
      </Drawer.Trigger>
    </div>
  );
}
