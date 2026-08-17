/**
 * Builds an absolute URL for redirects, preferring NEXT_PUBLIC_BASE_URL over the
 * incoming request's own origin.
 *
 * Behind a reverse proxy (Render, and most PaaS/container setups), the Host the app
 * process actually sees is the internal proxy target (e.g. localhost:10000), not the
 * public domain -- so request.url's origin can't be trusted for building redirect
 * targets in production. NEXT_PUBLIC_BASE_URL is the one source of truth for "what
 * URL is this app actually served at" (it's also what the QR codes are built from).
 */
export function absoluteUrl(path: string, request: Request): URL {
  const base = process.env.NEXT_PUBLIC_BASE_URL || request.url;
  return new URL(path, base);
}
