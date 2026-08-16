import { prisma } from "./prisma";

export type RosterRow = {
  enrollmentId: string;
  studentId: string;
  firstName: string;
  lastName: string;
  emailUsername: string;
  campusId: string;
  answered: number;
  missed: number;
};

/**
 * Roster for a class with live-computed answered/missed poll counts.
 * "answered" = distinct polls in this class the student has a Response for.
 * "missed" = (all polls ever created for this class) - answered.
 * Neither is stored on the Student row, so it can never drift out of sync.
 */
export async function getRosterWithStats(classId: string): Promise<RosterRow[]> {
  const [enrollments, totalPolls] = await Promise.all([
    prisma.enrollment.findMany({
      where: { classId },
      include: {
        student: {
          include: {
            responses: {
              where: { poll: { classId } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.poll.count({ where: { classId } }),
  ]);

  return enrollments.map((e) => {
    const answered = e.student.responses.length;
    return {
      enrollmentId: e.id,
      studentId: e.studentId,
      firstName: e.student.firstName,
      lastName: e.student.lastName,
      emailUsername: e.student.emailUsername,
      campusId: e.student.campusId,
      answered,
      missed: Math.max(totalPolls - answered, 0),
    };
  });
}
