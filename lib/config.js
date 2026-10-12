// Single config module — the ONLY place that reads process.env.
// Every other module imports from here. Edge-safe: no browser access
// at module top level (proxy.js imports this in middleware).
//
// Env vars (all NEXT_PUBLIC_* so client components can read them):
// - NEXT_PUBLIC_API_URL        active backend base URL
// - NEXT_PUBLIC_TOKEN_PREFIX   auth header prefix (default "osama";
//                              dev collection used "ososmeedo" — swap via env)
// - NEXT_PUBLIC_ENABLE_COUPONS "true"/"false" (default "true", schema now real)
// - NEXT_PUBLIC_ORDER_SHIPPING_FEE / NEXT_PUBLIC_ORDER_VAT (default 0)
// - NEXT_PUBLIC_CONTACT_URL    optional footer link (default "" = hidden)

// NOTE: every read below passes a STATIC `process.env.NEXT_PUBLIC_*`
// member expression (never `process.env[name]`). Next.js inlines
// NEXT_PUBLIC_* vars into the browser bundle by static analysis at
// compile time — dynamic access survives as a runtime lookup that
// resolves to undefined in the browser, silently forcing every fallback
// (this once pinned the storefront to localhost:3000 no matter what
// .env.local said).
function str(value, fallback) {
  return value === undefined || value === null || value === "" ? fallback : value;
}

function num(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Backend base URL. Dev default per new API docs. */
export const API_BASE_URL = str(
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:3000"
);

/** Auth header prefix: header is `token: <PREFIX><JWT>`. Env-overridable.
 * FOOTGUN: must match the backend you point at — local dev uses
 * "ososmeedo", prod uses "osama". Wrong value = every authed call 401s
 * with no obvious cause. */
export const TOKEN_PREFIX = str(process.env.NEXT_PUBLIC_TOKEN_PREFIX, "osama");

/** localStorage key + auth cookie name (naming carry-over, see README). */
export const TOKEN_KEY = "masar_token";
export const TOKEN_COOKIE = TOKEN_KEY;

/** Role mirror cookie for the proxy.js /admin fence. Written/cleared only
 * together with TOKEN_COOKIE (see lib/auth.js) — never a source of truth,
 * the profile response is. Edge-safe const like the rest of this module. */
export const ROLE_COOKIE = "masar_role";

/** Canonical admin role string. Use this instead of scattering "Admin"
 * literals through fencing/routing code (the register-form enum mirror
 * lives separately in lib/validation.js USER_TYPES). */
export const ADMIN_ROLE = "Admin";

/** Password-reset flow keys (sessionStorage: survives client navigation,
// cleared on tab close / completion / abandon). Centralized here so auth
// pages + AuthProvider share one source (ref key names preserved). */
export const OTP_TOKEN_KEY = "masar_otp_token";
export const RESET_TOKEN_KEY = "masar_reset_token";

/** Coupon UI gate. Default true now that the coupon schema is real. */
export const ENABLE_COUPONS = str(process.env.NEXT_PUBLIC_ENABLE_COUPONS, "true") === "true";

// TODO: shipping/VAT policy TBD — currently 0, docs example shows 30/30.
// One-line change here (or via env) when the rule is confirmed.
export const ORDER_SHIPPING_FEE = num(process.env.NEXT_PUBLIC_ORDER_SHIPPING_FEE, 0);
export const ORDER_VAT = num(process.env.NEXT_PUBLIC_ORDER_VAT, 0);

/** Optional footer contact link. Empty (default) = no link rendered. */
export const CONTACT_URL = str(process.env.NEXT_PUBLIC_CONTACT_URL, "");

/** Server-side fetch timeout (ms) for lib/serverApi.js. A hanging backend
 * must fail fast so it can't stall prerender/build forever. */
export const SERVER_FETCH_TIMEOUT_MS = num(
  process.env.NEXT_PUBLIC_SERVER_FETCH_TIMEOUT_MS,
  8000
);

// Dev-only one-time startup warning: a base URL on next dev's own default
// port almost always means the storefront fetches itself (HTML, not JSON).
// Warn only — the user may legitimately run the backend on 3000 with the
// frontend elsewhere. Server-side, development, and non-build only.
// globalThis flag survives Turbopack HMR re-evaluation: truly once per process.
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  try {
    const parsed = new URL(API_BASE_URL);
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocal && parsed.port === "3000" && !globalThis.__warnedSelfFetch) {
      globalThis.__warnedSelfFetch = true;
      console.warn(
        "[config] WARNING: NEXT_PUBLIC_API_URL points at localhost:3000, which is\n" +
          "next dev's default port. If the backend is not also on 3000, every API\n" +
          "call will fetch this frontend instead. Set it to the backend's actual\n" +
          "port (e.g. 3001) in .env.local."
      );
    }
  } catch {
    // Invalid URL — serverGet throws a clear error at call time; stay quiet here.
  }
}

// Client-side counterpart of the warning above: browser fetches (register,
// login, cart) never touch the server bundle, so surface the same hint in
// the browser console. Warning only, fires once, dev only.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    const parsed = new URL(API_BASE_URL);
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocal && parsed.port === "3000" && !globalThis.__warnedSelfFetchClient) {
      globalThis.__warnedSelfFetchClient = true;
      console.warn(
        "[config] WARNING: NEXT_PUBLIC_API_URL points at localhost:3000, which is\n" +
          "next dev's default port. If the backend is not also on 3000, every API\n" +
          "call will fetch this frontend instead. Set it to the backend's actual\n" +
          "port (e.g. 3001) in .env.local."
      );
    }
  } catch {
    // Invalid URL — apiFetch throws a clear error at call time; stay quiet here.
  }
}
