import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

/** Toggle a poll active/inactive. Activating deactivates every other poll in the class. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code, id } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  if (!klass) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const isActive = Boolean(body.isActive);

  await prisma.$transaction(async (tx) => {
    if (isActive) {
      await tx.poll.updateMany({
        where: { classId: klass.id, isActive: true },
        data: { isActive: false },
      });
    }
    await tx.poll.update({ where: { id }, data: { isActive } });
  });

  return NextResponse.json({ ok: true });
}

/**
 * Delete a poll. If it has responses and `force=true` wasn't passed, returns a 409 with a
 * warning instead of deleting, so the UI can confirm before resubmitting with force=true.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string; id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";

  const poll = await prisma.poll.findUnique({
    where: { id },
    select: { id: true, _count: { select: { responses: true } } },
  });
  if (!poll) return NextResponse.json({ error: "not-found" }, { status: 404 });

  if (poll._count.responses > 0 && !force) {
    return NextResponse.json(
      { warning: true, responseCount: poll._count.responses },
      { status: 409 },
    );
  }

  await prisma.poll.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
