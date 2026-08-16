import { NextRequest, NextResponse } from "next/server";
import { buildAdminSessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  const loginUrl = new URL("/admin/login", request.url);

  if (!process.env.ADMIN_PASSWORD) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl, 303);
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, 303);
  }

  const cookie = await buildAdminSessionCookie();
  const res = NextResponse.redirect(new URL("/admin", request.url), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
