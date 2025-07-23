import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "fullPage" | "inline" | "button";
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  variant = "fullPage",
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const spinner = (
    <Loader2
      className={cn(
        "animate-spin text-neutral-600",
        sizeClasses[size],
        className
      )}
    />
  );

  if (variant === "button") {
    return spinner;
  }

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        {spinner}
      </div>
    );
  }

  // Full page variant
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">{spinner}</div>
    </div>
  );
}

// Skeleton loader component
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-neutral-100", className)} />
  );
}

// Loading wrapper component
interface LoadingWrapperProps {
  isLoading: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LoadingWrapper({
  isLoading,
  children,
  fallback,
}: LoadingWrapperProps) {
  if (isLoading) {
    return <>{fallback || <LoadingSpinner variant="inline" />}</>;
  }
  return <>{children}</>;
}
