// Token storage + `next` validation. Edge-safe: no top-level browser access.
// Cookie name comes from lib/config.js (carry-over: same `masar_token`
// name for localStorage + cookie, see README).

import { ADMIN_ROLE, ROLE_COOKIE, TOKEN_COOKIE, TOKEN_KEY, OTP_TOKEN_KEY, RESET_TOKEN_KEY } from "./config";

export { TOKEN_KEY, OTP_TOKEN_KEY, RESET_TOKEN_KEY };

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
  document.cookie = `${TOKEN_COOKIE}=${jwt}; path=/; SameSite=Lax`;
  // ROLE_COOKIE must always be written/cleared together with TOKEN_COOKIE
  // (proxy.js fences /admin on it). No role (undefined/unknown) → write
  // nothing; the fence treats a missing role as non-admin.
  if (role === ADMIN_ROLE) {
    document.cookie = `${ROLE_COOKIE}=${ADMIN_ROLE}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE}=; path=/; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
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
