# Frunk

Personal vehicle management app — store documents, repairs, vendors, notes, photo
galleries and maintenance schedules for your cars. Live at **frunk.cloud**.
Also known as **drivetracks** (older name for the same project).

Named for "front trunk" — the storage compartment in EVs and mid-engine cars.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes — `$state`, `$derived`, `$props`), TypeScript
- **Tailwind CSS 4** + **Skeleton UI v4**
- **Neon** serverless Postgres via **Drizzle ORM**
- **Cloudflare Pages** (`@sveltejs/adapter-cloudflare`), **R2** for file storage
- **Capacitor** (iOS/Android) and **Tauri 2** (desktop) — both scaffolded and building
- **Stripe** Checkout + **Printful** print-on-demand for the merch store
- **AWS SES** for verification email
- **Playwright** for e2e

## Commands

```bash
pnpm dev                 # vite dev server
pnpm build               # production build (must pass)
pnpm check               # svelte-check — must report 0 errors
pnpm test                # full Playwright e2e suite
pnpm test:regression     # the suite CI runs
pnpm db:push             # push schema to Neon
pnpm db:studio           # drizzle studio
pnpm cap:ios / cap:android
pnpm tauri:dev / tauri:build
```

`pnpm install` is required after any gap — dependencies drift and the build fails
misleadingly when `node_modules` is stale.

## Verify loop

A change is done when **`pnpm check` reports 0 errors** and **`pnpm build` passes**.
CI (`.github/workflows/e2e.yml`) runs the Playwright regression suite on every push and
pull request; Cloudflare Pages builds a preview per PR. Both must be green before merge.

Playwright boots its own server (`build && preview` on port 4173), so e2e needs a working
build and a reachable `DATABASE_URL`.

**`pnpm lint` is not a gate.** It fails on ~821 files against untouched `main` — accumulated
prettier debt that predates any current work. Don't "fix" it inside an unrelated PR; it needs
its own single-purpose reformat commit.

## Architecture

- `src/routes/` — file-based routes. Marketing pages (`about`, `pricing`, `contact`, `legal`),
  the app (`vehicles`, `vendors`, `repairs`, `notes`, `users`), the store (`merch`), and
  `demo/` which mirrors the app against seeded sample data for logged-out visitors.
- `src/lib/server/` — server-only: `auth.ts`, `db/`, `email.ts`, `password.ts`, `stripe.ts`,
  `printful.ts`. Never import these from client code.
- `src/lib/components/` — shared UI. `pages/` holds full page bodies shared between the real
  app and its `demo/` twin, so a change to a list or detail view must be made once there
  rather than duplicated.
- `src/lib/utils/` — framework-free helpers (`demoRoutes.ts`, `dom.ts`).
- `src/hooks.server.ts` — resolves the session cookie into `locals.user` / `locals.session`
  on every request.

**Auth** is hand-rolled session auth: opaque token in an `auth-session` cookie, sessions
table in Postgres, sliding expiry, SES for verification email. There are no OAuth providers
wired up today.

**Demo mode** — routes under `demo/` reuse the same page components with `basePath` set, so
links stay inside the demo. Check `isDemoPath` / `demoPath` in `src/lib/utils/demoRoutes.ts`
before hardcoding any route.

## Design

The redesign is specified in **`docs/DESIGN.md`**, derived from the mocks committed in
**`docs/mocks/`**. (The PNG originals live in `frunk-proj/branding/mock/`, outside the
repo, along with the source PSD.)
Read the spec before touching UI; it records measured colour tokens, component rules, and
the open decisions that are still unresolved.

Note that `src/routes/layout.css` currently sources `--color-primary`, `--color-accent`,
`--font-heading` and `--font-body` from **theme-forseen**, and loads Skeleton's `cerberus`
theme. Present fonts are Arvo + Open Sans, which do **not** match the mocks.

## Conventions

- **Commits: gitmoji**, single line — `:sparkles: Add merch store page`. See
  `.claude/commit-style.md`. This overrides the global conventional-commits default.
- **No AI attribution anywhere** — no co-author trailers, no generated-by lines in commits
  or PR bodies. A repo hook (`.claude/hooks/git-commit-guard.sh`) blocks it.
- **Branch and open a PR; never merge automatically.** PRs open ready for review, not draft.
- Strict TypeScript — no `any`. Prefer extracting a shared helper over repeating a cast.

## Known rough edges

- **Two Stripe webhook handlers exist**: `src/routes/api/stripe/webhook/+server.ts` and
  `src/routes/api/webhooks/stripe/+server.ts`, with near-identical logic. Only one can be
  the URL configured in Stripe; the other is dead and silently diverging. Consolidate before
  trusting either.
- **`origin/staging`** carries 2 commits never merged to `main`, one adding 46 optional
  vehicle schema fields. Reconcile or delete it.
- `pnpm check` reports ~76 a11y warnings (click handlers on non-interactive `div`s). Real
  issues, not yet addressed.
- `.claude/skills/` holds a superseded generation of skills (`baos`, `batdd`, `waf`,
  `qcheck`…) predating the global `~/.claude/skills`. Stale and misleading.

## Roadmap

Tracked in `README.md` under "Roadmap". Remaining: maintenance-due badges on the vehicle
list, the brand/UI redesign, premium tier, Tauri/Capacitor flow tweaks, a possible move to
cleanroom components, and a potential platform migration (SvelteKit → Next, Cloudflare → Vercel).
