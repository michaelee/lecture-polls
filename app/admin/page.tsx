import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  "missing-code": "Class code is required.",
  "duplicate-code": "A class with that code already exists.",
};

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;

  const classes = await prisma.class.findMany({
    orderBy: { code: "asc" },
    include: { _count: { select: { enrollments: true, polls: true } } },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Classes</h1>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ERROR_MESSAGES[error] ?? "Something went wrong."}
        </p>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {classes.length === 0 && (
          <li className="p-4 text-sm text-neutral-500">No classes yet — create one below.</li>
        )}
        {classes.map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/classes/${c.code}`}
              className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              <div>
                <p className="font-medium">{c.code}</p>
                {c.name && <p className="text-sm text-neutral-500">{c.name}</p>}
              </div>
              <p className="text-sm text-neutral-500">
                {c._count.enrollments} students · {c._count.polls} polls
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">New class</h2>
        <form
          action="/api/admin/classes"
          method="POST"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Code
            <input
              name="code"
              required
              placeholder="CS440"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Name (optional)
            <input
              name="name"
              placeholder="Software Engineering"
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Create
          </button>
        </form>
      </div>
    </main>
  );
}
