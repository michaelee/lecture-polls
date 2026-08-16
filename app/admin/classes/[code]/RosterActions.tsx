"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RosterActions({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    const ok = confirm(
      `Delete the entire roster for ${code}? Students and poll history are kept — only this class's enrollments are removed. You'd need to re-import the CSV to restore it.`,
    );
    if (!ok) return;

    setPending(true);
    try {
      const res = await fetch(`/api/admin/classes/${code}/roster`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to delete roster.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="text-red-600 underline disabled:opacity-50 dark:text-red-400"
    >
      Delete roster
    </button>
  );
}
