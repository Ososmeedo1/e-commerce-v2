# Quickstart (zero → running in < 2 min)

Prereqs: Node 20+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3100 (or :3000 if free)
```

Pick your backend in `.env.local` (default = prod):

```bash
# Local dev backend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TOKEN_PREFIX=ososmeedo
# Prod backend
# NEXT_PUBLIC_API_URL=https://ecommerce-backend-orpin-five.vercel.app
# NEXT_PUBLIC_TOKEN_PREFIX=osama
```

> The backend and next dev must run on different ports.
> Backend on 3001, frontend on 3000 (defaults) works out of the box.
> If your backend .env sets PORT=3000, change one of them.

> Wrong prefix = every authed call 401s. Local → `ososmeedo`, prod → `osama`.

Health gate: `npm run check` (no-ts → lint → build).
Full map: `README.md` (Setup, Env vars, Routes, Assumptions, Open items).
