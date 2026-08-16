import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getLiveResults } from "@/lib/results";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const klass = await prisma.class.findUnique({ where: { code: code.toUpperCase() } });
  if (!klass) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const results = await getLiveResults(klass.id);
  return NextResponse.json(results);
}
