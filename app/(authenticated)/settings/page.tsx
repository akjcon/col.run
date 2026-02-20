"use client";

import { useState, useEffect, useCallback } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Unplug, ExternalLink, Loader2 } from "lucide-react";
import { useClerkFirebase } from "@/lib/clerk-firebase";

interface StravaStatus {
  connected: boolean;
  athleteName?: string;
  athleteProfile?: string;
}

export default function SettingsPage() {
  const [stravaStatus, setStravaStatus] = useState<StravaStatus | null>(null);
  const [loading, setLoading] = useState(true);
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
    fetchStatus();
  }, [fetchStatus]);

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
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>

      {/* Strava Integration */}
      <section className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Strava
            </h2>
            <p className="text-sm text-neutral-500">
              Sync activities and training data
            </p>
          </div>
          <a
            href="https://www.strava.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/powered-by-strava.svg"
              alt="Powered by Strava"
              className="h-5"
            />
          </a>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection...
            </div>
          ) : stravaStatus?.connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {stravaStatus.athleteName || "Connected"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Activities syncing automatically
                  </p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 disabled:opacity-50"
              >
                {disconnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                Connect to sync your activities
              </p>
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 rounded-lg bg-[#FC5200] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#e04a00]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Connect Strava
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Clerk Profile */}
      <section>
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full shadow-none border border-neutral-200 rounded-xl",
            },
          }}
        />
      </section>
    </div>
  );
}
