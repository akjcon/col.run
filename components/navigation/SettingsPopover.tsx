"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Unplug, Loader2, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClerkFirebase } from "@/lib/clerk-firebase";

interface StravaStatus {
  connected: boolean;
  athleteName?: string;
  athleteProfile?: string;
}

export function SettingsPopover({
  children,
  side = "top",
  align = "start",
}: {
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { isFirebaseReady } = useClerkFirebase();

  const fetchStatus = useCallback(async () => {
    if (!isFirebaseReady) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v2/strava/status");
      if (res.ok) {
        setStravaStatus(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [isFirebaseReady]);

  useEffect(() => {
    if (open) fetchStatus();
  }, [open, fetchStatus]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/v2/strava/disconnect", { method: "POST" });
      if (res.ok) {
        setStravaStatus({ connected: false });
      }
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/v2/strava/connect?returnTo=home";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-72 p-0">
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-900">
              Settings
            </span>
          </div>
        </div>

        <div className="p-4">
          {/* Strava section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                Strava
              </span>
              <a
                href="https://www.strava.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/powered-by-strava.svg"
                  alt="Powered by Strava"
                  className="h-4"
                />
              </a>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            ) : stravaStatus?.connected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm text-neutral-700">
                    {stravaStatus.athleteName || "Connected"}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50"
                >
                  {disconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Unplug className="h-3.5 w-3.5" />
                  )}
                  {disconnecting ? "Disconnecting..." : "Disconnect Strava"}
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FC5200] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e04a00]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Connect Strava
              </button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
