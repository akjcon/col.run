"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EVENT_TYPES, type EventType } from "@/lib/events";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [7, 30, 90] as const;
type Range = (typeof RANGE_OPTIONS)[number];

// Floor for non-zero bars so a single event is still visible against the axis.
const MIN_VISIBLE_BAR_PCT = 4;

interface UserRow {
  userId: string;
  email: string;
  name: string;
  createdAt: number | null;
  totalEvents: number;
  lastEventAt: number | null;
  byType: Record<EventType, number>;
}

interface DailyBucket {
  date: string;
  total: number;
  uniqueUsers: number;
  byType: Record<EventType, number>;
}

interface AnalyticsResponse {
  rangeDays: number;
  totals: {
    events: number;
    activeUsers: number;
    dau: number;
    wau: number;
    mau: number;
    droppedImpersonating: number;
    droppedAdmin: number;
  };
  byType: Record<EventType, number>;
  series: DailyBucket[];
  users: UserRow[];
}

const EVENT_LABELS: Record<EventType, string> = {
  page_view: "Page views",
  chat_message_sent: "Chat messages",
  workout_completed: "Workouts logged",
  plan_generated: "Plans generated",
  plan_change_proposed: "Plan changes proposed",
  plan_change_accepted: "Plan changes accepted",
  plan_change_declined: "Plan changes declined",
  pace_zone_update_proposed: "Pace updates proposed",
  pace_zone_update_accepted: "Pace updates accepted",
  pace_zone_update_declined: "Pace updates declined",
  chat_error: "Chat errors",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics?days=${range}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Not authorized");
          throw new Error(`Failed to load analytics (${res.status})`);
        }
        return res.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const maxBar = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, ...data.series.map((d) => d.total));
  }, [data]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-neutral-500">col.run admin</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Analytics</h1>
          <Link
            href="/admin/chats"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            Read user chats →
          </Link>
        </div>
        <div className="flex gap-1 rounded-md border border-neutral-200 p-1 bg-white">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 text-sm rounded transition-colors",
                range === r
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              )}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner variant="inline" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          <ExclusionNotice
            droppedImpersonating={data.totals.droppedImpersonating}
            droppedAdmin={data.totals.droppedAdmin}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Active today" value={data.totals.dau} />
            <Stat label="Active this week" value={data.totals.wau} />
            <Stat label="Active 30d" value={data.totals.mau} />
            <Stat
              label={`Total events (${data.rangeDays}d)`}
              value={data.totals.events}
            />
          </div>

          <Section title="Daily activity">
            <div className="flex items-end gap-1 h-40">
              {data.series.map((d) => {
                const heightPct =
                  d.total === 0
                    ? 0
                    : Math.max((d.total / maxBar) * 100, MIN_VISIBLE_BAR_PCT);
                return (
                  <div
                    key={d.date}
                    className="flex-1 min-w-0 flex items-end"
                  >
                    <div
                      className="w-full bg-neutral-900 hover:bg-[#E98A15] transition-colors rounded-t-sm"
                      style={{ height: `${heightPct}%` }}
                      title={`${d.date} — ${d.total} events from ${d.uniqueUsers} users`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-neutral-500">
              <span>{data.series[0]?.date}</span>
              <span>{data.series[data.series.length - 1]?.date}</span>
            </div>
          </Section>

          <Section title="Event breakdown">
            <div className="space-y-2">
              {EVENT_TYPES.map((t) => {
                const count = data.byType[t];
                const pct = data.totals.events
                  ? (count / data.totals.events) * 100
                  : 0;
                return (
                  <div key={t} className="flex items-center gap-3 text-sm">
                    <span className="w-40 text-neutral-700">
                      {EVENT_LABELS[t]}
                    </span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded">
                      <div
                        className="h-full bg-neutral-900 rounded"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums text-neutral-900">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title={`Users (${data.users.length})`}>
            {data.users.length === 0 ? (
              <p className="text-sm text-neutral-500">No activity in window.</p>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm">
                  <thead className="text-left text-neutral-500 border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-3 font-medium">User</th>
                      <th className="py-2 px-3 font-medium">Last active</th>
                      <th className="py-2 px-3 font-medium text-right">
                        Events
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        Pages
                      </th>
                      <th className="py-2 px-3 font-medium text-right">Chat</th>
                      <th className="py-2 px-3 font-medium text-right">
                        Workouts
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        Plans
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        Changes
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        Pace
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        Errors
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr
                        key={u.userId}
                        className="border-b border-neutral-100 hover:bg-neutral-50"
                      >
                        <td className="py-2 px-3">
                          <div className="font-medium text-neutral-900">
                            {u.name || "—"}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {u.email}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-neutral-700">
                          {u.lastEventAt
                            ? formatDistanceToNow(u.lastEventAt, {
                                addSuffix: true,
                              })
                            : "—"}
                          <div className="text-xs text-neutral-400">
                            {u.lastEventAt
                              ? format(u.lastEventAt, "MMM d, HH:mm")
                              : ""}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {u.totalEvents.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600">
                          {u.byType.page_view.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600">
                          {u.byType.chat_message_sent.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600">
                          {u.byType.workout_completed.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600">
                          {u.byType.plan_generated.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600 whitespace-nowrap">
                          <span className="text-emerald-700">
                            {u.byType.plan_change_accepted.toLocaleString()}✓
                          </span>{" "}
                          <span className="text-neutral-400">
                            {u.byType.plan_change_declined.toLocaleString()}✗
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-neutral-600 whitespace-nowrap">
                          <span className="text-emerald-700">
                            {u.byType.pace_zone_update_accepted.toLocaleString()}✓
                          </span>{" "}
                          <span className="text-neutral-400">
                            {u.byType.pace_zone_update_declined.toLocaleString()}✗
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums whitespace-nowrap">
                          {u.byType.chat_error > 0 ? (
                            <span className="text-red-600 font-medium">
                              {u.byType.chat_error.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-neutral-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="text-2xl font-semibold text-neutral-900 tabular-nums mt-1">
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-neutral-700 mb-3">{title}</h2>
      <div className="rounded-md border border-neutral-200 bg-white p-4">
        {children}
      </div>
    </section>
  );
}

function ExclusionNotice({
  droppedImpersonating,
  droppedAdmin,
}: {
  droppedImpersonating: number;
  droppedAdmin: number;
}) {
  if (droppedImpersonating === 0 && droppedAdmin === 0) return null;
  return (
    <p className="text-xs text-neutral-500">
      Excluded: {droppedAdmin.toLocaleString()} admin events,{" "}
      {droppedImpersonating.toLocaleString()} impersonated events.
    </p>
  );
}
