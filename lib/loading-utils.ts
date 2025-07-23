import { useState, useCallback } from "react";

// Hook for managing async operations with loading states
export function useAsyncOperation<T extends unknown[], R>(
  operation: (...args: T) => Promise<R>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: T) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation(...args);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [operation]
  );

  return {
    execute,
    isLoading,
    error,
    reset: () => setError(null),
  };
}

// Hook for managing form submission with RTK Query mutation
export function useMutationForm<TArgs, TResult>(
  mutation: () => [
    (args: TArgs) => { unwrap: () => Promise<TResult> },
    { isLoading: boolean; error: unknown },
  ]
) {
  const [mutate, { isLoading, error }] = mutation();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (args: TArgs) => {
      setFormError(null);
      try {
        const result = await mutate(args).unwrap();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "data" in err
              ? (err as { data: { message: string } }).data?.message ||
                "An error occurred"
              : "An error occurred";
        setFormError(errorMessage);
        throw err;
      }
    },
    [mutate]
  );

  return {
    handleSubmit,
    isLoading,
    error: formError || error,
    clearError: () => setFormError(null),
  };
}

// Loading state messages for different operations
export const LOADING_MESSAGES = {
  fetchingData: "Loading your data...",
  savingWorkout: "Saving workout completion...",
  generatingPlan: "Generating your personalized training plan...",
  updatingProfile: "Updating your profile...",
  sendingMessage: "Sending message...",
  loadingWorkouts: "Loading workouts...",
  loadingPlan: "Loading your training plan...",
  redirecting: "Redirecting...",
  authenticating: "Authenticating...",
  initializing: "Initializing...",
} as const;

// Helper to get appropriate loading message
export function getLoadingMessage(
  operation: keyof typeof LOADING_MESSAGES,
  fallback = "Loading..."
): string {
  return LOADING_MESSAGES[operation] || fallback;
}
