import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { verifyAdmin, isAdminEmail } from "@/lib/admin-auth";
import { EVENT_TYPES, type EventType } from "@/lib/events";

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES);

// Don't cache aggregations; the dashboard should reflect current state.
export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseDaysParam(raw: string | null): number {
  if (!raw) return DEFAULT_DAYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_DAYS;
  return Math.min(MAX_DAYS, Math.max(1, Math.floor(parsed)));
}

interface UserSummary {
  userId: string;
  email: string;
  name: string;
  createdAt: number | null;
  totalEvents: number;
  lastEventAt: number | null;
  byType: Record<EventType, number>;
}

interface DailyBucket {
  date: string; // YYYY-MM-DD
  total: number;
  uniqueUsers: number;
  byType: Record<EventType, number>;
}

function startOfUtcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function emptyTypeCounts(): Record<EventType, number> {
  return EVENT_TYPES.reduce(
    (acc, t) => ({ ...acc, [t]: 0 }),
    {} as Record<EventType, number>
  );
}

export async function GET(request: NextRequest) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = parseDaysParam(request.nextUrl.searchParams.get("days"));
  const now = Date.now();
  const sinceMs = now - days * DAY_MS;

  const db = getAdminDb();

  // Single-field range query on userEvents → no composite index needed.
  const [usersSnap, eventsSnap] = await Promise.all([
    db.collection("users").get(),
    db.collection("userEvents").where("timestamp", ">=", sinceMs).get(),
  ]);

  const profiles = new Map<
    string,
    { email: string; name: string; createdAt: number | null }
  >();
  const skipUserIds = new Set<string>();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const email = (data.email as string) || "";
    const name = (data.name as string) || "";
    const createdAtRaw = data.createdAt;
    let createdAt: number | null = null;
    if (typeof createdAtRaw === "number") createdAt = createdAtRaw;
    else if (createdAtRaw?.toMillis) createdAt = createdAtRaw.toMillis();
    profiles.set(doc.id, { email, name, createdAt });
    if (isAdminEmail(email)) skipUserIds.add(doc.id);
  }

  const userTotals = new Map<string, UserSummary>();
  const dayBuckets = new Map<string, DailyBucket>();
  const dayUserSets = new Map<string, Set<string>>();
  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  const typeTotals = emptyTypeCounts();

  const dauCutoff = now - DAY_MS;
  const wauCutoff = now - 7 * DAY_MS;
  const mauCutoff = now - 30 * DAY_MS;

  let totalEvents = 0;
  let droppedImpersonating = 0;
  let droppedAdmin = 0;

  for (const doc of eventsSnap.docs) {
    const e = doc.data() as {
      userId?: string;
      eventType?: string;
      timestamp?: number;
      isImpersonating?: boolean;
    };

    if (!e.userId || !e.eventType || typeof e.timestamp !== "number") continue;
    if (!EVENT_TYPE_SET.has(e.eventType)) continue;

    if (e.isImpersonating) {
      droppedImpersonating++;
      continue;
    }
    if (skipUserIds.has(e.userId)) {
      droppedAdmin++;
      continue;
    }

    const type = e.eventType as EventType;
    const ts = e.timestamp;

    totalEvents++;
    typeTotals[type]++;

    if (ts >= dauCutoff) dauSet.add(e.userId);
    if (ts >= wauCutoff) wauSet.add(e.userId);
    if (ts >= mauCutoff) mauSet.add(e.userId);

    let summary = userTotals.get(e.userId);
    if (!summary) {
      const profile = profiles.get(e.userId);
      summary = {
        userId: e.userId,
        email: profile?.email || "",
        name: profile?.name || "",
        createdAt: profile?.createdAt ?? null,
        totalEvents: 0,
        lastEventAt: null,
        byType: emptyTypeCounts(),
      };
      userTotals.set(e.userId, summary);
    }
    summary.totalEvents++;
    summary.byType[type]++;
    if (summary.lastEventAt === null || ts > summary.lastEventAt) {
      summary.lastEventAt = ts;
    }

    const dayKey = isoDate(startOfUtcDay(ts));
    let bucket = dayBuckets.get(dayKey);
    if (!bucket) {
      bucket = {
        date: dayKey,
        total: 0,
        uniqueUsers: 0,
        byType: emptyTypeCounts(),
      };
      dayBuckets.set(dayKey, bucket);
      dayUserSets.set(dayKey, new Set());
    }
    bucket.total++;
    bucket.byType[type]++;
    dayUserSets.get(dayKey)!.add(e.userId);
  }

  for (const [dayKey, set] of dayUserSets.entries()) {
    dayBuckets.get(dayKey)!.uniqueUsers = set.size;
  }

  // Fill in a continuous time series of exactly `days` buckets ending today.
  // The Firestore query window starts at `now - days*DAY_MS` (sub-day precision),
  // which spans `days+1` UTC midnights — we trim to the requested count.
  const series: DailyBucket[] = [];
  const endDay = startOfUtcDay(now);
  const startDay = endDay - (days - 1) * DAY_MS;
  for (let day = startDay; day <= endDay; day += DAY_MS) {
    const key = isoDate(day);
    series.push(
      dayBuckets.get(key) ?? {
        date: key,
        total: 0,
        uniqueUsers: 0,
        byType: emptyTypeCounts(),
      }
    );
  }

  const userList = Array.from(userTotals.values()).sort(
    (a, b) => (b.lastEventAt ?? 0) - (a.lastEventAt ?? 0)
  );

  return NextResponse.json({
    rangeDays: days,
    totals: {
      events: totalEvents,
      activeUsers: userTotals.size,
      dau: dauSet.size,
      wau: wauSet.size,
      mau: mauSet.size,
      droppedImpersonating,
      droppedAdmin,
    },
    byType: typeTotals,
    series,
    users: userList,
  });
}
