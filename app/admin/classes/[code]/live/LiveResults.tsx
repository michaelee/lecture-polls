"use client";

import { useEffect, useRef, useState } from "react";
import { choicesFor } from "@/lib/choices";
import type { LiveResults as Results } from "@/lib/results";

const POLL_INTERVAL_MS = 3000;

export default function LiveResults({ code, initial }: { code: string; initial: Results }) {
  const [results, setResults] = useState<Results>(initial);
  // Starts null so the server-rendered markup has no time-dependent text to mismatch on
  // hydration; the first real timestamp is set client-side once mounted.
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  const failureCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await fetch(`/api/admin/classes/${code}/live`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: Results = await res.json();
        if (cancelled) return;
        setResults(data);
        setUpdatedAt(new Date());
        setStale(false);
        failureCount.current = 0;
      } catch {
        if (cancelled) return;
        failureCount.current += 1;
        if (failureCount.current >= 2) setStale(true);
      }
    }

    // Fire once immediately on mount (this is what sets the first, client-only
    // timestamp) rather than waiting a full interval for the first update.
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code]);

  if (!results.poll) {
    return (
      <div className="rounded-lg border border-neutral-200 p-8 text-center text-neutral-500 dark:border-neutral-800">
        No poll is currently active for {code}.
      </div>
    );
  }

  const { poll, counts, total, enrolledCount } = results;
  const choices = choicesFor(poll.numChoices);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm uppercase tracking-wide text-neutral-500">{code}</p>
          <h2 className="text-lg font-medium">{poll.label}</h2>
        </div>
        <p className="text-sm text-neutral-500">
          {total} of {enrolledCount} responded
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {choices.map((c) => {
          const count = counts[c] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={c} className="flex items-center gap-3">
              <span className="w-6 text-xl font-bold">{c}</span>
              <div className="h-9 flex-1 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                <div
                  className="h-full rounded-md bg-neutral-900 transition-[width] duration-500 ease-out dark:bg-neutral-100"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-24 text-right text-sm text-neutral-500">
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-right text-xs text-neutral-400">
        {updatedAt
          ? `${stale ? "Couldn't reach the server — showing the last update from" : "Updated"} ${updatedAt.toLocaleTimeString()}`
          : " "}
      </p>
    </div>
  );
}
