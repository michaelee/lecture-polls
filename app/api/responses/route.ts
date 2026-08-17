import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/auth";
import { isValidChoice } from "@/lib/choices";
import { absoluteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  const session = await getStudentSession();
  const form = await request.formData();
  const classCode = String(form.get("classCode") ?? "");
  const redirectUrl = absoluteUrl(`/c/${classCode}`, request);

  if (!session) {
    return NextResponse.redirect(
      absoluteUrl(`/login?next=${encodeURIComponent(`/c/${classCode}`)}`, request),
      303,
    );
  }

  const pollId = String(form.get("pollId") ?? "");
  const choice = String(form.get("choice") ?? "").toUpperCase();

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { class: { select: { code: true } } },
  });
  if (!poll || !poll.isActive || poll.class.code !== classCode.toUpperCase()) {
    redirectUrl.searchParams.set("error", "poll-closed");
    return NextResponse.redirect(redirectUrl, 303);
  }

  if (!isValidChoice(choice, poll.numChoices)) {
    redirectUrl.searchParams.set("error", "invalid-choice");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_classId: { studentId: session.studentId, classId: poll.classId } },
  });
  if (!enrollment) {
    redirectUrl.searchParams.set("error", "not-enrolled");
    return NextResponse.redirect(redirectUrl, 303);
  }

  await prisma.response.upsert({
    where: { pollId_studentId: { pollId: poll.id, studentId: session.studentId } },
    update: { choice },
    create: { pollId: poll.id, studentId: session.studentId, choice },
  });

  redirectUrl.searchParams.set("submitted", "1");
  return NextResponse.redirect(redirectUrl, 303);
}
