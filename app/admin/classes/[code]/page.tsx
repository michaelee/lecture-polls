import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getResultsByPoll } from "@/lib/results";
import PollsPanel from "./PollsPanel";
import ClassActions from "./ClassActions";

const POLL_ERROR_MESSAGES: Record<string, string> = {
  "missing-label": "Give the poll a label before creating it.",
};

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const sp = await searchParams;

  const klass = await prisma.class.findUnique({ where: { code } });
  if (!klass) notFound();

  const [enrolledCount, polls, resultsByPoll] = await Promise.all([
    prisma.enrollment.count({ where: { classId: klass.id } }),
    prisma.poll.findMany({
      where: { classId: klass.id },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
      include: { _count: { select: { responses: true } } },
    }),
    getResultsByPoll(klass.id),
  ]);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const pollLink = `${baseUrl}/c/${klass.code}`;
  const qrDataUrl = await QRCode.toDataURL(pollLink, { margin: 1, width: 240 });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 p-8">
      <div className="flex items-start justify-between">
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
        <ClassActions code={klass.code} />
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
          <h2 className="text-lg font-medium">Polls</h2>
          <Link href={`/admin/classes/${klass.code}/live`} className="text-sm underline">
            View live results
          </Link>
        </div>
        {sp.error && POLL_ERROR_MESSAGES[sp.error] && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {POLL_ERROR_MESSAGES[sp.error]}
          </p>
        )}
        <PollsPanel
          code={klass.code}
          polls={polls.map((p) => ({
            id: p.id,
            label: p.label,
            numChoices: p.numChoices,
            isActive: p.isActive,
            responseCount: p._count.responses,
            counts: resultsByPoll.get(p.id) ?? {},
          }))}
        />

        <form
          action={`/api/admin/classes/${klass.code}/polls`}
          method="POST"
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-sm">
            Label
            <input
              name="label"
              required
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

      <Link
        href={`/admin/classes/${klass.code}/roster`}
        className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
      >
        <div>
          <h2 className="text-sm font-medium text-neutral-500">Roster</h2>
          <p className="text-lg font-semibold">
            {enrolledCount} student{enrolledCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className="text-sm underline">Manage roster &rarr;</span>
      </Link>
    </main>
  );
}
