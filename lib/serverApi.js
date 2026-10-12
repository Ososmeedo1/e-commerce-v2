import { ApiError } from "./api";
import { API_BASE_URL, SERVER_FETCH_TIMEOUT_MS } from "./config";

// Typed error for server-side backend fetches. `status` is the HTTP status,
// or 503 (unreachable) / 504 (timeout) / 502 (non-JSON body) when there is
// no usable HTTP response. Logged server-side at each page's degraded
// fallback — never surfaced raw to users.
export class ServerFetchError extends ApiError {
  constructor(status, message, data = null) {
    super(status, message, data);
    this.name = "ServerFetchError";
  }
}

// Body preview length for logs only (proves HTML/proxy page vs JSON).
const BODY_PREVIEW_LIMIT = 200;

// Server-only fetch helper for PUBLIC lists.
// NEVER sends an auth header. Authed callers must use lib/api.js
// in a client component instead.
//
// Defensive by design: checks transport, res.ok, and JSON content-type
// BEFORE parsing, so a backend outage (connection refused, timeout, HTML
// error/proxy page) throws a typed ServerFetchError instead of a raw
// SyntaxError. Server components catch it and render degraded state.
export async function serverGet(path, { params = null, revalidate = 60, tags } = {}) {
  if (typeof window !== "undefined") {
    throw new Error("serverApi must not run in the browser — use lib/api.js instead.");
  }
  const base = API_BASE_URL;
  if (!base) {
    throw new Error(
      "API base URL is not set. Add NEXT_PUBLIC_API_URL to .env.local (see .env.example)."
    );
  }
  const url = new URL(base.replace(/\/$/, "") + path);
  if (params) {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === "") continue;
      sp.append(key, String(value));
    }
    const qs = sp.toString();
    if (qs) url.search = qs;
  }

  const next = { revalidate };
  if (tags) next.tags = tags;

  let res;
  try {
    res = await fetch(url.toString(), {
      next,
      signal: AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    // Network down / refused / DNS, or the timeout fired.
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    throw new ServerFetchError(
      timedOut ? 504 : 503,
      timedOut
        ? `Backend request timed out: GET ${path}`
        : `Backend unreachable: GET ${path}`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok || !contentType.startsWith("application/json")) {
    // Parse JSON bodies only — never JSON.parse an HTML/proxy page.
    let parsed = null;
    if (contentType.startsWith("application/json") && text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }
    const message =
      (parsed && typeof parsed === "object" && parsed.message) ||
      (!res.ok
        ? res.statusText || `Request failed (${res.status})`
        : `Unexpected content-type (${contentType || "none"}) from backend`);
    const preview = text ? text.slice(0, BODY_PREVIEW_LIMIT) : "";
    throw new ServerFetchError(
      res.ok ? 502 : res.status,
      `${message}: GET ${path}`,
      preview ? { preview } : parsed
    );
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ServerFetchError(res.status, `Invalid JSON from backend: GET ${path}`, {
      preview: text.slice(0, BODY_PREVIEW_LIMIT),
    });
  }
}
