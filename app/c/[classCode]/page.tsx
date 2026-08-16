import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { choicesFor } from "@/lib/choices";

const ERROR_MESSAGES: Record<string, string> = {
  "poll-closed": "That poll isn't open anymore.",
  "invalid-choice": "That's not a valid choice for this poll.",
  "not-enrolled": "You're not enrolled in this class.",
};

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-neutral-600 dark:text-neutral-400">{body}</p>
    </main>
  );
}

export default async function ClassPollPage({
  params,
  searchParams,
}: {
  params: Promise<{ classCode: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { classCode } = await params;
  const code = classCode.toUpperCase();
  const session = await requireStudent(`/c/${code}`);
  const { error, submitted } = await searchParams;

  const klass = await prisma.class.findUnique({ where: { code } });
  if (!klass) {
    return <Message title="Class not found" body={`No class with code "${code}" exists.`} />;
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_classId: { studentId: session.studentId, classId: klass.id } },
  });
  if (!enrollment) {
    return (
      <Message
        title="Not enrolled"
        body={`You're not on the roster for ${klass.code}. If this seems wrong, check with your instructor.`}
      />
    );
  }

  const activePoll = await prisma.poll.findFirst({
    where: { classId: klass.id, isActive: true },
  });

  if (!activePoll) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        {/* React 19 hoists <meta>/<title>/<link> rendered anywhere into <head> -- no client JS needed. */}
        <meta httpEquiv="refresh" content="5" />
        <h1 className="text-xl font-semibold">{klass.code}</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          No poll is live right now. This page checks again every few seconds.
        </p>
      </main>
    );
  }

  const existingResponse = await prisma.response.findUnique({
    where: { pollId_studentId: { pollId: activePoll.id, studentId: session.studentId } },
  });

  const choices = choicesFor(activePoll.numChoices);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-neutral-500">
          {klass.code} · Poll {activePoll.number}
        </p>
        {activePoll.label && <h1 className="text-xl font-semibold">{activePoll.label}</h1>}
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}
      {submitted && !error && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          Answer recorded{existingResponse ? ` (${existingResponse.choice})` : ""}. You can
          change it anytime while the poll is open.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {choices.map((c) => (
          <form key={c} action="/api/responses" method="POST">
            <input type="hidden" name="pollId" value={activePoll.id} />
            <input type="hidden" name="classCode" value={klass.code} />
            <input type="hidden" name="choice" value={c} />
            <button
              type="submit"
              className={`w-20 rounded-xl border-2 px-4 py-6 text-2xl font-bold transition-colors sm:w-24 ${
                existingResponse?.choice === c
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700"
              }`}
            >
              {c}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
