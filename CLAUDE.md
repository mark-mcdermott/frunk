# Frunk

Personal vehicle management app — store documents, repairs, vendors, notes, photo
galleries and maintenance schedules for your cars. Live at **frunk.cloud**.
Also known as **drivetracks** (older name for the same project).

Named for "front trunk" — the storage compartment in EVs and mid-engine cars.

## ⚠️ Mid-port

The repository root is now the **Astro rewrite** (`docs/PORT-PLAN.md`), not the SvelteKit
app. The SvelteKit app lives in **`legacy/`** — it is the reference for the port and is
excluded from the Astro build and typecheck. It still deploys to Cloudflare Pages from
`main` and stays live until Phase 6.

**Phases 0–3 are done.** Phase 4 (the React applet) is next. Read
`docs/PORT-PLAN.md` before doing anything here; it records what is settled and what is
outstanding.

## Stack (the port target, at the repo root)

- **Astro 7** with **React 19** islands, TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (`components.json` is configured; no components added yet)
- **Neon** serverless Postgres via **Drizzle ORM**
- **Vercel** (`@astrojs/vercel`), **Vercel Blob** for file storage
- **Better Auth** for auth (Decision 2) — email+password, passkeys, TOTP recovery and
  anonymous (demo) accounts, replacing ~900 lines of hand-rolled ceremonies
- **Resend** for transactional email — the contact form (Phase 5) and, once Decision 2's
  Better Auth rework lands, verification mail. Both behind one `src/lib/server/email.ts`.
  Supersedes AWS SES, which was never wired into this app
- **Capacitor** (iOS/Android) stays in scope, re-pointed in Phase 6

Dropped for now: the merch store (Stripe + Printful), Tauri desktop, Skeleton UI.

## Legacy stack (`legacy/`, still live on Cloudflare)

- **SvelteKit 2** + **Svelte 5** (runes), **Skeleton UI v4**
- **Cloudflare Pages** (`@sveltejs/adapter-cloudflare`), **R2** for file storage
- **Playwright** for e2e

## Commands

```bash
pnpm dev                 # astro dev — static pages, islands and /api/* in one process
pnpm build               # astro build (must pass)
pnpm check               # astro check — must report 0 errors
pnpm test:unit           # API integration suite (starts its own server + database)
pnpm preview             # astro preview

pnpm db:generate         # regenerate drizzle/*.sql after a schema change
pnpm db:bootstrap-sql    # then regenerate drizzle/bootstrap.sql from it
pnpm db:push             # apply the schema to DATABASE_URL
pnpm db:seed-roles       # required once per database — ROLE_IDS hardcodes 1/2/3
pnpm db:seed-office      # sample data; also the template POST /api/demo clones
```

### Which database is which

Settled 2026-09-19, after a long hunt caused by this being undocumented. One Neon project,
**`frunk`**, in the personal Neon console — the same shape as every other project here. Two
branches, both carrying the full schema:

| branch | endpoint | used by |
|---|---|---|
| `production` | `ep-wild-glitter-a4wusipf` | **Vercel** — `DATABASE_URL`, Production + Preview |
| `development` | `ep-odd-credit-a42d9jqu` | **local `.env`** |

`DATABASE_URL` in Vercel is **hand-set and Sensitive**, not integration-managed. The Vercel
Marketplace Neon integration was deliberately removed: it had provisioned a *third*,
invisible database (`neon-byzantium-paddle`, Neon id `soft-wave-99827797`) that production
actually used, that never appeared in the Neon console, and that no one had bootstrapped —
which is why signup returned 500 for weeks while two perfectly good databases sat ready.
Removing it also dropped 18 integration-managed env vars, 8 of them credential-bearing.

**Local and deployed are deliberately different branches.** `pnpm db:push` from a laptop
cannot reach production — that separation is the point, and it is the accident recorded in
"An accident worth recording" in `docs/PORT-PLAN.md`. Both branches are bootstrapped
identically, so a schema change means applying it to both.

**`getDb()` picks its driver from the `DATABASE_URL` hostname** — `.neon.tech` gets Neon's
HTTP protocol, anything else gets node-postgres over TCP. So the whole API runs against a
throwaway local Postgres: `psql frunk_dev -f drizzle/bootstrap.sql`, then
`DATABASE_URL=postgresql://localhost/frunk_dev pnpm dev`. `drizzle/bootstrap.sql` is a
generated, re-runnable schema-plus-roles file; it is also what you paste into the Neon SQL
Editor when you have no terminal. See "Database setup" in `docs/API.md`.

`pnpm install` is required after any gap — dependencies drift and the build fails
misleadingly when `node_modules` is stale.

The legacy commands (`pnpm test`, `db:push`, `cap:*`) still live in `legacy/package.json`
and run from that directory with its own `pnpm install`.

## Verify loop

A change is done when **`pnpm check` reports 0 errors** and **`pnpm build` passes**.

`pnpm test:unit` runs the API integration suite (Decision 11) — the four-case ownership
matrix per entity, over HTTP against a throwaway `frunk_test` database. `tests/run.sh`
owns the server and database; read its header before changing it, because Astro's dev
server fails silently in two separate ways under Vitest.

These tests touch no markup, which is the point: they survive the Phase 4 rewrite and are
the safety net for it. The 7 Playwright suites in `legacy/e2e/` are SvelteKit-specific and
do not survive; component and e2e layers are still to come.

CI (`.github/workflows/ci.yml`) is still typecheck and build only — the suite is not wired
into it yet, and Decision 11 calls for a Neon branch per run when it is.

**No automatically-triggered workflow may touch a database.** The `e2e.yml` it replaced ran
`drizzle-kit push --force` on every push to every branch, against the secret that points at
the *legacy* database, and duly rewrote the live app's schema from this branch. See
"An accident worth recording" in `docs/PORT-PLAN.md`. Migrations go through
`db-migrate.yml`: manual only, its own `ASTRO_DATABASE_URL` secret, refuses to run on `main`.

## Architecture (the port target)

- `src/pages/` — Astro routes. Static `.astro` for marketing and legal; `/api/*` as Astro
  endpoints; the app mounts as a single `client:only` React island under `[...slug].astro`.
- `src/components/` — Astro components and, from Phase 4, React. `src/components/ui/` is
  shadcn's target directory.
- `src/layouts/`, `src/styles/global.css` (the design token layer), `src/lib/`.
- `src/pages/api/_lib/` — shared API pieces; the underscore keeps them out of routing.
  `session.ts` (cookie → user), `guard.ts` (`requireSession`, `ownedVehicle`, …),
  `http.ts` (`json`/`fail`/`handler`/`readJson`), `schemas.ts` (zod request bodies).
- `src/lib/server/` — server-only: `db/schema.ts`, `db/index.ts`. Never import from client code.

**The REST surface is documented in `docs/API.md`.** Read it before adding an endpoint.
Two rules it encodes: ownership goes in the `WHERE` clause, never a post-fetch comparison
(so another user's row is a 404, not a 403); and PATCH is genuinely partial, where an
omitted key is left alone and an explicit `null` clears the column.

**Auth is Better Auth** (Decision 2). Everything mounts at one catch-all,
`src/pages/api/auth/[...all].ts`; the config is `src/lib/server/auth/config.ts`. Email and
password are enabled alongside passkeys, TOTP recovery and anonymous accounts.
`docs/API.md` has the entity contract.

**`user.id` (text) is the identity.** `user.uuid` is gone — it was a second identity
beside `id serial`, and every entity's `user_id` targets `user.id` now.

Five things about it are easy to get wrong:

- **`getAuth()` builds one instance per request origin, and that is deliberate.** The
  passkey plugin takes a *static* `rpID`/`origin`, but nothing static covers Vercel's
  per-deploy preview hostnames, so `relyingParty()` still derives them from the request
  when `RP_ID` / `RP_ORIGIN` are unset. A wrong relying party does not fail loudly; it
  mints passkeys that can never sign in.
- **Verification mail is a background task.** A failed send is logged and the request
  still answers 200 — the account exists, no verification row is written, and the user
  sees success. That is why sign-up ends at "Check your email" with a **resend** button,
  and why `sendEmail` throwing does not abort registration the way its own comment once
  claimed.
- **Better Auth is anti-enumeration on both endpoints.** Sign-in gives an identical error
  for known and unknown addresses, and sign-up with an existing address returns 200 while
  creating nothing. Stricter than the deliberate 404 this replaced — but it strands a
  returning user on "Check your email" with no account and no mail.
- **A demo account is a real account** (Decision 5). The `anonymous` plugin creates the
  user and session; `cloneDemoAccount(userId)` only copies the template garage in. That
  split is what makes conversion free — attaching a credential upgrades the same row.
  `roles` stays authoritative for gating; `isAnonymous` is the plugin's bookkeeping.
  `POST /api/demo` needs `pnpm db:seed-office`.
- **Better Auth encrypts TOTP secrets and backup codes at rest**, so
  `src/lib/server/auth/secrets.ts` and `ENCRYPTION_KEY` are now dead code. Verify before
  deleting whether that encryption derives from `BETTER_AUTH_SECRET` — if it does,
  rotating that secret orphans every recovery method rather than just logging people out.

**Island classification rule:** does a live browser runtime need to exist for this to
render? Yes → `client:only`. No → `client:load` / `client:visible`. Cross-island state is a
**nanostore, not React context** — each island is its own React root.

**Auth boundary is drawn at the API, not the page.** Astro serves the same static HTML to
everyone; the applet decides what to render; every API handler checks the session itself.

## Legacy architecture (`legacy/`)

- `legacy/src/routes/` — file-based routes. Marketing pages (`about`, `pricing`, `contact`, `legal`),
  the app (`vehicles`, `vendors`, `repairs`, `notes`, `users`), the store (`merch`), and
  `demo/` which mirrors the app against seeded sample data for logged-out visitors.
- `legacy/src/lib/server/` — server-only: `auth.ts`, `db/`, `email.ts`, `password.ts`, `stripe.ts`,
  `printful.ts`. Never import these from client code.
- `legacy/src/lib/components/` — shared UI. `pages/` holds full page bodies shared between the real
  app and its `demo/` twin, so a change to a list or detail view must be made once there
  rather than duplicated.
- `legacy/src/lib/utils/` — framework-free helpers (`demoRoutes.ts`, `dom.ts`).
- `legacy/src/hooks.server.ts` — resolves the session cookie into `locals.user` / `locals.session`
  on every request.

**Auth** was hand-rolled session auth: opaque token in an `auth-session` cookie, sessions
table in Postgres, sliding expiry, SES for verification email. The port keeps the session
half and replaced everything in front of it with passkeys (see above).

**Demo mode** — routes under `demo/` reuse the same page components with `basePath` set, so
links stay inside the demo. Check `isDemoPath` / `demoPath` in `src/lib/utils/demoRoutes.ts`
before hardcoding any route.
(Decision 5 retires the `demo/` route tree: a demo visitor becomes a real `DEMO`-role
account, so the API never needs to know.)

## Design

The redesign is specified in **`docs/DESIGN.md`**, derived from the mocks committed in
**`docs/mocks/`**. (The PNG originals live in `frunk-proj/branding/mock/`, outside the
repo, along with the source PSD.)
Read the spec before touching UI; it records measured colour tokens, component rules, and
the open decisions that are still unresolved.

The tokens are implemented in **`src/styles/global.css`** as of Phase 1 — colours, radii,
the two font families (Playfair Display + Plus Jakarta Sans, self-hosted), and the
`.surface-light` / `.surface-dark` blocks that let a full-bleed section pick its own ground.
Read that file alongside the spec; it records where the spec was silent (`--accent-text`,
the semantic green and red).

The legacy `legacy/src/routes/layout.css` still sources tokens from **theme-forseen** and
loads Skeleton's `cerberus` theme, with Arvo + Open Sans — none of which match the mocks.
That coupling dies with `legacy/`.

## Conventions

- **Commits: gitmoji**, single line — `:sparkles: Add merch store page`. See
  `.claude/commit-style.md`. This overrides the global conventional-commits default.
- **No AI attribution anywhere** — no co-author trailers, no generated-by lines in commits
  or PR bodies. A repo hook (`.claude/hooks/git-commit-guard.sh`) blocks it.
- **Branch and open a PR.** PRs open ready for review, not draft.
- **Automerge is on** (`.claude/settings.json`, set 2026-09-19). Merge once CI is green —
  but **verify the PR's head SHA matches the branch tip first**. GitHub's recorded head can
  go stale: on PR #34 it stayed pinned to the first commit through two further pushes, and
  merging took 1 of 3 commits while reporting success. `gh pr view <n> --json headRefOid`
  against `git rev-parse origin/<branch>` catches it in one command.
- Branch protection is unavailable on this repo (private, free plan), so there are no
  required status checks and GitHub's own auto-merge would merge *immediately* rather than
  waiting for CI. Wait for green, then merge.
- Strict TypeScript — no `any`. Prefer extracting a shared helper over repeating a cast.

## Known rough edges

- **No photography.** The studio renders live in `frunk-proj/branding/mock/`, outside the
  repo; only flattened WebP mocks were committed. `src/components/MockImage.astro` stands in.
- **Placeholder marketing copy** on the home page — the three testimonials are the mock's
  own placeholder names. Replace before the Phase 6 cutover.
- **`origin/feat/cleanroom-components`** holds 5 unmerged commits of a hand-rolled Svelte
  component system, superseded by the shadcn decision. Delete when convenient.
- The two duplicate Stripe webhook handlers in `legacy/` are moot — the store is dropped
  (Decision 6) and neither is ported.
- `.claude/skills/` holds a superseded generation of skills (`baos`, `batdd`, `waf`,
  `qcheck`…) predating the global `~/.claude/skills`. Stale and misleading.

## Roadmap

**`docs/PORT-PLAN.md` is the roadmap** until the port lands. `README.md`'s roadmap predates
it and is stale — several of its items (cleanroom components, Tauri, the merch store) are
now explicitly dropped or superseded by the port's decisions.
