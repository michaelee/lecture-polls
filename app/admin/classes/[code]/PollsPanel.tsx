"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { choicesFor } from "@/lib/choices";

export type PollRow = {
  id: string;
  label: string;
  numChoices: number;
  isActive: boolean;
  responseCount: number;
  counts: Record<string, number>;
};

// Fixed categorical order (never reassigned per-poll) -- validated colorblind-safe pair
// on the adjacent list, in both light and dark, via the dataviz skill's palette/validator.
const CHOICE_COLORS: Record<string, string> = {
  A: "bg-[#2a78d6] dark:bg-[#3987e5]",
  B: "bg-[#eb6834] dark:bg-[#d95926]",
  C: "bg-[#1baf7a] dark:bg-[#199e70]",
  D: "bg-[#eda100] dark:bg-[#c98500]",
  E: "bg-[#e87ba4] dark:bg-[#d55181]",
};

function PollResultBar({ counts, numChoices }: { counts: Record<string, number>; numChoices: number }) {
  const choices = choicesFor(numChoices);
  const total = choices.reduce((sum, c) => sum + (counts[c] ?? 0), 0);

  if (total === 0) {
    return <p className="text-xs text-neutral-400 dark:text-neutral-500">No responses yet</p>;
  }

  const segments = choices.filter((c) => (counts[c] ?? 0) > 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2.5 w-full max-w-[240px] gap-[2px]">
        {segments.map((c, i) => {
          const count = counts[c] ?? 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div
              key={c}
              title={`${c}: ${count} response${count === 1 ? "" : "s"} (${pct}%)`}
              style={{ flexGrow: count, flexBasis: 0 }}
              className={`${CHOICE_COLORS[c]} ${i === 0 ? "rounded-l-full" : ""} ${
                i === segments.length - 1 ? "rounded-r-full" : ""
              }`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {choices.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"
          >
            <span className={`inline-block h-2 w-2 rounded-sm ${CHOICE_COLORS[c]}`} />
            {c} {Math.round(((counts[c] ?? 0) / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export default function PollsPanel({
  code,
  polls,
}: {
  code: string;
  polls: PollRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggleActive(poll: PollRow) {
    setPendingId(poll.id);
    try {
      const res = await fetch(`/api/admin/classes/${code}/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !poll.isActive }),
      });
      if (!res.ok) {
        alert("Failed to update poll.");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function move(poll: PollRow, direction: "up" | "down") {
    setPendingId(poll.id);
    try {
      const res = await fetch(`/api/admin/classes/${code}/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ move: direction }),
      });
      if (!res.ok) {
        alert("Failed to reorder poll.");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function deletePoll(poll: PollRow) {
    setPendingId(poll.id);
    try {
      let res = await fetch(`/api/admin/classes/${code}/polls/${poll.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const data = await res.json();
        const ok = confirm(
          `"${poll.label}" has ${data.responseCount} response(s). Delete it anyway? This can't be undone.`,
        );
        if (!ok) return;
        res = await fetch(`/api/admin/classes/${code}/polls/${poll.id}?force=true`, {
          method: "DELETE",
        });
      }
      if (!res.ok) {
        alert("Failed to delete poll.");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  if (polls.length === 0) {
    return <p className="text-sm text-neutral-500">No polls yet — create one below.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {polls.map((p, i) => (
        <li key={p.id} className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={pendingId === p.id || i === 0}
                  onClick={() => move(p, "up")}
                  aria-label="Move up"
                  className="leading-none text-neutral-400 hover:text-neutral-700 disabled:opacity-20 dark:hover:text-neutral-200"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={pendingId === p.id || i === polls.length - 1}
                  onClick={() => move(p, "down")}
                  aria-label="Move down"
                  className="leading-none text-neutral-400 hover:text-neutral-700 disabled:opacity-20 dark:hover:text-neutral-200"
                >
                  ▼
                </button>
              </div>
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-xs text-neutral-500">
                  A–{String.fromCharCode(64 + p.numChoices)} · {p.responseCount} response
                  {p.responseCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {p.isActive && (
                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                  Active
                </span>
              )}
              <button
                type="button"
                disabled={pendingId === p.id}
                onClick={() => toggleActive(p)}
                className="underline disabled:opacity-50"
              >
                {p.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                disabled={pendingId === p.id}
                onClick={() => deletePoll(p)}
                className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
          <PollResultBar counts={p.counts} numChoices={p.numChoices} />
        </li>
      ))}
    </ul>
  );
}
