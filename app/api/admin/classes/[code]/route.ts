import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

/**
 * Deletes a class entirely: the class row itself cascades (at the DB level) to its
 * enrollments, polls, and responses. Any student who was only enrolled in this class --
 * and so has zero enrollments left anywhere -- gets deleted too, since they're now
 * orphaned data with no other reason to exist.
 *
 * If there's any roster/poll data and `force=true` wasn't passed, returns a 409 with a
 * summary instead of deleting, so the UI can show exactly what's about to be lost.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  if (!klass) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const force = new URL(request.url).searchParams.get("force") === "true";

  const [enrollments, pollCount, responseCount] = await Promise.all([
    prisma.enrollment.findMany({ where: { classId: klass.id }, select: { studentId: true } }),
    prisma.poll.count({ where: { classId: klass.id } }),
    prisma.response.count({ where: { poll: { classId: klass.id } } }),
  ]);
  const studentIds = enrollments.map((e) => e.studentId);

  if (!force && (studentIds.length > 0 || pollCount > 0)) {
    const orphanStudentCount = await countOrphans(studentIds, klass.id);
    return NextResponse.json(
      {
        warning: true,
        enrolledCount: studentIds.length,
        orphanStudentCount,
        pollCount,
        responseCount,
      },
      { status: 409 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.class.delete({ where: { id: klass.id } }); // cascades enrollments/polls/responses
    if (studentIds.length > 0) {
      const stillEnrolled = await tx.enrollment.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true },
        distinct: ["studentId"],
      });
      const stillEnrolledIds = new Set(stillEnrolled.map((e) => e.studentId));
      const orphanIds = studentIds.filter((id) => !stillEnrolledIds.has(id));
      if (orphanIds.length > 0) {
        await tx.student.deleteMany({ where: { id: { in: orphanIds } } });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

/** How many of these students would have zero enrollments left if this class were removed. */
async function countOrphans(studentIds: string[], classId: string): Promise<number> {
  if (studentIds.length === 0) return 0;
  const elsewhere = await prisma.enrollment.findMany({
    where: { studentId: { in: studentIds }, classId: { not: classId } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const enrolledElsewhere = new Set(elsewhere.map((e) => e.studentId));
  return studentIds.filter((id) => !enrolledElsewhere.has(id)).length;
}
