# Loading System Documentation

## Overview

This document describes the standardized loading system used throughout the col.run application. The system provides consistent loading states, spinners, and skeleton loaders across all components.

## Core Components

### 1. LoadingSpinner

The primary loading component with multiple variants:

```tsx
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Full page loading
<LoadingSpinner />

// Inline loading
<LoadingSpinner variant="inline" size="sm" />

// Button loading
<LoadingSpinner variant="button" size="sm" />
```

**Props:**

- `variant`: "fullPage" | "inline" | "button" (default: "fullPage")
- `size`: "sm" | "md" | "lg" | "xl" (default: "md")
- `className`: Additional CSS classes

### 2. Skeleton Loader

For partial content loading:

```tsx
import { Skeleton } from "@/components/ui/loading-spinner";

<Skeleton className="h-4 w-32" />;
```

### 3. Pre-built Skeleton Components

```tsx
import {
  WorkoutCardSkeleton,
  PhaseCardSkeleton,
  ChatMessageSkeleton,
  TrainingWeekSkeleton,
  ProgressOverviewSkeleton,
} from "@/components/ui/skeleton-loaders";
```

## Redux RTK Query Integration

### Using Query Loading States

```tsx
const { data, isLoading, error } = useGetUserDataQuery(userId);

if (isLoading) {
  return <LoadingSpinner />;
}
```

### Using Mutation Loading States

```tsx
const [sendMessage, { isLoading }] = useSendChatMessageMutation();

// In your component
<Button disabled={isLoading}>
  {isLoading ? <LoadingSpinner variant="button" size="sm" /> : "Send"}
</Button>;
```

## Utility Hooks

### 1. useCombinedLoading

Combine multiple loading states:

```tsx
import { useCombinedLoading } from "@/lib/store/hooks";

const isAnyLoading = useCombinedLoading(
  isLoadingUser,
  isLoadingPlan,
  isLoadingWorkouts
);
```

### 2. useLoadingState

Get comprehensive loading state info:

```tsx
import { useLoadingState } from "@/lib/store/hooks";

const state = useLoadingState(isLoading, error, data);
// Returns: { isLoading, isError, isSuccess, isEmpty }
```

### 3. useAsyncOperation

For non-RTK Query async operations:

```tsx
import { useAsyncOperation } from "@/lib/loading-utils";

const { execute, isLoading, error } = useAsyncOperation(async (data) => {
  const response = await fetch("/api/endpoint", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
});
```

## Layout Structure

The app uses a route group structure for authenticated pages:

```
app/
├── page.tsx                    # Public landing page (no navigation)
├── (authenticated)/           # Route group for authenticated pages
│   ├── layout.tsx            # Layout with side navigation
│   ├── home/page.tsx
│   ├── chat/page.tsx
│   ├── overview/page.tsx
│   ├── phase/page.tsx
│   └── onboarding/page.tsx
```

The authenticated layout automatically:

- Shows a loading spinner while checking authentication
- Redirects to landing page if not authenticated
- Includes the side navigation for all authenticated pages

## Best Practices

### 1. Always Use RTK Query Loading States

❌ **Don't:**

```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await someAsyncOperation();
  } finally {
    setIsLoading(false);
  }
};
```

✅ **Do:**

```tsx
const [mutate, { isLoading }] = useSomeMutation();

const handleSubmit = async () => {
  await mutate(data).unwrap();
};
```

### 2. Use Appropriate Loading Variants

- **Full Page**: Initial page loads, authentication checks
- **Inline**: Partial updates, form submissions
- **Button**: Action buttons during operations
- **Skeleton**: Content that loads progressively

### 3. Keep Loading States Simple

The loading spinners are designed to be simple and consistent without text. This provides a cleaner, more unified experience across the app.

### 4. Handle Error States

```tsx
const { data, isLoading, error } = useQuery();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return <EmptyState />;

return <Content data={data} />;
```

### 5. Use Skeleton Loaders for Better UX

```tsx
// Instead of spinner for list items
if (isLoading) {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <WorkoutCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

## Migration Guide

To update existing components:

1. Replace local loading states with RTK Query states
2. Replace custom spinners with `LoadingSpinner`
3. Add skeleton loaders for better perceived performance
4. Remove any loading messages - keep spinners simple
5. Remove redundant loading state management

Example migration:

```tsx
// Before
const [loading, setLoading] = useState(false);
if (loading) return <div>Loading...</div>;

// After
const { isLoading } = useQuery();
if (isLoading) return <LoadingSpinner />;
```
