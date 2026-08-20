import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

async function resolveClass(code: string) {
  return prisma.class.findUnique({ where: { code: code.toUpperCase() } });
}

// Column order when a file has no header row at all.
const POSITIONAL_FIELDS = ["firstName", "lastName", "emailUsername", "campusId"] as const;

const HEADER_ALIASES: Record<(typeof POSITIONAL_FIELDS)[number], string[]> = {
  firstName: ["firstname", "first name", "first"],
  lastName: ["lastname", "last name", "last"],
  emailUsername: ["emailusername", "email username", "username", "email"],
  campusId: ["campusid", "campus id", "id"],
};

/** True if a row's cells look like our column names rather than actual student data. */
function looksLikeHeaderRow(row: string[]): boolean {
  const cells = row.map((c) => c.trim().toLowerCase());
  const recognized = POSITIONAL_FIELDS.filter((field) =>
    HEADER_ALIASES[field].some((alias) => cells.includes(alias)),
  ).length;
  return recognized >= 2; // at least half the expected columns named explicitly
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
  const classUrl = absoluteUrl(`/admin/classes/${code}/roster`, request);
  if (!klass) return NextResponse.redirect(classUrl, 303);

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    classUrl.searchParams.set("error", "no-file");
    return NextResponse.redirect(classUrl, 303);
  }

  const text = await file.text();
  // Parse as plain rows first (no header assumption) so we can tell whether the file
  // actually has a header row before committing to one -- a file that opens straight
  // into data would otherwise silently lose its first row to a fictitious header.
  const { data: rawRows } = Papa.parse<string[]>(text, { skipEmptyLines: true });

  const hasHeader = rawRows.length > 0 && looksLikeHeaderRow(rawRows[0]);
  const headerRow = hasHeader ? rawRows[0].map((c) => c.trim().toLowerCase()) : null;
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

  function cellFor(row: string[], field: (typeof POSITIONAL_FIELDS)[number]): string {
    if (headerRow) {
      for (const alias of HEADER_ALIASES[field]) {
        const idx = headerRow.indexOf(alias);
        if (idx !== -1) return (row[idx] ?? "").trim();
      }
      return "";
    }
    return (row[POSITIONAL_FIELDS.indexOf(field)] ?? "").trim();
  }

  let imported = 0;
  let skipped = 0;

  for (const row of dataRows) {
    const firstName = cellFor(row, "firstName");
    const lastName = cellFor(row, "lastName");
    const emailUsername = cellFor(row, "emailUsername")
      .toLowerCase()
      .replace(/@.*$/, ""); // tolerate a full email address in the column too
    const campusId = cellFor(row, "campusId").toUpperCase();

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
