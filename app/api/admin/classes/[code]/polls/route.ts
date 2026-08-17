import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { MAX_CHOICES, MIN_CHOICES } from "@/lib/choices";
import { absoluteUrl } from "@/lib/url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  const classUrl = absoluteUrl(`/admin/classes/${code}`, request);
  if (!klass) return NextResponse.redirect(classUrl, 303);

  const form = await request.formData();
  const label = String(form.get("label") ?? "").trim();
  let numChoices = parseInt(String(form.get("numChoices") ?? "4"), 10);
  if (!Number.isFinite(numChoices)) numChoices = 4;
  numChoices = Math.min(Math.max(numChoices, MIN_CHOICES), MAX_CHOICES);
  const activateNow = form.get("activateNow") === "on";

  if (!label) {
    classUrl.searchParams.set("error", "missing-label");
    return NextResponse.redirect(classUrl, 303);
  }

  await prisma.$transaction(async (tx) => {
    // number and sortOrder are independent (sortOrder gets shuffled by reordering), so
    // each needs its own max -- the poll with the highest number isn't necessarily the
    // one with the highest sortOrder.
    const { _max } = await tx.poll.aggregate({
      where: { classId: klass.id },
      _max: { number: true, sortOrder: true },
    });
    const number = (_max.number ?? 0) + 1;
    const sortOrder = (_max.sortOrder ?? 0) + 1;

    if (activateNow) {
      await tx.poll.updateMany({
        where: { classId: klass.id, isActive: true },
        data: { isActive: false },
      });
    }

    await tx.poll.create({
      data: { classId: klass.id, number, sortOrder, label, numChoices, isActive: activateNow },
    });
  });

  return NextResponse.redirect(classUrl, 303);
}
