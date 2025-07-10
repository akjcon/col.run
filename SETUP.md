# Setup Instructions

## 1. Install Dependencies ✅

Dependencies are already installed: `@clerk/nextjs`

## 2. Create Clerk Account & Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a free account if you don't have one
3. Create a new application
4. Choose "Next.js" as your framework

## 3. Configure Environment Variables

Create a `.env.local` file in the project root with the following variables:

```bash
# Get these from your Clerk Dashboard
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# These are already configured correctly
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/overview
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## 4. Get Your Clerk Keys

1. In your Clerk Dashboard, go to "API Keys"
2. Copy the "Publishable Key" → paste as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
3. Copy the "Secret Key" → paste as `CLERK_SECRET_KEY`

## 5. What's Already Configured ✅

### Authentication Flow

- ✅ Clerk middleware for route protection
- ✅ Sign-in page at `/sign-in`
- ✅ Sign-up page at `/sign-up`
- ✅ Onboarding page at `/onboarding`
- ✅ Protected routes (all pages except auth pages)

### Navigation

- ✅ Shows sign-in button when not authenticated
- ✅ Shows user info and sign-out when authenticated
- ✅ Navigation links only visible when signed in

### User Flow

1. **Unauthenticated**: Land on marketing page → Sign up/in
2. **New user**: Sign up → Onboarding form → Home dashboard
3. **Returning user**: Sign in → Home dashboard (progress overview)

### Pages Status

- ✅ **Home (`/`)**: Marketing landing page, redirects authenticated users to `/home`
- ✅ **Dashboard (`/home`)**: User dashboard with progress overview and quick actions
- ✅ **Sign-in (`/sign-in`)**: Clerk authentication
- ✅ **Sign-up (`/sign-up`)**: Clerk authentication
- ✅ **Onboarding (`/onboarding`)**: Training background form
- ✅ **Overview (`/overview`)**: Dynamic user training plan
- ✅ **Chat (`/chat`)**: Dynamic user context
- ✅ **Phases (`/phase/base`)**: Dynamic user workouts
- ✅ **Strength (`/strength`)**: Strength training guide

## 6. Testing the Setup

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should see the marketing landing page
4. Click "Get Started" → should open Clerk sign-up
5. Sign up with a test account
6. Should redirect to onboarding page
7. Fill out the form → should go to overview page

## 7. Next Steps for Multi-User Platform

Once authentication is working:

1. **Add Firebase** for user data storage
2. **Connect onboarding** to save user data
3. **Add AI plan generation** using Claude API
4. **Update UserContext** to load from database
5. **Add user dashboard** with progress tracking

## Troubleshooting

### "authMiddleware is not a function" & "auth().protect is not a function" ✅ FIXED

- **Issue**: Clerk deprecated `authMiddleware` and changed the protection API in v5
- **Solution**: ✅ Updated middleware to use `clerkMiddleware` with `await auth.protect()`
- **Final Working Code** (based on official Clerk v5 docs):
  ```typescript
  export default clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
  });
  ```
- **Key Changes**: Made function `async` and use `await auth.protect()` instead of manual checks

### "Clerk publishable key not found"

- Make sure `.env.local` exists in project root
- Verify the key starts with `pk_test_`
- Restart the dev server after adding environment variables

### Sign-in/Sign-up not working

- Check the Clerk Dashboard for any domain restrictions
- Make sure localhost:3000 is allowed in development settings

### Pages showing "Loading..."

- Check browser network tab for any failed API calls
- Verify Clerk keys are correct and active

### "useUser() from the server" ✅ FIXED

- **Issue**: Trying to use client-side hooks like `useUser()` in server components
- **Solution**: ✅ Added `"use client";` directive to components using client hooks
- **Fixed Files**: `/app/overview/page.tsx` and `/app/phase/base/page.tsx`
- **Rule**: Any component using hooks must have `"use client";` at the top

### Runtime errors after Clerk updates

- Clerk periodically updates their API
- The middleware has been updated to use `clerkMiddleware` instead of deprecated `authMiddleware`
- All components use the latest Clerk hooks and patterns
