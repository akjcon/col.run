import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { Timestamp, Unsubscribe } from "firebase/firestore";

// Type-safe Firestore field value sanitizer
export function sanitizeForFirestore<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (data instanceof Date || data instanceof Timestamp) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as T;
  }

  // For objects, create a new sanitized version
  const sanitized: Record<string, unknown> = {};

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  });

  return sanitized as T;
}

// Convert Firestore timestamps to numbers (epoch milliseconds)
export function normalizeTimestamps<T>(data: T): T {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toMillis() as unknown as T;
  }

  if (data instanceof Date) {
    return data.getTime() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => normalizeTimestamps(item)) as unknown as T;
  }

  // For objects, create a normalized version
  const normalized: Record<string, unknown> = {};

  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value instanceof Timestamp) {
      normalized[key] = value.toMillis();
    } else if (value instanceof Date) {
      normalized[key] = value.getTime();
    } else if (value && typeof value === "object") {
      normalized[key] = normalizeTimestamps(value);
    } else {
      normalized[key] = value;
    }
  });

  return normalized as T;
}

// Enhanced error handling
export class FirestoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "FirestoreError";
  }
}

// Base API for all Firestore operations
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    "User",
    "UserProfile",
    "TrainingBackground",
    "TrainingPlan",
    "ChatHistory",
    "WorkoutCompletion",
    "StrengthWorkout",
  ],
  endpoints: () => ({}),
});

// Helper to handle Firestore errors consistently
export function handleFirestoreError(error: unknown, operation: string): never {
  console.error(`Firestore ${operation} error:`, error);

  if (error instanceof Error) {
    throw new FirestoreError(
      `Failed to ${operation}: ${error.message}`,
      "FIRESTORE_OPERATION_FAILED",
      error
    );
  }

  throw new FirestoreError(`Failed to ${operation}`, "UNKNOWN_ERROR", error);
}

// Real-time subscription manager
export const subscriptionManager = new Map<string, Unsubscribe>();

export function manageSubscription(
  key: string,
  unsubscribe: Unsubscribe | null
) {
  const existing = subscriptionManager.get(key);
  if (existing) {
    existing();
  }

  if (unsubscribe) {
    subscriptionManager.set(key, unsubscribe);
  } else {
    subscriptionManager.delete(key);
  }
}

// Type guards
export function isTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

// Batch operation helper - Note: This is a placeholder implementation
// Firestore batch operations need to be handled differently
export async function batchOperation<T>(
  operations: Array<() => Promise<T>>
): Promise<T[]> {
  // For now, just run operations in parallel
  // Real batch operations would need to be implemented per use case
  return Promise.all(operations.map((op) => op()));
}
