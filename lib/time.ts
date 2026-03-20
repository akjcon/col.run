/**
 * Centralized "now" utilities for the app.
 *
 * All code that needs the current date/time should call getNow() or getNowMs()
 * instead of new Date() / Date.now(). This allows the dev tool panel to apply
 * a day offset for time-travel testing without affecting real timestamps
 * (e.g. Firestore createdAt, Clerk sessions, etc.).
 */

const OFFSET_KEY = "col_time_offset_days";

/** Get the current day offset (in days) from localStorage. */
export function getTimeOffset(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(OFFSET_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}

/** Set the day offset. Pass 0 to reset to real time. */
export function setTimeOffset(days: number): void {
  if (typeof window === "undefined") return;
  if (days === 0) {
    localStorage.removeItem(OFFSET_KEY);
  } else {
    localStorage.setItem(OFFSET_KEY, String(days));
  }
}

/** Returns the current date, offset by the dev tool panel if active. */
export function getNow(): Date {
  const date = new Date();
  const offset = getTimeOffset();
  if (offset !== 0) {
    date.setDate(date.getDate() + offset);
  }
  return date;
}

/** Returns the current epoch ms, offset by the dev tool panel if active. */
export function getNowMs(): number {
  return getNow().getTime();
}
