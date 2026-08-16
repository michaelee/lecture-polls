import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getRosterWithStats } from "@/lib/roster";
import RosterActions from "./RosterActions";
import PollsPanel from "./PollsPanel";

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ imported?: string; skipped?: string }>;
}) {
  await requireAdmin();
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const sp = await searchParams;

  const klass = await prisma.class.findUnique({ where: { code } });
  if (!klass) notFound();

  const [roster, polls] = await Promise.all([
    getRosterWithStats(klass.id),
    prisma.poll.findMany({
      where: { classId: klass.id },
      orderBy: { number: "desc" },
      include: { _count: { select: { responses: true } } },
    }),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const pollLink = `${baseUrl}/c/${klass.code}`;
  const qrDataUrl = await QRCode.toDataURL(pollLink, { margin: 1, width: 240 });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 p-8">
      <div>
        <Link href="/admin" className="text-sm text-neutral-500">
          &larr; All classes
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          {klass.code}
          {klass.name && (
            <span className="ml-2 text-base font-normal text-neutral-500">{klass.name}</span>
          )}
        </h1>
      </div>

      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR code linking to ${pollLink}`}
          width={160}
          height={160}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
        />
        <div>
          <p className="text-sm text-neutral-500">
            Persistent poll link for this class — always resolves to whichever poll is active.
            Project this QR code or share the link once; you don&apos;t need a new one per poll.
          </p>
          <code className="mt-1 block text-sm">{pollLink}</code>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Roster ({roster.length})</h2>
          <div className="flex items-center gap-4 text-sm">
            <a href={`/api/admin/classes/${klass.code}/export`} className="underline">
              Download CSV
            </a>
            <RosterActions code={klass.code} />
          </div>
        </div>

        {sp.imported && (
          <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            Imported {sp.imported} student{sp.imported === "1" ? "" : "s"}.
            {sp.skipped ? ` Skipped ${sp.skipped} row(s) with missing fields.` : ""}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Username</th>
                <th className="p-2">Campus ID</th>
                <th className="p-2 text-right">Answered</th>
                <th className="p-2 text-right">Missed</th>
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-neutral-500">
                    No students yet.
                  </td>
                </tr>
              )}
              {roster.map((r) => (
                <tr
                  key={r.enrollmentId}
                  className="border-t border-neutral-200 dark:border-neutral-800"
                >
                  <td className="p-2">
                    {r.firstName} {r.lastName}
                  </td>
                  <td className="p-2">{r.emailUsername}</td>
                  <td className="p-2">{r.campusId}</td>
                  <td className="p-2 text-right">{r.answered}</td>
                  <td className="p-2 text-right">{r.missed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          action={`/api/admin/classes/${klass.code}/roster`}
          method="POST"
          encType="multipart/form-data"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Import roster CSV
            <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Import
          </button>
          <p className="basis-full text-xs text-neutral-500">
            Columns: firstName, lastName, emailUsername, campusId. Re-importing updates existing
            students and adds new ones — it never removes anyone.
          </p>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Polls</h2>
        <PollsPanel
          code={klass.code}
          polls={polls.map((p) => ({
            id: p.id,
            number: p.number,
            label: p.label,
            numChoices: p.numChoices,
            isActive: p.isActive,
            responseCount: p._count.responses,
          }))}
        />

        <form
          action={`/api/admin/classes/${klass.code}/polls`}
          method="POST"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Label (optional)
            <input
              name="label"
              placeholder="Recursion base case"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Choices
            <select
              name="numChoices"
              defaultValue="4"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} (A–{String.fromCharCode(64 + n)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="activateNow" defaultChecked />
            Activate immediately
          </label>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            + New poll
          </button>
        </form>
      </section>
    </main>
  );
}
