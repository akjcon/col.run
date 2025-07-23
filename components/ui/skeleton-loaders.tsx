import { Skeleton } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Workout Card Skeleton
export function WorkoutCardSkeleton() {
  return (
    <div className="mx-4 rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// Phase Card Skeleton
export function PhaseCardSkeleton() {
  return (
    <Card className="h-full transition-all duration-200">
      <CardHeader>
        <Skeleton className="h-8 w-8 rounded mb-2" />
        <Skeleton className="h-6 w-32 mb-1" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center gap-2 mt-4">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

// Chat Message Skeleton
export function ChatMessageSkeleton() {
  return (
    <div className="flex justify-start p-4">
      <div className="flex max-w-[80%] gap-3">
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

// Training Week Skeleton
export function TrainingWeekSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// Progress Overview Skeleton
export function ProgressOverviewSkeleton() {
  return (
    <div className="mx-4 space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-2 w-full rounded-full mb-2" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
