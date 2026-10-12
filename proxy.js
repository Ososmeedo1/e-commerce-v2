import { NextResponse } from "next/server";
import { safeNext } from "./lib/auth";
import { ADMIN_ROLE, ROLE_COOKIE, TOKEN_COOKIE } from "./lib/config";

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const role = request.cookies.get(ROLE_COOKIE)?.value;
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  // Admin fence first: role mirror cookie, never the JWT (which carries id only).
  if (isAdminRoute) {
    if (!token) {
      const next = encodeURIComponent(pathname + search);
      return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
    }
    if (role !== ADMIN_ROLE) {
      // Logged in, just not admin — home, not login (no session problem).
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    if (isAuthPage) return NextResponse.next();
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/login?next=${next}`, request.url));
  }

  // Logged-in users don't need the forms: bounce to validated `next` or `/`.
  if (isAuthPage) {
    const raw = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(safeNext(raw, "/"), request.url));
  }

  // Presence fence only — no JWT parsing. The API is the real gate
  // (401/403 handling lives in lib/api.js).
  return NextResponse.next();
}

// NOTE: `/products` (LIST) is PUBLIC — only `/products/<one-segment>` is
// fenced. `/products/:id` requires the segment, so exact `/products`
// (with or without query) never matches.
export const config = {
  matcher: [
    "/products/:id",
    "/cart/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/account/:path*",
    "/login",
    "/register",
    "/admin/:path*",
  ],
};
