"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ChatSummary {
  userId: string;
  email: string;
  name: string;
  messageCount: number;
  lastMessageAt: number;
  lastUserMessage: string | null;
}

interface ChatsResponse {
  users: ChatSummary[];
  scanned: number;
  truncated: boolean;
}

export default function AdminChatsPage() {
  const [data, setData] = useState<ChatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/chats", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Failed (${res.status})`);
        }
        return res.json();
      })
      .then((d) => {
        if (!controller.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <p className="text-sm text-neutral-500">col.run admin</p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">User chats</h1>
          <Link
            href="/admin/analytics"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            ← Analytics
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner variant="inline" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-800 text-sm whitespace-pre-wrap break-all">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {data.truncated && (
            <p className="text-xs text-neutral-500">
              Showing users from the {data.scanned} most recent messages. Older
              chat-only users may be missing.
            </p>
          )}

          {data.users.length === 0 ? (
            <div className="rounded-md border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              No chats yet.
            </div>
          ) : (
            <ul className="rounded-md border border-neutral-200 bg-white divide-y divide-neutral-100">
              {data.users.map((u) => (
                <li key={u.userId}>
                  <Link
                    href={`/admin/chats/${u.userId}`}
                    className="block px-4 py-3 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-neutral-900 truncate">
                          {u.name || u.email || u.userId}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">
                          {u.email}
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500 text-right shrink-0">
                        {u.lastMessageAt > 0 && (
                          <>
                            <div>
                              {formatDistanceToNow(u.lastMessageAt, {
                                addSuffix: true,
                              })}
                            </div>
                            <div className="text-neutral-400">
                              {format(u.lastMessageAt, "MMM d, HH:mm")}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {u.lastUserMessage && (
                      <p className="mt-2 text-sm text-neutral-700 line-clamp-2">
                        {u.lastUserMessage}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-neutral-500">
                      {u.messageCount} message
                      {u.messageCount === 1 ? "" : "s"} in recent scan
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
