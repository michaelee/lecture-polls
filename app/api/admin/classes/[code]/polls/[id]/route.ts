import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

/**
 * Updates a poll: either `{ isActive }` to toggle it active/inactive (activating
 * deactivates every other poll in the class), or `{ move: "up" | "down" }` to swap its
 * display position with the adjacent poll.
 */
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

  if (body.move === "up" || body.move === "down") {
    const polls = await prisma.poll.findMany({
      where: { classId: klass.id },
      orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
      select: { id: true, sortOrder: true },
    });
    const index = polls.findIndex((p) => p.id === id);
    if (index === -1) return NextResponse.json({ error: "not-found" }, { status: 404 });

    const swapIndex = body.move === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= polls.length) {
      return NextResponse.json({ ok: true }); // already at that end, nothing to do
    }

    const current = polls[index];
    const neighbor = polls[swapIndex];
    await prisma.$transaction([
      prisma.poll.update({ where: { id: current.id }, data: { sortOrder: neighbor.sortOrder } }),
      prisma.poll.update({ where: { id: neighbor.id }, data: { sortOrder: current.sortOrder } }),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (typeof body.isActive === "boolean") {
    const isActive = body.isActive;
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

  return NextResponse.json({ error: "no-op" }, { status: 400 });
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
