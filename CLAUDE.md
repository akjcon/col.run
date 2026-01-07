# CLAUDE.md - AI Assistant Guide for col.run

## Project Overview

**col.run** is a personalized training platform for runners, particularly trail and ultra runners. It generates AI-powered training plans based on "Training for the Uphill Athlete" methodology and provides ongoing coaching support.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode)
- **Authentication**: Clerk
- **Database**: Firebase Firestore
- **State Management**: Redux Toolkit with RTK Query
- **Styling**: Tailwind CSS 3.4 with custom design system
- **AI**: Anthropic Claude API (Sonnet for full context, Haiku for quick responses)
- **UI Components**: Radix UI primitives, Framer Motion, Lucide icons

## Directory Structure

```
col.run/
├── app/                          # Next.js App Router pages
│   ├── (authenticated)/          # Route group for auth-required pages
│   │   ├── chat/                 # AI coaching chat
│   │   ├── home/                 # Main dashboard
│   │   ├── onboarding/           # User onboarding flow
│   │   ├── overview/             # Training overview
│   │   ├── phase/                # Current training phase
│   │   ├── strength/             # Strength workouts
│   │   └── layout.tsx            # Authenticated layout with nav
│   ├── api/                      # API routes
│   │   ├── auth/                 # Firebase token endpoint
│   │   ├── chat/                 # Chat API with LLM
│   │   └── generate-plan/        # Training plan generation
│   ├── sign-in/                  # Clerk sign-in page
│   ├── sign-up/                  # Clerk sign-up page
│   ├── page.tsx                  # Public landing page
│   └── layout.tsx                # Root layout with providers
├── components/                   # React components
│   ├── navigation/               # Nav components (SideNav, MobileNav)
│   └── ui/                       # Reusable UI components (shadcn-style)
├── lib/                          # Core application logic
│   ├── store/                    # Redux store
│   │   ├── api/                  # RTK Query API slices
│   │   │   ├── baseApi.ts        # Base API config and utilities
│   │   │   ├── userApi.ts        # User operations
│   │   │   ├── trainingApi.ts    # Training plan operations
│   │   │   ├── chatApi.ts        # Chat operations
│   │   │   └── workoutApi.ts     # Workout tracking
│   │   ├── hooks.ts              # Custom Redux hooks
│   │   └── index.ts              # Store configuration
│   ├── clerk-firebase.ts         # Clerk-Firebase integration
│   ├── firestore.ts              # Direct Firestore operations
│   ├── llm-service.ts            # Anthropic Claude integration
│   ├── types.ts                  # TypeScript type definitions
│   ├── user-context-rtk.tsx      # User context with RTK
│   └── optimized_book.md         # Training methodology reference
├── scripts/                      # Utility scripts (tsx)
├── docs/                         # Internal documentation
│   ├── DATA_FLOW_ARCHITECTURE.md # RTK Query patterns
│   └── LOADING_SYSTEM.md         # Loading states guide
└── .cursor/rules/                # AI coding rules
```

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npm run start        # Start production server

# Utility scripts (run with tsx)
npm run migrate-user      # Migrate user data
npm run test-firebase     # Test Firebase connection
npm run extend-plan       # Extend training plan
npm run analyze-plan      # Analyze training plan
npm run backup-plan       # Backup training plan
npm run list-plans        # List all plans
```

## Architecture Principles

### Data Flow with RTK Query

**Always use RTK Query hooks for Firestore operations** - never call Firestore directly from components.

```typescript
// Correct approach
const { data, isLoading, error } = useGetUserDataQuery(userId);
const [updateProfile] = useUpdateUserProfileMutation();

// Incorrect - don't do this in components
import { updateUserProfile } from "@/lib/firestore";
```

Key utilities in `lib/store/api/baseApi.ts`:
- `sanitizeForFirestore<T>()` - Remove undefined values before writes
- `normalizeTimestamps<T>()` - Convert Firestore Timestamps to epoch ms
- `handleFirestoreError()` - Standardized error handling

### Cache Tags

RTK Query uses these tags for cache invalidation:
- `User` - User-level data
- `UserProfile` - Profile updates
- `TrainingBackground` - Training history
- `TrainingPlan` - Active plan changes
- `ChatHistory` - Chat messages
- `WorkoutCompletion` - Workout tracking
- `StrengthWorkout` - Strength workouts

### Loading States

Use the standardized loading system:

```typescript
import { LoadingSpinner } from "@/components/ui/loading-spinner";

// Full page loading
<LoadingSpinner />

// Inline loading
<LoadingSpinner variant="inline" size="sm" />

// Button loading
<LoadingSpinner variant="button" size="sm" />
```

Skeleton loaders available in `components/ui/skeleton-loaders.tsx`.

## Type Definitions

Core types in `lib/types.ts`:

- `UserProfile` - User account info
- `TrainingBackground` - User's running history and goals
- `TrainingPlan` - Complete training plan with weeks/workouts
- `TrainingZone` - Heart rate zones
- `WeekPlan` / `Workout` - Weekly and daily workout structure
- `WorkoutCompletion` - Workout tracking data
- `ChatMessage` - Chat history

**Important**: All timestamps use epoch milliseconds (numbers), not Date objects, for Redux serialization.

## Brand Color Guidelines

Use the defined color palette (see `.cursor/rules/color-rules.mdc`):

### Primary Colors
- Pure White: `#FFFFFF` - Main backgrounds
- Pure Black: `#000000` / `bg-neutral-900` - Primary buttons, Zone 5
- Accent Orange: `#E98A15` - Call-to-action, highlights

### Grayscale (Neutral)
- `neutral-50` to `neutral-900` for backgrounds, text hierarchy, borders

### Workout Zones
- Zone 1/Recovery: `neutral-400`
- Zone 2: `neutral-500`
- Zone 3: `neutral-600`
- Zone 4: `neutral-700`
- Zone 5: `neutral-900`

## Authentication Flow

1. Clerk handles user authentication
2. `middleware.ts` protects routes under `/(authenticated)/`
3. `useClerkFirebase()` hook provides Firebase-ready userId
4. `UserProvider` wraps app with Redux store and user context

Protected routes:
- `/home`, `/overview`, `/chat`, `/phase`, `/strength`, `/onboarding`

## AI/LLM Integration

Two-tier LLM system in `lib/llm-service.ts`:

1. **Full Context** (Claude Sonnet) - Training plan generation, detailed coaching
   - Includes book content for methodology reference
   - Higher token limits, lower temperature

2. **Quick Context** (Claude Haiku) - Simple Q&A, brief advice
   - Faster, cheaper
   - Basic personalization

`shouldUseFullContext()` determines which model based on keywords like "training plan", "periodization", "heart rate zones", etc.

## Key Patterns

### Component Loading Pattern

```typescript
const { data, isLoading, error } = useQuery();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorDisplay error={error} />;
if (!data) return <EmptyState />;

return <Content data={data} />;
```

### Mutation Pattern

```typescript
const [mutate, { isLoading }] = useSomeMutation();

const handleSubmit = async () => {
  try {
    await mutate({ userId, data }).unwrap();
  } catch (error) {
    // Handle error
  }
};
```

### Conditional Query Pattern

```typescript
const { data } = useGetUserDataQuery(userId, {
  skip: !userId || !isFirebaseReady,
});
```

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_FIREBASE_*` (config values)
- `FIREBASE_ADMIN_*` (service account for server)
- `ANTHROPIC_API_KEY`

## Common Pitfalls

1. **Don't use `useState` for loading** - Use RTK Query's built-in `isLoading`
2. **Don't store Dates in Redux** - Use epoch milliseconds
3. **Don't call Firestore directly** - Use RTK Query mutations
4. **Don't skip `sanitizeForFirestore`** - Prevents undefined value errors
5. **Don't create new files unnecessarily** - Edit existing files when possible

## Testing Firebase Connection

```bash
npm run test-firebase
```

## File Naming Conventions

- Components: PascalCase (`WorkoutCard.tsx`)
- Utilities: kebab-case (`workout-utils.ts`)
- API routes: `route.ts` in appropriate directory
- Pages: `page.tsx` in route directory

## Import Aliases

Use `@/*` for absolute imports from project root:

```typescript
import { useUser } from "@/lib/user-context-rtk";
import { Button } from "@/components/ui/button";
```
