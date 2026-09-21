# Frunk

[![CI](https://github.com/mark-mcdermott/frunk/actions/workflows/ci.yml/badge.svg)](https://github.com/mark-mcdermott/frunk/actions/workflows/ci.yml)

Your personal vehicle management companion. Keep track of everything about your cars in
one place. Live at [frunk.cloud](https://frunk.cloud).

## What is Frunk?

Frunk is a vehicle management application for car enthusiasts and everyday drivers alike.
Whether you own one car or a whole collection, Frunk helps you stay organized and on top
of maintenance.

The name comes from "front trunk" — the storage compartment found in electric vehicles and
some mid-engine sports cars. Just like a frunk stores your essentials, the app stores
everything important about your vehicles.

## Features

- **Vehicle profiles** — make, model, year, VIN, mileage, a cover image and the 40-odd
  details a title or a listing asks for
- **Repair tracking** — log maintenance and repairs with dates, costs, mileage, receipts and
  the vendor who did the work
- **Vendors** — the shops and service providers you use, with their repair history
- **Notes** — attached to a vehicle, a repair, a vendor or another note
- **Photo galleries** — grouped by exterior, interior, details, or however you like
- **Maintenance schedules** — mileage and month intervals per vehicle, with the last time
  each was done
- **Documents** — receipts, titles and photos stored privately and served only to their
  owner
- **Try it first** — a demo is a real account with a sample garage cloned in; add a passkey
  later and everything you made comes with you

## Tech stack

- **Astro 7** with **React 19** islands, TypeScript
- **Tailwind CSS 4** and **shadcn/ui** (the Base UI flavoured `base-nova` style)
- **Neon** serverless Postgres via **Drizzle ORM**
- **Better Auth** — email + password, passkeys, TOTP recovery, anonymous demo accounts
- **Vercel** for hosting, **Vercel Blob** (private) for files, a Vercel cron for cleanup
- **Resend** for transactional email
- **Capacitor** shells for iOS and Android that load the deployed origin
- **Vitest** (API suite) and **Playwright** (browser journeys)

The previous SvelteKit version lives in [`legacy/`](legacy/) as a reference for the port
and is excluded from the build.

## Getting started

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL — a local server for development and tests, or a Neon database

### Installation

```bash
git clone https://github.com/mark-mcdermott/frunk.git
cd frunk
pnpm install
```

### Environment

Create a `.env` at the repo root. Only the database is required:

```bash
DATABASE_URL="postgresql://localhost/frunk_dev"
```

Everything else — `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`,
`RP_ID`/`RP_ORIGIN`, `CRON_SECRET` — is optional in development and documented in the
[Environment](docs/API.md#environment) section of the API doc, including the one that must
never be rotated.

### Database setup

```bash
createdb frunk_dev
psql frunk_dev -f drizzle/bootstrap.sql   # schema plus the three role rows, re-runnable
pnpm db:seed-office                       # sample data, and the template the demo clones
```

The full set of options (a paste into the Neon SQL Editor, a manual GitHub Action, or the
Drizzle commands after a schema change) is in [Database setup](docs/API.md#database-setup).

### Development

```bash
pnpm dev          # static pages, islands and /api/* on one origin
```

### Building

```bash
pnpm build
pnpm preview
```

A change is done when all four of these pass, which is also what CI runs:

```bash
pnpm check          # astro check — 0 errors
pnpm lint           # eslint — 0 errors
pnpm format:check   # prettier
pnpm build
```

### Testing

```bash
pnpm test:unit    # API integration suite — the ownership matrix per entity, over HTTP
pnpm test:e2e     # browser journeys — forms, uploads, passkeys and TOTP in real Chromium
```

Both start their own server and a throwaway `frunk_test` database, so a local Postgres is
all they need. The upload journeys run only when `BLOB_READ_WRITE_TOKEN` is present in
`.env.local` and skip otherwise. Two checkouts cannot run the harness at once; set
`TEST_DB` and `TEST_PORT` in one of them.

### Deployment

Pushes to `main` deploy to Vercel. Database changes never ride on a deploy: the
`Database migrate` workflow is manual, needs its own secret, and asks for the database
name before it writes. See the [port plan](docs/PORT-PLAN.md) for why.

### Mobile

```bash
pnpm cap:sync                                    # after a dependency change
pnpm cap:ios                                     # open the Xcode project
CAP_SERVER_URL=http://localhost:4321 pnpm cap:sync   # point a build at a dev server
```

The shells load the deployed site rather than bundling it. Passkeys work inside the iOS
shell through Associated Domains; the site-association file and the entitlement are in the
repo.

## Project structure

```
src/
├── pages/            # Astro routes: marketing and legal pages, /api/*, and one
│   │                 # catch-all per app section that mounts the applet
│   └── api/          # REST endpoints (docs/API.md); _lib/ holds the shared pieces
├── app/              # the signed-in applet: AppRoot (router + query client),
│   │                 # AppShell (chrome), routes/ (one component per screen),
│   │                 # api.ts (typed fetch layer), format.ts (units and dates)
├── components/       # Astro and React components; components/ui/ is shadcn's
├── layouts/
├── lib/
│   ├── server/       # server-only: db/, auth/, files.ts, email.ts, reaper.ts
│   └── auth-client.ts
└── styles/global.css # the design token layer
docs/                 # PORT-PLAN.md (roadmap), API.md, DESIGN.md, mocks/
tests/                # API suite (*.test.ts), e2e/ journeys, run.sh (the harness)
drizzle/              # migrations and the generated bootstrap.sql
ios/ android/         # Capacitor shells
legacy/               # the SvelteKit app, reference only
```

## The Frunk Story

This app has been a dream of mine for a few years now. It started as sort of fake app project just for me to work on my webdev skills. After a while I realized it was actually a decent idea and decided to try to build it for real.

For whatever reason, over the years I would build this app until it was about 75% done, then put it down for about 9 months and not touch it. Then I would decide to build it in a different framework and would get it to 75% done and the cycle would repeat. But recently when I realized how powerful Claude Code was, I decided to finish it for real.

## Roadmap

[`docs/PORT-PLAN.md`](docs/PORT-PLAN.md) is the roadmap: what was decided, what is done,
and what is left of the cutover.

- [x] Brand and UI redesign (the port, built to the mocks in `docs/mocks/`)
- [x] Platform migration — SvelteKit → Astro, Cloudflare → Vercel
- [x] Passkeys, TOTP recovery and the demo-as-real-account model
- [x] Maintenance schedules
- [x] Mobile shells (Capacitor) re-pointed at the new origin
- [ ] Passkeys inside the mobile shells (Associated Domains or a native plugin)
- [ ] Maintenance due badges on the vehicle list
- [ ] Premium tier

Dropped along the way: the merch store, the Tauri desktop apps and the hand-rolled
component system.

## License

MIT

## Author

[Mark McDermott](https://markmcdermott.io)
