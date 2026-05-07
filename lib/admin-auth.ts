import { auth, clerkClient } from "@clerk/nextjs/server";

// Exact-match allowlist. Prefix matching was a footgun — `jconsenstein.x@evil.com`
// would have passed. Add new admins by their full primary email.
export const ADMIN_EMAILS = ["jconsenstein@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Returns the Clerk userId if the current session belongs to an admin, otherwise null.
export async function verifyAdmin(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return (await isAdminClerkUserId(userId)) ? userId : null;
}

export async function isAdminClerkUserId(userId: string): Promise<boolean> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return isAdminEmail(user.primaryEmailAddress?.emailAddress);
}
