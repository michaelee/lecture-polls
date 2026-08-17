import { NextRequest, NextResponse } from "next/server";
import { buildAdminSessionCookie } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  const loginUrl = absoluteUrl("/admin/login", request);

  if (!process.env.ADMIN_PASSWORD) {
    loginUrl.searchParams.set("error", "config");
    return NextResponse.redirect(loginUrl, 303);
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    loginUrl.searchParams.set("error", "invalid");
    return NextResponse.redirect(loginUrl, 303);
  }

  const cookie = await buildAdminSessionCookie();
  const res = NextResponse.redirect(absoluteUrl("/admin", request), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
