"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PollRow = {
  id: string;
  number: number;
  label: string | null;
  numChoices: number;
  isActive: boolean;
  responseCount: number;
};

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

  async function deletePoll(poll: PollRow) {
    setPendingId(poll.id);
    try {
      let res = await fetch(`/api/admin/classes/${code}/polls/${poll.id}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        const data = await res.json();
        const ok = confirm(
          `Poll ${poll.number} has ${data.responseCount} response(s). Delete it anyway? This can't be undone.`,
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
      {polls.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 p-3">
          <div>
            <p className="font-medium">
              Poll {p.number}
              {p.label && <span className="font-normal text-neutral-500"> · {p.label}</span>}
            </p>
            <p className="text-xs text-neutral-500">
              A–{String.fromCharCode(64 + p.numChoices)} · {p.responseCount} response
              {p.responseCount === 1 ? "" : "s"}
            </p>
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
        </li>
      ))}
    </ul>
  );
}
