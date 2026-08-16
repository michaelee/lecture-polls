import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildStudentSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const emailUsername = String(form.get("username") ?? "")
    .trim()
    .toLowerCase();
  const campusId = String(form.get("password") ?? "")
    .trim()
    .toUpperCase();
  const next = String(form.get("next") ?? "/");

  const loginUrl = new URL("/login", request.url);
  if (next.startsWith("/")) loginUrl.searchParams.set("next", next);

  if (!emailUsername || !campusId) {
    loginUrl.searchParams.set("error", "missing");
    return NextResponse.redirect(loginUrl, 303);
  }

  const student = await prisma.student.findUnique({ where: { emailUsername } });
  if (!student || student.campusId.toUpperCase() !== campusId) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, 303);
  }

  const cookie = await buildStudentSessionCookie(student.id);
  const target = next.startsWith("/") ? next : "/";
  const res = NextResponse.redirect(new URL(target, request.url), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
