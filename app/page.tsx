import Link from "next/link";
import { getStudentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await getStudentSession();

  if (!session) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Poller</h1>
        <p className="max-w-sm text-neutral-600 dark:text-neutral-400">
          Scan the QR code your instructor is showing in class, or log in below.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Log in
        </Link>
      </main>
    );
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: { enrollments: { include: { class: true } } },
  });

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">
        Hi{student ? `, ${student.firstName}` : ""} 👋
      </h1>
      <p className="max-w-sm text-neutral-600 dark:text-neutral-400">
        Scan the QR code your instructor shows in lecture to answer a poll.
      </p>
      {student && student.enrollments.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          <p className="text-sm text-neutral-500">Your classes:</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {student.enrollments.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/c/${e.class.code}`}
                  className="rounded-full border border-neutral-300 px-3 py-1 text-sm dark:border-neutral-700"
                >
                  {e.class.code}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
