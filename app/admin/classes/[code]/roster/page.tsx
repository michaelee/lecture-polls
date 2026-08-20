import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getRosterWithStats } from "@/lib/roster";
import RosterActions from "../RosterActions";

const ROSTER_ERROR_MESSAGES: Record<string, string> = {
  "no-file": "Choose a CSV file before importing.",
};

export default async function RosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ imported?: string; skipped?: string; error?: string }>;
}) {
  await requireAdmin();
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const sp = await searchParams;

  const klass = await prisma.class.findUnique({ where: { code } });
  if (!klass) notFound();

  const roster = await getRosterWithStats(klass.id);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
      <div>
        <Link href={`/admin/classes/${klass.code}`} className="text-sm text-neutral-500">
          &larr; {klass.code}
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Roster</h1>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">{roster.length} students</h2>
          <div className="flex items-center gap-4 text-sm">
            <a href={`/api/admin/classes/${klass.code}/export`} className="underline">
              Download CSV
            </a>
            <RosterActions code={klass.code} />
          </div>
        </div>

        {sp.error && ROSTER_ERROR_MESSAGES[sp.error] && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {ROSTER_ERROR_MESSAGES[sp.error]}
          </p>
        )}
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
            Columns, in this order: firstName, lastName, emailUsername, campusId. A header row
            is optional — with or without one both work. Re-importing updates existing students
            and adds new ones — it never removes anyone.
          </p>
        </form>
      </section>
    </main>
  );
}
