"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import type { ClientEvent, EventType } from "@/lib/events";

// Batch rapid events together so a burst of page navigations becomes one POST.
const FLUSH_DEBOUNCE_MS = 1500;

type TrackEventFn = (
  type: EventType,
  metadata?: Record<string, unknown>
) => void;

const EventTrackerContext = createContext<TrackEventFn>(() => {});

export function useTrackEvent(): TrackEventFn {
  return useContext(EventTrackerContext);
}

async function postEvents(events: ClientEvent[]): Promise<void> {
  if (events.length === 0) return;
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch {
    // Analytics is best-effort — never break the app on a failed write.
  }
}

function flushViaBeacon(events: ClientEvent[]): void {
  if (events.length === 0) return;
  // sendBeacon is the only reliable way to ship a payload during pagehide;
  // browsers cancel in-flight fetches but allow beacons to complete.
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify({ events })], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/events", blob);
  }
}

export function EventTracker({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const queueRef = useRef<ClientEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const flush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const batch = queueRef.current;
    if (batch.length === 0) return;
    queueRef.current = [];
    void postEvents(batch);
  }, []);

  const trackEvent = useCallback<TrackEventFn>(
    (type, metadata) => {
      const uid = userIdRef.current;
      if (!uid) return;
      queueRef.current.push({
        userId: uid,
        eventType: type,
        metadata,
      });
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushTimerRef.current = setTimeout(flush, FLUSH_DEBOUNCE_MS);
    },
    [flush]
  );

  // Page-view tracking. Dedupe on (pathname, userId) so an auth refresh that
  // re-resolves the same userId on the same path doesn't emit a phantom view.
  const pathname = usePathname();
  const lastPageViewRef = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname || !userId) return;
    const key = `${userId}|${pathname}`;
    if (lastPageViewRef.current === key) return;
    lastPageViewRef.current = key;
    trackEvent("page_view", { path: pathname });
  }, [pathname, userId, trackEvent]);

  // Flush on tab close via sendBeacon, and on unmount via keepalive fetch.
  useEffect(() => {
    const onPageHide = () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const batch = queueRef.current;
      queueRef.current = [];
      flushViaBeacon(batch);
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // Drain on unmount (e.g. signing out) so we don't drop the last batch.
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      const batch = queueRef.current;
      if (batch.length > 0) {
        queueRef.current = [];
        void postEvents(batch);
      }
    };
  }, []);

  return (
    <EventTrackerContext.Provider value={trackEvent}>
      {children}
    </EventTrackerContext.Provider>
  );
}
