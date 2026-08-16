import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/choices";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  const classUrl = new URL(`/admin/classes/${code}`, request.url);
  if (!klass) return NextResponse.redirect(classUrl, 303);

  const form = await request.formData();
  const label = String(form.get("label") ?? "").trim() || null;
  let numChoices = parseInt(String(form.get("numChoices") ?? "4"), 10);
  if (!Number.isFinite(numChoices)) numChoices = 4;
  numChoices = Math.min(Math.max(numChoices, MIN_CHOICES), MAX_CHOICES);
  const activateNow = form.get("activateNow") === "on";

  await prisma.$transaction(async (tx) => {
    const last = await tx.poll.findFirst({
      where: { classId: klass.id },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = (last?.number ?? 0) + 1;

    if (activateNow) {
      await tx.poll.updateMany({
        where: { classId: klass.id, isActive: true },
        data: { isActive: false },
      });
    }

    await tx.poll.create({
      data: { classId: klass.id, number, label, numChoices, isActive: activateNow },
    });
  });

  return NextResponse.redirect(classUrl, 303);
}
