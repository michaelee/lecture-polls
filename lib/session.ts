import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is not set");
  }
  return encoder.encode(secret);
}

export type AdminSessionPayload = { role: "admin" };
export type StudentSessionPayload = { role: "student"; studentId: string };
export type SessionPayload = AdminSessionPayload | StudentSessionPayload;

/** Signs a session payload into a compact JWS string, suitable for a cookie value. */
export async function signSession(
  payload: SessionPayload,
  expiresIn: string,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/** Verifies and decodes a session cookie value. Returns null if missing/invalid/expired. */
export async function verifySession<T extends SessionPayload>(
  token: string | undefined,
): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as T;
  } catch {
    return null;
  }
}
