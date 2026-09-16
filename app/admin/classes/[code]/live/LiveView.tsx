"use client";

import { useState } from "react";
import LiveResults from "./LiveResults";
import type { LiveResults as Results } from "@/lib/results";

export default function LiveView({
  code,
  initial,
  qrDataUrl,
  pollLink,
}: {
  code: string;
  initial: Results;
  qrDataUrl: string;
  pollLink: string;
}) {
  const [view, setView] = useState<"results" | "qr">("results");

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setView(view === "results" ? "qr" : "results")}
          className="text-sm underline"
        >
          {view === "results" ? "Show QR code" : "Show live results"}
        </button>
      </div>

      {view === "qr" ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code linking to ${pollLink}`}
            width={240}
            height={240}
            className="rounded-lg border border-neutral-200 dark:border-neutral-800"
          />
          <div>
            <p className="text-sm uppercase tracking-wide text-neutral-500">{code}</p>
            <code className="mt-1 block text-sm">{pollLink}</code>
          </div>
        </div>
      ) : (
        <LiveResults code={code} initial={initial} />
      )}
    </div>
  );
}
