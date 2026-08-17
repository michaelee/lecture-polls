import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

async function resolveClass(code: string) {
  return prisma.class.findUnique({ where: { code: code.toUpperCase() } });
}

/** CSV import: upserts Student by emailUsername, then upserts the Enrollment for this class. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await resolveClass(code);
  const classUrl = absoluteUrl(`/admin/classes/${code}`, request);
  if (!klass) return NextResponse.redirect(classUrl, 303);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    classUrl.searchParams.set("error", "no-file");
    return NextResponse.redirect(classUrl, 303);
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  let imported = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const firstName = (row.firstname ?? row["first name"] ?? row.first ?? "").trim();
    const lastName = (row.lastname ?? row["last name"] ?? row.last ?? "").trim();
    const emailUsername = (
      row.emailusername ??
      row["email username"] ??
      row.username ??
      row.email ??
      ""
    )
      .trim()
      .toLowerCase()
      .replace(/@.*$/, ""); // tolerate a full email address in the column too
    const campusId = (row.campusid ?? row["campus id"] ?? row.id ?? "").trim().toUpperCase();

    if (!firstName || !lastName || !emailUsername || !campusId) {
      skipped++;
      continue;
    }

    const student = await prisma.student.upsert({
      where: { emailUsername },
      update: { firstName, lastName, campusId },
      create: { emailUsername, firstName, lastName, campusId },
    });

    await prisma.enrollment.upsert({
      where: { studentId_classId: { studentId: student.id, classId: klass.id } },
      update: {},
      create: { studentId: student.id, classId: klass.id },
    });

    imported++;
  }

  classUrl.searchParams.set("imported", String(imported));
  if (skipped) classUrl.searchParams.set("skipped", String(skipped));
  return NextResponse.redirect(classUrl, 303);
}

/** Mass-delete: clears every Enrollment for this class. Students and poll history are untouched. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await resolveClass(code);
  if (!klass) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const result = await prisma.enrollment.deleteMany({ where: { classId: klass.id } });
  return NextResponse.json({ ok: true, deleted: result.count });
}
