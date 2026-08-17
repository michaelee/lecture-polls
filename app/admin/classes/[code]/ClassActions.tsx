"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClassActions({ code }: { code: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function deleteClass() {
    setPending(true);
    try {
      let res = await fetch(`/api/admin/classes/${code}`, { method: "DELETE" });

      if (res.status === 409) {
        const data = await res.json();
        const parts: string[] = [];
        if (data.pollCount > 0) {
          parts.push(
            `${data.pollCount} poll(s) (${data.responseCount} response(s) total)`,
          );
        }
        if (data.enrolledCount > 0) {
          parts.push(`${data.enrolledCount} enrollment(s)`);
        }
        if (data.orphanStudentCount > 0) {
          parts.push(
            `${data.orphanStudentCount} student(s) not enrolled in any other class, who will be deleted entirely`,
          );
        }
        const ok = confirm(
          `Delete ${code} entirely? This removes ${parts.join(", ")}. This can't be undone.`,
        );
        if (!ok) return;
        res = await fetch(`/api/admin/classes/${code}?force=true`, { method: "DELETE" });
      }

      if (!res.ok) {
        alert("Failed to delete class.");
        return;
      }

      router.push("/admin");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteClass}
      disabled={pending}
      className="text-sm text-red-600 underline disabled:opacity-50 dark:text-red-400"
    >
      Delete class
    </button>
  );
}
