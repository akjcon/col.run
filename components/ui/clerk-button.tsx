import React from "react";
import {
  cva,
  type VariantProps,
} from "class-variance-authority";
import { cn } from "@/lib/utils";

const clerkButtonVariants = cva(
  // Base styles - the core 3D effect
  [
    "group relative isolate inline-flex items-center justify-center overflow-hidden",
    "ease-[cubic-bezier(0.4,0.36,0,1)] text-left font-medium transition duration-300",
    "rounded-md",
    // The magic shadow - inset highlight + drop shadow
    "shadow-[0_1px_theme(colors.white/0.07)_inset,0_1px_3px_theme(colors.gray.900/0.2)]",
    // Before pseudo-element - main gradient overlay
    "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md",
    "before:bg-gradient-to-b before:from-white/20 before:opacity-50",
    "before:ease-[cubic-bezier(0.4,0.36,0,1)] before:transition-opacity before:duration-300",
    "hover:before:opacity-100",
    // After pseudo-element - subtle middle gradient
    "after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-md",
    "after:bg-gradient-to-b after:from-white/10 after:from-[46%] after:to-[54%]",
    "after:mix-blend-overlay",
    // Base sizing
    "h-[1.875rem] px-3 text-sm ring-1",
  ],
  {
    variants: {
      variant: {
        purple: "bg-purple-500 text-white ring-purple-500",
        blue: "bg-blue-500 text-white ring-blue-500",
        green: "bg-green-500 text-white ring-green-500",
        red: "bg-red-500 text-white ring-red-500",
        gray: "bg-gray-500 text-white ring-gray-500",
      },
      size: {
        sm: "h-[1.5rem] px-2 text-xs",
        md: "h-[1.875rem] px-3 text-sm",
        lg: "h-[2.25rem] px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "purple",
      size: "md",
    },
  }
);

interface ClerkButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof clerkButtonVariants> {
  asChild?: boolean;
}

const ClerkButton = React.forwardRef<
  HTMLButtonElement,
  ClerkButtonProps
>(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(
        clerkButtonVariants({ variant, size, className })
      )}
      ref={ref}
      {...props}
    />
  );
});

ClerkButton.displayName = "ClerkButton";

export { ClerkButton, clerkButtonVariants };

// Usage example:
export function ClerkButtonDemo() {
  return (
    <div className="space-y-4 bg-gray-100 p-8">
      <h2 className="text-xl font-bold">
        Clerk-Style 3D Buttons
      </h2>

      <div className="flex items-center gap-4">
        <ClerkButton variant="purple">Sign Up</ClerkButton>
        <ClerkButton variant="blue">Sign In</ClerkButton>
        <ClerkButton variant="green">Continue</ClerkButton>
        <ClerkButton variant="red">Delete</ClerkButton>
        <ClerkButton variant="gray">Cancel</ClerkButton>
      </div>

      <div className="flex items-center gap-4">
        <ClerkButton variant="purple" size="sm">
          Small
        </ClerkButton>
        <ClerkButton variant="purple" size="md">
          Medium
        </ClerkButton>
        <ClerkButton variant="purple" size="lg">
          Large
        </ClerkButton>
      </div>
    </div>
  );
}
