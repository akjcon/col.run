import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/home(.*)",
  "/overview(.*)",
  "/chat(.*)",
  "/phase(.*)",
  "/strength(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next|api/v2/strava/webhook).*)",
    "/",
    "/(api(?!/v2/strava/webhook)|trpc)(.*)",
  ],
};
