import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData();
  const rawCode = String(form.get("code") ?? "");
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const name = String(form.get("name") ?? "").trim() || null;
  const term = String(form.get("term") ?? "").trim() || null;

  const adminUrl = absoluteUrl("/admin", request);

  if (!code) {
    adminUrl.searchParams.set("error", "missing-code");
    return NextResponse.redirect(adminUrl, 303);
  }

  try {
    await prisma.class.create({ data: { code, name, term } });
  } catch {
    adminUrl.searchParams.set("error", "duplicate-code");
    return NextResponse.redirect(adminUrl, 303);
  }

  return NextResponse.redirect(adminUrl, 303);
}
