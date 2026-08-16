import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getRosterWithStats } from "@/lib/roster";
import { toCsv } from "@/lib/csv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  if (!klass) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const rows = await getRosterWithStats(klass.id);
  const csv = toCsv(
    ["firstName", "lastName", "emailUsername", "campusId", "pollsAnswered", "pollsMissed"],
    rows.map((r) => [
      r.firstName,
      r.lastName,
      r.emailUsername,
      r.campusId,
      r.answered,
      r.missed,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${klass.code}-roster.csv"`,
    },
  });
}
