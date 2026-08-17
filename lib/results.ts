import { prisma } from "./prisma";
import { choicesFor } from "./choices";

export type LiveResults =
  | { poll: null }
  | {
      poll: { id: string; label: string; numChoices: number };
      counts: Record<string, number>;
      total: number;
      enrolledCount: number;
    };

/** Live per-choice response counts for a class's currently active poll, if any. */
export async function getLiveResults(classId: string): Promise<LiveResults> {
  const poll = await prisma.poll.findFirst({ where: { classId, isActive: true } });
  if (!poll) return { poll: null };

  const [grouped, enrolledCount] = await Promise.all([
    prisma.response.groupBy({
      by: ["choice"],
      where: { pollId: poll.id },
      _count: { choice: true },
    }),
    prisma.enrollment.count({ where: { classId } }),
  ]);

  const counts: Record<string, number> = {};
  for (const c of choicesFor(poll.numChoices)) counts[c] = 0;
  for (const g of grouped) {
    if (g.choice in counts) counts[g.choice] = g._count.choice;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    poll: { id: poll.id, label: poll.label, numChoices: poll.numChoices },
    counts,
    total,
    enrolledCount,
  };
}
