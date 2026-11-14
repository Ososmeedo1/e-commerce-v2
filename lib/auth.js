// Token storage + `next` validation. Edge-safe: no top-level browser access.
// Cookie name comes from lib/config.js (carry-over: same `masar_token`
// name for localStorage + cookie, see README).

import { ADMIN_ROLE, ROLE_COOKIE, TOKEN_COOKIE, TOKEN_KEY, OTP_TOKEN_KEY, RESET_TOKEN_KEY } from "./config";

export { TOKEN_KEY, OTP_TOKEN_KEY, RESET_TOKEN_KEY };

// The JWT itself has no `exp`, and localStorage keeps it forever. The cookie
// mirror must not be a session-only cookie, or closing the browser leaves the
// app "logged in" (localStorage) while proxy.js sees no session and bounces
// protected routes to /login. Keep both stores on the same 30-day lifetime.
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function getToken() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(jwt, role) {
  try {
    window.localStorage.setItem(TOKEN_KEY, jwt);
  } catch {
    // Storage unavailable — cookie mirror below still lets proxy.js fence.
  }
  // Mirror to cookie so proxy.js can fence routes server-side.
  // SameSite=Lax (not httpOnly — JS must set/clear it; tradeoff: any page JS
  // can read it, so we never store anything more sensitive than this JWT,
  // never log it, and clear it on 401/403 + logout).
  document.cookie = `${TOKEN_COOKIE}=${jwt}; path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  // ROLE_COOKIE must always be written/cleared together with TOKEN_COOKIE
  // (proxy.js fences /admin on it). No role (undefined/unknown) → write
  // nothing; the fence treats a missing role as non-admin.
  if (role === ADMIN_ROLE) {
    document.cookie = `${ROLE_COOKIE}=${ADMIN_ROLE}; path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Post-auth navigation. Use instead of router.replace() after login,
 * registration, or a cookie repair.
 *
 * proxy.js fences protected routes on the token cookie, but Next's client
 * router caches the result of a client-side navigation — including the 307
 * proxy.js returned when the cookie was missing. A later router.replace() to
 * the same route replays that cached redirect without a network request, so a
 * freshly authenticated user stays stuck on /login. A full document load
 * bypasses the client router cache, sends the freshly written cookie, and
 * discards cached redirects for every other fenced route too.
 */
export function navigateAfterAuth(href) {
  if (typeof window === "undefined") return;
  window.location.replace(href);
}

export function clearToken() {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore — cookie expiry below still fences out.
  }
  if (typeof document !== "undefined") {
    document.cookie = `${TOKEN_COOKIE}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    // Paired clear: a stale role cookie must never outlive the session.
    document.cookie = `${ROLE_COOKIE}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/** Browser-side role read (cookie mirror). Layout/navbar convenience only —
 * AuthProvider state is the source of truth wherever context is available. */
export function getRole() {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ROLE_COOKIE}=`));
  const value = match ? match.slice(ROLE_COOKIE.length + 1) : "";
  return value === ADMIN_ROLE ? ADMIN_ROLE : null;
}

export function isAuthed() {
  return Boolean(getToken());
}

// Open-redirect guard for `?next=` (login/register redirects + proxy.js).
// Accepts ONLY internal absolute paths. Returns `fallback` otherwise.
export function safeNext(raw, fallback = "/") {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("\\")) return fallback;
  const q = raw.indexOf("?");
  const head = q === -1 ? raw : raw.slice(0, q);
  const rest = head.slice(1);
  const slash = rest.indexOf("/");
  const firstSegment = slash === -1 ? rest : rest.slice(0, slash);
  if (firstSegment.includes(":")) return fallback;
  return raw;
}
