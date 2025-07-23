import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from ".";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// Custom hook to combine multiple loading states
export function useCombinedLoading(...loadingStates: boolean[]): boolean {
  return loadingStates.some((state) => state);
}

// Hook to check if any queries are loading
export function useIsAnyQueryLoading(queryNames: string[]): boolean {
  return useAppSelector((state) => {
    const api = state.api;
    return queryNames.some((queryName) => {
      const query = api.queries[queryName];
      return query?.status === "pending";
    });
  });
}

// Hook to get loading state with error handling
export function useLoadingState<T>(
  isLoading: boolean,
  error: unknown,
  data: T | null | undefined
): {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  isEmpty: boolean;
} {
  return {
    isLoading,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    isEmpty: !isLoading && !error && !data,
  };
}
