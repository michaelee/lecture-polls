import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signSession,
  verifySession,
  type AdminSessionPayload,
  type StudentSessionPayload,
} from "./session";

export const ADMIN_COOKIE = "admin_session";
export const STUDENT_COOKIE = "student_session";

const ADMIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const STUDENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months

type CookieOptions = {
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none";
  secure: boolean;
  path: string;
  maxAge: number;
};

const baseCookieOptions: Omit<CookieOptions, "maxAge"> = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Reads the current admin session from cookies (Server Components, Route Handlers). */
export async function getAdminSession() {
  const store = await cookies();
  return verifySession<AdminSessionPayload>(store.get(ADMIN_COOKIE)?.value);
}

/** Reads the current student session from cookies. */
export async function getStudentSession() {
  const store = await cookies();
  return verifySession<StudentSessionPayload>(store.get(STUDENT_COOKIE)?.value);
}

/** Builds the Set-Cookie options for a fresh admin session, for use in a Route Handler response. */
export async function buildAdminSessionCookie() {
  const value = await signSession({ role: "admin" }, `${ADMIN_MAX_AGE_SECONDS}s`);
  return {
    name: ADMIN_COOKIE,
    value,
    options: { ...baseCookieOptions, maxAge: ADMIN_MAX_AGE_SECONDS },
  };
}

/** Builds the Set-Cookie options for a fresh student session, for use in a Route Handler response. */
export async function buildStudentSessionCookie(studentId: string) {
  const value = await signSession(
    { role: "student", studentId },
    `${STUDENT_MAX_AGE_SECONDS}s`,
  );
  return {
    name: STUDENT_COOKIE,
    value,
    options: { ...baseCookieOptions, maxAge: STUDENT_MAX_AGE_SECONDS },
  };
}

/** For use in Server Component pages: redirects to /admin/login if not authed. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For use in Server Component pages: redirects to /login (preserving destination) if not authed. */
export async function requireStudent(nextPath?: string) {
  const session = await getStudentSession();
  if (!session) {
    redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  }
  return session;
}
