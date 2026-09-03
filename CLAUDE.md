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

**Phases 0, 1 and 2 are done.** Phase 3 (passkeys + TOTP auth) is next. Read
`docs/PORT-PLAN.md` before doing anything here; it records what is settled and what is
outstanding.

## Stack (the port target, at the repo root)

- **Astro 7** with **React 19** islands, TypeScript
- **Tailwind CSS 4** + **shadcn/ui** (`components.json` is configured; no components added yet)
- **Neon** serverless Postgres via **Drizzle ORM**
- **Vercel** (`@astrojs/vercel`), **Vercel Blob** for file storage
- **Passkeys + TOTP** for auth (Decision 2) — replaces the hand-rolled session/password path
- **AWS SES** for the contact form only
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
pnpm preview             # astro preview

pnpm db:generate         # regenerate drizzle/*.sql after a schema change
pnpm db:push             # apply the schema to DATABASE_URL
pnpm db:seed-roles       # required once per database — ROLE_IDS hardcodes 1/2/3
```

`DATABASE_URL` points at a **new, blank Neon database**, separate from the one the legacy
app uses, so the port cannot disturb what is still live on Cloudflare.

`pnpm install` is required after any gap — dependencies drift and the build fails
misleadingly when `node_modules` is stale.

The legacy commands (`pnpm test`, `db:push`, `cap:*`) still live in `legacy/package.json`
and run from that directory with its own `pnpm install`.

## Verify loop

A change is done when **`pnpm check` reports 0 errors** and **`pnpm build` passes**.

Test coverage is intentionally at zero during the port: the 7 Playwright suites in
`legacy/e2e/` are written against SvelteKit markup and do not survive the rewrite. They are
re-established in Phase 4 (`docs/PORT-PLAN.md`). `.github/workflows/e2e.yml` still points at
the legacy app.

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

**Auth** is hand-rolled session auth: opaque token in an `auth-session` cookie, sessions
table in Postgres, sliding expiry, SES for verification email. There are no OAuth providers
wired up today.

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
- **Branch and open a PR; never merge automatically.** PRs open ready for review, not draft.
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
