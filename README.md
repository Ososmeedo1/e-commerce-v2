# E-commerce frontend (new API contract)

Next.js 16 + React 19 storefront wired to the API documented in `API_docs/Ecommerce`
(Bruno collection). UI/structure mirrors the reference build; every request,
type, and env var follows the new docs only.

## Contents

- Setup
- Env vars
- API layer
- Token storage + cookie mirror
- Routes
- Naming carry-overs
- Reserved for future admin UI
- Assumptions
- Known open items
- Known warnings
- Scripts
- How to point at a different backend

## Setup

> **First: match the token prefix to your backend, or nothing authed will work.**
> Local dev backend → `NEXT_PUBLIC_TOKEN_PREFIX=ososmeedo`;
> prod backend → `osama` (default). Wrong value = every authed call 401s
> with no obvious cause. Set it in `.env.local` before `npm run dev`.

> **Second: put the backend on a different port than next dev, or the
> storefront fetches itself.**
> next dev defaults to 3000; run the backend on 3001 and set
> `NEXT_PUBLIC_API_URL=http://localhost:3001` in `.env.local`. Same-port
> setup = every API call returns the frontend's own HTML instead of JSON.

```bash
npm install
cp .env.example .env.local   # adjust per environment
npm run dev                  # http://localhost:3000 (app) — backend goes on :3001, see above
npm run lint
npm run build
```

Requires `NEXT_PUBLIC_API_URL` (see `.env.example`).

## Env vars (all `NEXT_PUBLIC_*`, all read in `lib/config.js` only)

| Var | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Local backend on 3001 (must differ from next dev's 3000). Prod (`http://ecommerce-backend-orpin-five.vercel.app`) commented in `.env.example`. |
| `NEXT_PUBLIC_TOKEN_PREFIX` | `osama` | Header is `token: <PREFIX><JWT>`. Dev collection used `ososmeedo` — swap via env. |
| `NEXT_PUBLIC_ENABLE_COUPONS` | `true` | Coupon UI gate (schema now real). |
| `NEXT_PUBLIC_ORDER_SHIPPING_FEE` / `NEXT_PUBLIC_ORDER_VAT` | `0` | Policy TBD (docs example shows 30/30). |
| `NEXT_PUBLIC_CONTACT_URL` | `` (empty) | Optional footer link. Empty = no link rendered. |

## API layer

- `lib/config.js` — sole `process.env` reader. Exports `API_BASE_URL`, `TOKEN_PREFIX`,
  `TOKEN_KEY`/`TOKEN_COOKIE` (`masar_token` carry-over, see below), `ENABLE_COUPONS`,
  `ORDER_SHIPPING_FEE`, `ORDER_VAT`, `CONTACT_URL`.
- `lib/api.js` — `apiFetch()` + `ApiError`. Attaches `token: <PREFIX><JWT>`,
  redirects to `/login?next=...` on 401/403 (or auth-shaped 400); `noRedirect`
  opt-out for decorative calls.
- `lib/serverApi.js` — `serverGet()` for public lists (products, categories,
  subcategories, brands, coupons). Never sends auth.
- `lib/endpoints.js` — consumer path builders (`domainVerbNoun`). Method + auth
  live with the caller.
- `lib/admin.js` — ADMIN services only (see below). No UI imports it.
- `lib/auth.js` — token storage (`localStorage` + cookie mirror), `safeNext()`,
  OTP/reset session keys.
- `lib/format.js` — formatting, `friendlyError`, `serverFormError` /
  `fieldErrorsFromStack` (new `{message, stack?}` shape), coupon pure helpers
  (`findCouponByCode`, `couponUsability`, `couponDiscountFor`).
- `lib/catalog.js` — sort options shared by server + client.
- `lib/validation.js` — central client validation (password policy, age 12–100,
  Egyptian mobile) shared by register, reset-password, and profile edit.
- `proxy.js` — route fence (`/products/:id`, `/cart/*`, `/checkout/*`,
  `/orders/*`, `/account/*`, `/login`, `/register`); cookie name from config.

## Token storage + cookie mirror

- JWT lives in `localStorage` (`masar_token`) for `apiFetch` (`lib/api.js`).
- `setToken()`/`clearToken()` (`lib/auth.js`) mirror it to a same-named
  `SameSite=Lax` cookie so `proxy.js` can fence routes server-side.
- The cookie is NOT httpOnly (JS must set/clear it); it holds only the JWT,
  is never logged, and is cleared on 401/403, auth-shaped 400s, and logout.
- Password-reset keys (`masar_otp_token`, `masar_reset_token`) live in
  `sessionStorage` (tab-scoped, cleared on completion/abandon/logout).

## Routes (17, fixed — do not add/remove without plan approval)

`/`, `/login`, `/register`, `/forgot-password`, `/verify-otp`,
`/reset-password`, `/products`, `/products/[id]`, `/brands`, `/categories`,
`/subcategories`, `/cart`, `/checkout`, `/orders`, `/orders/[id]`,
`/account`, `/account/addresses`.

### Register: userType is exposed by design

The backend enum is { Buyer, Admin }. The register form shows both to
demonstrate the full contract. In production this would be restricted
to Buyer only on the public route — see the open item flagged for the
backend owner in Known open items below.

## Naming carry-overs (deliberate, not API reuse)

- Cookie + `localStorage` key stay `masar_token` to match the storage convention.
- No imports from the reference path; no old base URLs in source
  (`API_docs` + `.env.example` + this README are the only places that name them).

## Reserved for future admin UI (services only, no routes/components)

`deliverOrder`, `moderateReview`, product/category/subcategory/brand/coupon
CRUD + single-getters — all in `lib/admin.js` behind an `ADMIN` header.

## Assumptions

- Token prefix default `osama`, env-overridable. Header is
  `token: <PREFIX><JWT>` (no space, no Bearer). Dev backend uses `ososmeedo`.
- Backend auth failures are non-standard: missing token → `400 "Not logged in"`,
  bad credentials → `400 "Invalid Credentials"` (not 401). `lib/api.js`
  redirects to `/login?next=...` on 401/403 AND auth-shaped 400s; if the
  backend later switches to 401 the client still works.
- Prod base URL kept as `http://` per docs; flagged as TODO.
- `shippingFee` and `VAT` sent as `0`; flagged as TODO.
- Register always sends `userType: "Buyer"` (backend requires it); age 12–100
  and Egyptian mobile enforced client-side (`lib/validation.js`) to mirror
  `user.schema.js`. Email TLDs limited to com/net/org by the backend — left
  to the server message.
- Profile edit sends only changed fields, whitelisted to username/phone/age
  (subset of the update schema); empty/unchanged values are dropped.
- Checkout sends a free-text `address` string (backend also accepts
  `addressId`, unused by design); saved addresses quick-fill the field.
- `POST /orders/add` stores `couponId`, it does not echo `couponCode` — the
  client only reads the order `_id` from the response.
- Coupon discount computed client-side from the real coupon schema
  (Fixed → subtract amount; Percentage → `subtotal * amount / 100`).
  Backend quirk (not worked around): a not-yet-started coupon passes
  server validation; the client usability guard blocks it first.
- Admin endpoints implemented as services, no UI.
- Reviews list is Admin-only server-side (buyers get 401) → buyers see the
  moderated notice; guests see a notice without a network call. List shape
  carries no `total` — "load more" is length-based.
- Empty review/coupon/order lists return `{message, data: []}` (no
  `page`/`total`) = "empty", not an error.
- Cancel action only when `orderStatus === "placed"`; cancel is `GET`
  `/orders/cancel/:id`.
- `PATCH /carts/remove/:id` returns `{message}` only → refetch cart on success.

## Troubleshooting

### Register / API call shows "Not Found" or returns HTML

Cause: `NEXT_PUBLIC_API_URL` points at the frontend's own dev server
(usually `localhost:3000`, which next dev occupies).

Fix:
1. Ensure `.env.local` has the backend's real port (e.g. 3001).
2. Restart next dev — env vars are baked at start.
3. Hard-refresh the browser.
4. Verify the backend is alive: `curl -i http://localhost:3001/brands/`

Why: env vars prefixed `NEXT_PUBLIC_` are inlined at build time, so
changing `.env.local` without restarting the dev server has no effect.
Caveat: inlining only works for static `process.env.NEXT_PUBLIC_*`
member access — dynamic `process.env[name]` silently falls back in the
browser (this once pinned the storefront to localhost:3000; see the NOTE
in `lib/config.js`).

### Instant Navigation validator warning on /admin/* (dev-only noise)

`Route "/admin/...": Could not validate that a segment in your UI has
instant navigation. Dropped segment: app/admin/<page>.js.` This is
expected: the admin layout guard deliberately skips `{children}` while
loading or for non-admins. The documented opt-out (`export const
instant = false`) does NOT apply here — route segment config is only
legal in Server Component modules, and every admin segment is a client
component (auth lives in localStorage). Attempted once; Next.js rejects
it with a hard error, so it was reverted. The warning is dev-only,
`npm run check` stays green, and production is unaffected. Do not
restructure the guard to render `{children}` unconditionally just to
silence it (that would flash admin UI to non-admins).

## Admin demo

1. Register on the public form with userType = Admin.
2. Log in. You land on /admin.
3. Overview shows live counts + new arrivals.
4. Reviews → moderate. Products → inspect + delete. Coupons → create.
5. Log out clears both `masar_token` and `masar_role` cookies.

Note the backend allows step 1 because POST /users/register doesn't gate
Admin — the same finding flagged for the backend owner below. The dev DB
currently holds two clearly-labeled demo coupons (`DIAGFIX10`,
`DIAGPCT15`); coupons have no delete endpoint, so remove them via Mongo
when done demoing.

## Roadmap (v2 — designed, deferred)

- Admin orders view — blocked on backend (no all-orders endpoint;
  `GET /orders/` is user-scoped; the deliver action exists but has no
  list to drive it).
- Admin users view — blocked on backend (no user-list endpoint).
- Product create/edit — multipart image-upload flow (up to 10 images).
- Category / subcategory / brand CRUD (multipart forms).
- Coupon edit (`PUT /coupons/update/:couponId` exists and is documented).
- Coupon delete — needs backend endpoint (none exists).
- Per-user coupon limits (`Users[]` UI; the create form sends `[]` today).

## Known open items

- [BLOCKER for backend owner] `GET /orders/deliver/:orderId` has no ownership or role check — any authenticated caller can mark any order delivered by id. No admin UI drives it in v1 for exactly this reason.
- [BACKEND OWNER] `PUT /coupons/update/:couponId` wires `validationMiddleware` before `auth()` — inconsistent with every other coupon route (auth-first). Backend-only note, no client impact.

- [BACKEND OWNER] Review list populate selects `userName`, which does not exist on the User model (field is `username`) — populated `userId`/`productId` often come back as bare ids. The admin reviews UI renders ids defensively; no client fix possible until the backend corrects the select.

- [BACKEND OWNER] Backend `.env` sets `PORT=3000` by default, which collides with next dev's default port — any contributor who starts both without overrides gets a storefront that fetches itself. Recommend the backend default move to 3001; until then the frontend docs (Setup, QUICKSTART, `.env.example`) carry the split-port warning.
- [BACKEND OWNER — production concern] POST /users/register accepts userType: "Admin" from unauthenticated callers with no server-side gate. This portfolio build intentionally exposes the full enum on the register form to demonstrate the contract (see Utils/enum.utils.js); a production storefront must either reject Admin on the public route or move admin provisioning behind an authenticated endpoint.
- [BLOCKER for backend owner] userType is required and has no default — confirmed via Joi (user.schema.js:12) and Mongoose (user.model.js:28-32). The client sends Buyer explicitly; a future backend default would not change the client, but is worth adding server-side so a raw API call without userType fails loudly rather than silently.
- Backend marks username/age/phone optional on register; frontend requires them. Confirm which is intended before loosening.
- Confirm `https` for the prod base URL (docs state `http`; do NOT silently upgrade).
- Confirm shipping/VAT rule (currently `0`; docs example shows 30/30).
- Confirm validation `stack` field shapes beyond Joi-style details (parser
  handles string, Joi-array, and message-only; error contract observed live
  as `{message, error, stack}` with `stack: null` on business errors).
- Checkout address: free-text string kept per directive (backend `addressId`
  support exists but is intentionally unused); quick-fill added in 3.9.
- PUT /users/update whitelist: client sends only edited username/phone/age;
  full schema accepts more — no change needed unless the form grows.
- Auth fallbacks (Q15): bad credentials 400 → inline "Invalid email or
  password"; unknown email / wrong OTP / expired reset token → generic
  `serverFormError` message. Revisit only if backend standardizes on 401.
- Password policy (Q12): centralized in `lib/validation.js` (min 8, exact
  backend charset `[A-Za-z\d@!%*?&#]`), reused on register + reset.
- Coupon fixtures: two clearly-labeled demo coupons (`DIAGFIX10`,
  `DIAGPCT15`) created during admin smoke tests — see Admin demo above
  for removal (no delete endpoint exists).
- `GET /reviews` requires admin auth in the current backend, so buyers get
  401 → the moderated-notice UX is intentional and matches that reality
  (logged-in buyers see it too, not just guests).
- `POST /orders/add` stores `couponId` and does not echo `couponCode`; also,
  a not-yet-started coupon passes the server check (backend bug) even though
  the client rejects it locally. The client's `couponUsability` check is the
  effective guard until the backend is fixed.

## Known warnings

- `MODULE_TYPELESS_PACKAGE_JSON` (build/lint): benign and pre-existing —
  `package.json` has no `"type"` field while Next/Node loads ESM; no action needed.

## How to point at a different backend

Change only these two vars (`.env.local`, never code):

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_TOKEN_PREFIX=osama
```

Rules: no trailing slash on the URL; prefix has no separator
(`token: <PREFIX><JWT>`). Dev collection? Set the prefix to `ososmeedo`.
Everything else (`lib/*`, `proxy.js`, pages) follows automatically.

## Scripts

| Command | What it proves |
|---|---|
| `npm run dev` | Local dev server (see Setup for the prefix footgun). |
| `npm run lint` | ESLint clean. |
| `npm run build` | Production build succeeds. |
| `npm run check:no-ts` | No TypeScript artifacts in source dirs. |
| `npm run check` | Full health gate: `check:no-ts` → `lint` → `build`, in order. |
