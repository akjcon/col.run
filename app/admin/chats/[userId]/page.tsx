"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatThreadResponse {
  user: { userId: string; email: string; name: string };
  messages: ChatMessage[];
  truncated: boolean;
}

export default function AdminChatThreadPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const [data, setData] = useState<ChatThreadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(null);
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/admin/chats/${userId}`, { signal: controller.signal })
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
  }, [userId]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin/chats"
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← All chats
        </Link>
        {data && (
          <div className="mt-2">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {data.user.name || data.user.email || data.user.userId}
            </h1>
            <p className="text-sm text-neutral-500">{data.user.email}</p>
          </div>
        )}
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
        <div className="space-y-3">
          {data.truncated && (
            <p className="text-xs text-neutral-500">
              Showing the most recent {data.messages.length} messages.
            </p>
          )}
          {data.messages.length === 0 ? (
            <div className="rounded-md border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              No messages yet.
            </div>
          ) : (
            data.messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col",
                  m.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-900"
                  )}
                >
                  {m.content}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">
                  {m.timestamp ? format(m.timestamp, "MMM d, HH:mm") : ""}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
