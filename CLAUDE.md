# CLAUDE.md - AI Assistant Guide for col.run

## Project Overview

**col.run** is a personalized training platform for runners, particularly trail and ultra runners. It generates AI-powered training plans based on "Training for the Uphill Athlete" methodology and provides ongoing coaching support.

## Important Notes

- **No existing users**: This project has no production users yet. Don't worry about backwards compatibility, data migrations, or deprecation paths — just make the change directly.
- **Never commit or push without explicit approval**: Do not run git commit or git push unless the user explicitly asks (e.g. "/cp", "commit this", "push it"). Wait for the green light.
- **LLM debugging mindset**: When an LLM produces bad output, assume WE are doing something wrong — conflicting prompts, misleading context, bad input data — not that the LLM is ignoring or misunderstanding us. Check for contradictions between the prompt, feasibility analysis, and other inputs before blaming the model. The LLM follows what it's given; if the output is bad, the input is bad.

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
│   ├── admin/                    # Admin-only pages (analytics, chat reading)
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin-only endpoints (analytics, chats)
│   │   ├── auth/                 # Firebase token endpoint
│   │   ├── chat/                 # Chat API with LLM
│   │   ├── events/               # Analytics event ingestion
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
│   ├── athlete-snapshot.ts        # Builds denormalized athlete snapshot
│   ├── coach-memory.ts           # Persistent coach notes (CRUD + Firestore)
│   ├── clerk-firebase.ts         # Clerk-Firebase integration
│   ├── firestore.ts              # Direct Firestore operations
│   ├── llm-service.ts            # Anthropic Claude integration + tool defs
│   ├── admin-auth.ts             # Shared admin allowlist + verifyAdmin
│   ├── events.ts                 # Analytics event types + getDeployEnv()
│   ├── events-server.ts          # Admin-SDK helper to write events from server
│   ├── event-tracker.tsx         # Client-side EventTracker provider + hook
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
- `/home`, `/overview`, `/chat`, `/phase`, `/strength`, `/onboarding`, `/settings`, `/admin`

Admin-only routes (`/admin/*`) are gated by `app/admin/layout.tsx` (server component) which calls `verifyAdmin()` and redirects non-admins to `/home`. Admin allowlist is in `lib/admin-auth.ts` (`ADMIN_EMAILS`).

## AI/LLM Integration

### Chat System (`app/api/chat/route.ts` + `lib/llm-service.ts`)

Chat uses Opus with streaming and multi-turn tool use. The system prompt is assembled by `buildChatConfig()`: athlete profile + plan context + coach memory + tool rules + book reference.

**Tool loop architecture** — two categories of tools:
- **Server-side (multi-turn)**: `read_athlete_data`, `update_coach_memory` — executed on the server and results returned to the LLM so it continues generating. Handled in the `while (stop_reason === "tool_use")` loop. Add new server-side tools to the `SERVER_TOOLS` set.
- **Client-side (terminal)**: `propose_plan_changes`, `update_threshold_pace` — sent as NDJSON events to the frontend for user approval. Handled after the loop breaks. Each proposal also fires a server-side analytics event (`plan_change_proposed` / `pace_zone_update_proposed`) via `recordServerEvent` so acceptance rate can be measured.

### Coach Memory (`lib/coach-memory.ts`)

Persistent notes the coach saves about each athlete across conversations. Stored at `users/{userId}/coachMemory/notes` (single doc, array of entries, capped at 30). The LLM decides when to save/update/remove notes via the `update_coach_memory` tool. Notes are injected into the system prompt so the coach "remembers" the athlete.

Pure CRUD logic is in `applyMemoryUpdate()`, separated from Firestore I/O for testability.

### Athlete Snapshot (`lib/athlete-snapshot.ts`)

Single denormalized doc at `users/{userId}/athleteSnapshot/current` — the canonical source of athlete data for all AI features (chat, plan generation, workout analysis). Merges data from:
- `backgrounds` (onboarding self-report)
- `fitness/profile` (Strava current metrics: CTL, weekly mileage, pace)
- `fitness/experience` (Strava lifetime: miles, experience level, ultra/trail)
- `workoutLogs` (recent adherence)

**Merge rule: when sources conflict, objective Strava data overrides self-reported onboarding data.** Resolve at write time — never write duplicate fields that force consumers to pick. Rebuilt on every Strava webhook and manual sync.

### Quick Context (Claude Haiku)

`quickChatResponse()` in `lib/llm-service.ts` — simple Q&A, brief advice. Faster, cheaper, no tool use.

## Admin & Analytics

### Admin Auth (`lib/admin-auth.ts`)

- `ADMIN_EMAILS` is a full-email allowlist (exact match, lowercased). Add new admins here.
- `verifyAdmin()` reads the Clerk session and returns the userId if the user's primary email is in the allowlist, else null. Use it in admin API routes.
- `isAdminClerkUserId(userId)` checks any clerk userId without requiring it to be the current session — used in `/api/events` for impersonation detection.
- `app/admin/layout.tsx` is a server component that runs `verifyAdmin()` and redirects non-admins to `/home`. The middleware also includes `/admin(.*)` so unauthed users hit Clerk first.

### Event Tracking (`lib/events.ts`, `lib/event-tracker.tsx`, `lib/events-server.ts`)

Events live in the top-level `userEvents` Firestore collection. Schema:

```
{ userId, eventType, isImpersonating, metadata?, timestamp, env, realUserId }
```

`EVENT_TYPES` is the canonical list — adding a new type means updating that union, the analytics dashboard's `EVENT_LABELS` map, and (if it should appear in the per-user table) the column rendering.

**Client-side tracking**: `EventTracker` provider wraps the authenticated layout. Components call `useTrackEvent()(type, metadata)`. The tracker buffers events, debounces by 1.5s, ships via `fetch`, and flushes via `sendBeacon` on `pagehide`/unmount. Client never sets `isImpersonating` — server derives it.

**Server-side tracking**: Use `recordServerEvent({ userId, realUserId, eventType, metadata })` from `lib/events-server.ts`. Pass the Clerk session userId (`auth()`) as `realUserId`; the helper sets `isImpersonating` when it differs from `userId`. Used in `app/api/chat/route.ts` to fire `plan_change_proposed` / `pace_zone_update_proposed` from the LLM tool loop.

**Impersonation handling**: Impersonation lives in client-side localStorage via `clerk-firebase.ts`. The `/api/events` endpoint compares the body `userId` to the Clerk session userId — mismatch means impersonation, and only admin sessions are allowed to mismatch. The dashboard filters out events where `isImpersonating: true` OR the user's email is in `ADMIN_EMAILS`.

### Admin Pages

- `/admin/analytics` (`app/admin/analytics/page.tsx`) — DAU/WAU/MAU, daily activity bar chart, event-type breakdown, per-user table. Backed by `/api/admin/analytics` which aggregates server-side over a `?days=N` window (default 30, max 365). Single-field range query on `userEvents.timestamp` — no composite index needed.
- `/admin/chats` (`app/admin/chats/page.tsx`) — list of users with recent chat activity, sorted by most recent message. Click a row to read the full thread. Backed by `/api/admin/chats` (collectionGroup query, bounded scan of 500 most recent messages) and `/api/admin/chats/[userId]` (most recent 500 messages, returned in chronological order).

### Firestore Indexes

The collection-group query on `chatHistory.timestamp` requires a single-field exemption with `COLLECTION_GROUP` query scope. Defined in `firestore.indexes.json` as a `fieldOverrides` entry. Deploy with:

```bash
firebase deploy --only firestore:indexes
```

If you add a new collection-group query, add the matching exemption to `firestore.indexes.json` and deploy — without it, the query fails with `FAILED_PRECONDITION` and a clickable index-creation URL.

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
6. **Don't write duplicate fields from different sources** - Resolve conflicts in the snapshot builder at write time, not in consumers
7. **Separate pure logic from I/O** - Extract testable pure functions (like `applyMemoryUpdate`) so Firestore wrappers are thin and tests don't need mocks

## Debugging User Issues

```bash
# Query any Firestore path (use --json for full content, default truncates to 100 chars)
npx tsx scripts/query-firestore.ts users                                    # list all users
npx tsx scripts/query-firestore.ts users/USER_ID/chatHistory --json         # full chat logs
npx tsx scripts/query-firestore.ts users/USER_ID/athleteSnapshot/current    # snapshot
npx tsx scripts/query-firestore.ts users/USER_ID/coachMemory/notes          # coach memory

# Re-sync Strava data and rebuild snapshot
npx tsx scripts/manual-sync.ts USER_ID
```

## Testing

```bash
npm run test              # Run all tests
npm run test:unit         # Unit tests only
npm run test:evals        # LLM eval tests
npm run test-firebase     # Test Firebase connection
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
