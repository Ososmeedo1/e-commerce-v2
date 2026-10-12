// Single HTTP client. Base URL + auth prefix come from lib/config.js
// (read once at module init) — no hardcoded URLs or prefixes here.

import { API_BASE_URL, TOKEN_PREFIX } from "./config";
import { clearToken, getToken } from "./auth";

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Backend returns 400 for missing/invalid token on some routes.
const AUTH_400_PATTERN =
  /unauthoriz|unauthoris|invalid token|token.*invalid|not logged in|login required|please log ?in|jwt/i;

// Expired/invalid session on an authed call: drop the session, bounce to
// login with `next` preserved. window.location.assign (not next/navigation)
// because this fires outside React render. Never loops on /login itself.
function redirectToLogin() {
  if (typeof window === "undefined") return;
  clearToken();
  const here = window.location.pathname + window.location.search;
  if (!window.location.pathname.startsWith("/login")) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?next=${encodeURIComponent(here)}`);
  }
}

function toQueryString(params) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== null && v !== undefined && v !== "") sp.append(key, String(v));
      }
    } else {
      sp.append(key, String(value));
    }
  }
  return sp.toString();
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Works in server and client contexts (browser access is guarded).
// Server-side callers cannot read localStorage — authed server calls must
// obtain the token from the request/cookies themselves.
export async function apiFetch(
  path,
  {
    method = "GET",
    body,
    auth = false,
    params = null,
    signal,
    noRedirect = false,
    // Multipart escape hatch: pass a FormData `body` with rawBody:true.
    // Skips JSON.stringify + Content-Type so the browser sets the multipart
    // boundary itself. Auth header, ApiError, redirects, noRedirect unchanged.
    rawBody = false,
  } = {}
) {
  const base = API_BASE_URL;
  if (!base) {
    throw new Error(
      "API base URL is not set. Add NEXT_PUBLIC_API_URL to .env.local (see .env.example)."
    );
  }
  const url = new URL(base.replace(/\/$/, "") + path);
  if (params) {
    const qs = toQueryString(params);
    if (qs) url.search = qs;
  }

  const headers = {};
  if (auth) {
    const token = getToken();
    if (token) headers.token = `${TOKEN_PREFIX}${token}`;
  }

  const init = { method, headers, signal };
  if (body !== undefined) {
    if (rawBody) {
      // FormData passes through untouched (admin multipart creates/updates).
      init.body = body;
    } else {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url.toString(), init);
  const contentType = res.headers.get("content-type") || "";
  const parsed = await parseBody(res);

  if (!res.ok) {
    let message;
    let data = parsed;
    if (typeof parsed === "string") {
      // Non-JSON error body — almost always the frontend's own HTML page,
      // which means NEXT_PUBLIC_API_URL points at next dev instead of the
      // backend. Never parse or surface the HTML; give an actionable hint.
      // Full details go to the log only.
      console.error(
        `[apiFetch] non-JSON error body: ${method} ${url.toString()} → ` +
          `status ${res.status}, content-type ${contentType || "none"}. ` +
          `Preview: ${parsed.slice(0, 200)}`
      );
      message =
        `Backend returned HTML, not JSON (status ${res.status}). This usually means ` +
        `NEXT_PUBLIC_API_URL is pointing at the frontend's own dev server. ` +
        `Check that .env.local has the backend's real port and restart next dev.`;
      data = parsed ? { preview: parsed.slice(0, 200) } : null;
    } else {
      message =
        (parsed && typeof parsed === "object" && parsed.message) ||
        res.statusText ||
        `Request failed (${res.status})`;
    }
    const err = new ApiError(res.status, message, data);
    // Decorative callers (reviews list) opt out via noRedirect: a 401/403
    // from a non-session endpoint must never wipe the session. Default
    // (noRedirect=false) preserves the redirect behavior everywhere else.
    if (auth && !noRedirect && typeof window !== "undefined") {
      if (res.status === 401 || res.status === 403) {
        redirectToLogin();
      } else if (
        res.status === 400 &&
        AUTH_400_PATTERN.test(String(message))
      ) {
        redirectToLogin();
      }
    }
    throw err;
  }
  return parsed;
}
