export const EVENT_TYPES = [
  "page_view",
  "chat_message_sent",
  "workout_completed",
  "plan_generated",
  "plan_change_proposed",
  "plan_change_accepted",
  "plan_change_declined",
  "pace_zone_update_proposed",
  "pace_zone_update_accepted",
  "pace_zone_update_declined",
  "chat_error",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export type Env = "production" | "preview" | "development" | "unknown";

// Vercel sets NEXT_PUBLIC_VERCEL_ENV; local `next dev` falls through to "development".
export function getDeployEnv(): Env {
  const v = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (v === "production" || v === "preview" || v === "development") return v;
  return process.env.NODE_ENV === "development" ? "development" : "unknown";
}

// Wire format: what the client POSTs to /api/events. The userId is the
// *effective* (possibly impersonated) user being viewed. The server derives
// `isImpersonating` from session vs userId — clients don't get to set it.
export interface ClientEvent {
  userId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
}
