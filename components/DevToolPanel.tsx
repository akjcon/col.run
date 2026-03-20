"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser as useClerkUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getNow, getTimeOffset, setTimeOffset } from "@/lib/time";
import { useDispatch } from "react-redux";
import { baseApi } from "@/lib/store/api/baseApi";
import { useUser } from "@/lib/user-context-rtk";

type Corner = "tl" | "tr" | "bl" | "br";

const CORNER_KEY = "col_devpanel_corner";
const MINIMIZED_KEY = "col_devpanel_minimized";

const CORNER_STYLES: Record<Corner, { top?: number; bottom?: number; left?: number; right?: number }> = {
  tl: { top: 16, left: 16 },
  tr: { top: 16, right: 16 },
  bl: { bottom: 16, left: 16 },
  br: { bottom: 16, right: 16 },
};

function getStoredCorner(): Corner {
  if (typeof window === "undefined") return "br";
  return (localStorage.getItem(CORNER_KEY) as Corner) || "br";
}

function getStoredMinimized(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MINIMIZED_KEY) !== "false";
}

function nearestCorner(x: number, y: number): Corner {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  if (x < cx && y < cy) return "tl";
  if (x >= cx && y < cy) return "tr";
  if (x < cx && y >= cy) return "bl";
  return "br";
}

function DevToolPanelInner() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { userData } = useUser();

  const [corner, setCorner] = useState<Corner>(getStoredCorner);
  const [minimized, setMinimized] = useState(getStoredMinimized);
  const [offset, setOffset] = useState(getTimeOffset);
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const isImpersonating = !!userData?.activePlan?.previousPlanId;

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; elX: number; elY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);

  // Persist corner & minimized
  useEffect(() => {
    localStorage.setItem(CORNER_KEY, corner);
  }, [corner]);
  useEffect(() => {
    localStorage.setItem(MINIMIZED_KEY, String(minimized));
  }, [minimized]);

  // Drag handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, elX: rect.left, elY: rect.top };
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDragRef.current = true;
    }
    setDragPos({
      x: dragStartRef.current.elX + dx,
      y: dragStartRef.current.elY + dy,
    });
  }, [dragging]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    if (dragPos) {
      const rect = panelRef.current?.getBoundingClientRect();
      const cx = (rect?.left ?? dragPos.x) + (rect?.width ?? 0) / 2;
      const cy = (rect?.top ?? dragPos.y) + (rect?.height ?? 0) / 2;
      setCorner(nearestCorner(cx, cy));
    }
    setDragPos(null);
    dragStartRef.current = null;

    // If it wasn't a drag, treat as click to toggle
    if (!didDragRef.current && minimized) {
      setMinimized(false);
    }
  }, [dragging, dragPos, minimized]);

  const changeOffset = (delta: number) => {
    const next = offset + delta;
    setTimeOffset(next);
    setOffset(next);
    window.location.reload();
  };

  const resetTime = () => {
    setTimeOffset(0);
    setOffset(0);
    window.location.reload();
  };

  const handleReset = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      // Clear time offset too
      setTimeOffset(0);
      // Invalidate all RTK Query cache
      dispatch(baseApi.util.resetApiState());
      router.push("/onboarding");
      // Force full reload to clear all state
      setTimeout(() => window.location.href = "/onboarding", 100);
    } catch (err) {
      console.error("Reset failed:", err);
      setResetting(false);
      setConfirming(false);
    }
  };

  const effectiveDate = getNow();
  const dateLabel = effectiveDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Position: either dragging (absolute) or snapped to corner (fixed)
  const positionStyle = dragPos
    ? { position: "fixed" as const, left: dragPos.x, top: dragPos.y, right: "auto", bottom: "auto" }
    : { position: "fixed" as const, ...CORNER_STYLES[corner] };

  return (
    <div
      ref={panelRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        ...positionStyle,
        zIndex: 9999,
        touchAction: "none",
        userSelect: "none",
        transition: dragPos ? "none" : "all 200ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {minimized ? (
        <div
          className="flex h-9 w-9 cursor-grab items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg active:cursor-grabbing"
          title="Dev Tools"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
      ) : (
        <div
          className="w-56 cursor-grab rounded-xl border border-neutral-200 bg-white shadow-xl active:cursor-grabbing"
          style={{ fontSize: 13 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Dev Tools
            </span>
            <button
              onClick={() => setMinimized(true)}
              className="flex h-5 w-5 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Time controls */}
          <div className="border-b border-neutral-100 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Today</span>
              {offset !== 0 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  {offset > 0 ? `+${offset}d` : `${offset}d`}
                </span>
              )}
            </div>
            <p className="mb-2 text-sm font-medium text-neutral-900">{dateLabel}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => changeOffset(-7)}
                className="rounded border border-neutral-200 px-1.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"
                title="Back 1 week"
              >
                &laquo;7
              </button>
              <button
                onClick={() => changeOffset(-1)}
                className="rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"
                title="Back 1 day"
              >
                &laquo;
              </button>
              <button
                onClick={resetTime}
                disabled={offset === 0}
                className="flex-1 rounded border border-neutral-200 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50 active:bg-neutral-100 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Today
              </button>
              <button
                onClick={() => changeOffset(1)}
                className="rounded border border-neutral-200 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"
                title="Forward 1 day"
              >
                &raquo;
              </button>
              <button
                onClick={() => changeOffset(7)}
                className="rounded border border-neutral-200 px-1.5 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50 active:bg-neutral-100"
                title="Forward 1 week"
              >
                7&raquo;
              </button>
            </div>
          </div>

          {/* Restore previous plan (only shows when impersonating) */}
          {isImpersonating && (
            <div className="border-b border-neutral-100 px-3 py-2.5">
              <button
                onClick={async () => {
                  setRestoring(true);
                  try {
                    const res = await fetch("/api/review/restore", { method: "POST" });
                    if (!res.ok) {
                      const data = await res.json();
                      alert(data.error || "No previous plan to restore");
                    } else {
                      dispatch(baseApi.util.resetApiState());
                      window.location.reload();
                    }
                  } catch {
                    alert("Restore failed");
                  } finally {
                    setRestoring(false);
                  }
                }}
                disabled={restoring}
                className="w-full rounded-lg bg-amber-100 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 disabled:opacity-50 transition-colors"
              >
                {restoring ? "Restoring..." : "Restore Previous Plan"}
              </button>
            </div>
          )}

          {/* Reset account */}
          <div className="px-3 py-2.5">
            <button
              onClick={handleReset}
              disabled={resetting}
              className={`w-full rounded-lg py-1.5 text-xs font-medium transition-colors ${
                confirming
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              } disabled:opacity-50`}
            >
              {resetting ? "Resetting..." : confirming ? "Confirm Reset" : "Reset Account"}
            </button>
            {confirming && !resetting && (
              <button
                onClick={() => setConfirming(false)}
                className="mt-1 w-full text-center text-[11px] text-neutral-400 hover:text-neutral-600"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DevToolPanel() {
  const { user, isLoaded } = useClerkUser();

  if (!isLoaded || !user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  if (!email?.startsWith("jconsenstein")) return null;

  return <DevToolPanelInner />;
}
