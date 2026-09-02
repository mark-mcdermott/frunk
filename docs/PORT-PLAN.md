# Port Plan: frunk → Astro + React islands on Vercel

> **How to resume with cleared context:** tell a fresh session
> *"Read `docs/PORT-PLAN.md` and execute it phase by phase."*
> Run it on a clean `main`. It is non-additive — do not start it mid-velocity.

Modelled on `fullstack-wolfpack/docs/astro-merge-plan.md`, which is the proven playbook
for this architecture. Read that document too; its principles are assumed here.

---

## Context

frunk is **SvelteKit 2 + Svelte 5 on Cloudflare Pages**, with Skeleton UI, hand-rolled
session auth, Drizzle/Neon, Stripe + Printful, and Cloudflare R2 for uploads. It also
ships Capacitor (iOS/Android) and Tauri (desktop) shells.

The target is the stack every other active project is converging on: **Astro for static
marketing pages, the app as a `client:only` React island, `/api/*` as Astro endpoints,
deployed to Vercel.**

**This is not the same shape of job as wolfpack's migration.** That one was
*hosting/packaging* — its app was already React. frunk's is three changes at once:

| | from | to |
|---|---|---|
| View layer | 60 `.svelte` components | React (a genuine rewrite) |
| Data layer | 41 `+page.server.ts` load functions & 33 files of form actions | REST endpoints the applet calls |
| Host | Cloudflare Pages, Workers R2 bindings | Vercel, Vercel Blob |

The redesign rides along. There are 30 mocks in `frunk-proj/branding/mock/` covering every
screen, specified in `docs/DESIGN.md`. Since every component is being rewritten anyway,
**build each screen to the mock the first time** — doing the redesign on SvelteKit first
would mean writing the UI twice.

**What ports nearly as-is:** the Drizzle schema (11 tables), `src/lib/server/{stripe,
printful,email,password}.ts`, and the Stripe/Printful/SES business logic. It is
framework-agnostic TypeScript.

---

## Target architecture

Following wolfpack's governing principle: **draw the auth boundary at the API, not the
page.** Astro serves the same static HTML to everyone; the applet decides what to render
client-side; every API handler checks the session itself. Astro never touches the session.

| Surface | Rendering | Notes |
|---|---|---|
| Home, about, pricing, contact, legal, privacy | **Astro static** | SEO + instant paint, no JS |
| Header / footer | **Astro** + tiny `client:only` user island | reads `/api/auth/me` via a nanostore |
| Sign in / sign up | **Astro page** + React auth island | `client:only` — WebAuthn is browser JS |
| Vehicles, vendors, repairs, notes, galleries, users | **`client:only` applet** | react-router owns navigation |
| `/api/*` | **Astro endpoints** | one bundled Vercel function |

**Island classification rule** (from wolfpack): *does a live browser runtime need to exist
for this to render?* Yes → `client:only`. No → `client:load` / `client:visible`.

**Cross-island state is a nanostore, not React context** — each island is its own React
root, so context cannot span them. This is the mechanism for "the auth island in the nav
talks to the app island."

---

## Decisions

> **Settled 2026-09-02.** frunk **never launched — there is no production data.**
> That removes the auth-discontinuity risk entirely and reduces Phase 6's data migration to
> nothing. It also means the schema can change freely if the rewrite wants it to.

1. **Canonical origin — `frunk.cloud`**, DNS moved to Vercel. `RP_ID` / `RP_ORIGIN` bind
   to it; pick once and don't change it.
2. **Auth — DECIDED: passkeys + TOTP**, ported from wolfpack. No accounts exist, so there
   is no re-registration cost. Drops the hand-rolled session/password path and the SES
   verification flow. *(Closes `docs/DESIGN.md` §8 decision 3 — the sign-in mock's
   Google/Apple/GitHub OAuth is superseded.)*
   **Future intent:** a fuller commercial spread of login options is wanted eventually.
   Passkeys + TOTP is the v1 floor, not the ceiling — keep the auth surface swappable.
3. **Component library — DECIDED: shadcn.** The earlier "no component library" call was
   made while the target was Svelte; on React, shadcn matches wolfpack and the S in every
   `_PROJECTS.md` stack acronym.
4. **Repo shape — flat Astro app.** wolfpack's monorepo exists because it has a shared
   `packages/ui`; frunk has nothing to share yet. Restructure later only if a second
   consumer appears.
5. **Demo mode — collapse the route tree, keep the behaviour.** 16 of the 41 server files
   exist only to mirror the app under `demo/`. Replace with **one applet and a `demo` flag**
   in the data layer. The clone-a-template-user pattern stays: a visitor gets a throwaway
   account seeded from `creed.bratton@dundermifflin.com`.

   **Seed data ports.** `scripts/seed-office.ts` (552 lines) is a plain Drizzle script — 17
   users, 24 vehicles, plus vendors, repairs, notes, galleries and photos, all Office-themed.
   The schema is unchanged, so it carries over near-verbatim; only the password hashing is
   replaced with passkey credential seeding. Keep `scripts/seed-roles.ts` too.
6. **The merch store.** The robot is being retired, and it is the entire product line
   (4 Printful products, 25 mockup images). Decide whether the store survives at all before
   porting `orders`, checkout and the webhook.
7. **Tauri.** wolfpack has no Tauri precedent. Recommend **dropping desktop for now** and
   re-adding it once the web app is stable — it is the least-used shell.
8. **`/blocks` and `/charts` — delete.** Template showcase pages with fake team members,
   inherited from the starter. They are also the only consumers of Skeleton's `Switch`,
   `SegmentedControl` and `Pagination`.

### Still open

**6 (merch store)** and **7 (Tauri)** — both have real consequences and still need a call.

---

## Local development

`npm run dev` (`astro dev`) is **one server**: static `.astro` pages, React islands with
HMR, and `/api/*` endpoints in the same process. No build step to develop. Passkeys work on
`localhost` (secure context) with `RP_ID=localhost`, `RP_ORIGIN=http://localhost:4321`.

This replaces `vite dev` + SvelteKit's server routes.

---

## Phase 0 — Prerequisites

- Land or close open PRs; start on a green `main`. Delete the stale local branch
  `feat/cleanroom-components` and reconcile or delete `origin/staging` (2 unmerged commits,
  one adding 46 optional vehicle fields — decide if those fields are wanted first).
- Settle every decision above, especially **2 (auth)** and **6 (store)**.
- Create the Vercel project and a Vercel Blob store; confirm Neon is reachable from it.
- Audit R2 for live user data worth migrating (avatars, note images, gallery photos).
- **Checkpoint:** Vercel project exists, `main` is clean, decisions recorded in this file.

## Phase 1 — Astro shell, deployable and empty

- New Astro app: `@astrojs/react`, `@astrojs/vercel`, Tailwind 4, React 19.
- Port the design tokens from `docs/DESIGN.md` and the fonts already chosen
  (`@fontsource-variable/playfair-display`, `plus-jakarta-sans`). Add the inline
  theme-boot script so dark-first does not flash white — frunk applies theme in
  `onMount` today, which flashes on every load.
- One static `index.astro` built to the `home` mock.
- **Checkpoint:** deploys to Vercel; view-source shows real static HTML; fonts self-hosted;
  dark and light both correct; no FOUC.

## Phase 2 — Data layer: REST endpoints

- Port the Drizzle schema verbatim; point at the same Neon database.
- Convert the 25 non-demo `+page.server.ts` load functions and form actions into Astro
  `APIRoute` handlers under `src/pages/api/*` — vehicles, vendors, repairs, notes,
  galleries, maintenance schedules, users.
- Every handler resolves the session itself. Reuse `src/lib/server/{stripe,printful,email,
  password}.ts` nearly verbatim.
- **Checkpoint:** every endpoint exercisable with `curl` against a preview deploy; reads
  and writes hit Neon; unauthenticated calls are rejected.

## Phase 3 — Auth

- Implement the chosen model from Decision 2. If passkeys: port wolfpack's
  `api/auth/{register,login}/{options,verify}`, `totp/*`, `_lib/session.ts`.
- Astro `signin.astro` / `signup.astro` pages mounting React auth islands, built to the
  `sign-in` and `sign-up` mocks.
- Nav user island + `stores/user.ts` nanostore reading `/api/auth/me`.
- **Checkpoint:** register, sign in, sign out, session persistence, and TOTP recovery all
  work locally and on a preview deploy.

## Phase 4 — The applet

- `src/pages/[...slug].astro` with `prerender = false`, mounting
  `<AppRoot client:only="react" />` — `BrowserRouter` → `AuthProvider` → `App`.
- Rebuild the app screens in React against the mocks: vehicles index and detail, vendors,
  repairs, notes, galleries, maintenance schedules, user admin. Follow `docs/DESIGN.md`
  for every component.
- Uploads move to **Vercel Blob**. Use `access: 'private'` for vehicle documents — the
  current R2 setup serves everything from public `r2.dev` URLs, so any document URL is
  world-readable today. This is a privacy fix, not just a storage swap.
- **Checkpoint:** full CRUD on every entity; deep links and client-side routing work;
  uploads and deletes work; private documents are not publicly fetchable.

## Phase 5 — Static surface + store

- Remaining marketing and legal pages as `.astro`, built to their mocks: about, pricing,
  contact, privacy, terms. `z_privacy-policy-user-tos-layout.md` specifies the legal layout
  (numbered sidebar, download PDF, version history).
- If the store survives Decision 6: port checkout and **consolidate the two Stripe webhook
  handlers into one** — `api/stripe/webhook` and `api/webhooks/stripe` are near-identical
  today and only one can be the configured URL.
- **Checkpoint:** whole site navigable; static pages are static; store checkout completes
  against Stripe test keys.

## Phase 6 — Cutover

- Point `frunk.cloud` DNS at Vercel. Set env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
  `AUTH_SECRET`, `RP_ID`, `RP_ORIGIN`, `STRIPE_*`, `PRINTFUL_API_KEY`, SES vars.
- No production data to migrate (frunk never launched). Re-seed with `seed-office.ts`.
- Re-point Capacitor at the new origin and verify an auth ceremony inside the webview.
- Retire the Cloudflare Pages project. Update `CLAUDE.md` and `_PROJECTS.md`.
- **Checkpoint:** prod green on one origin; auth end-to-end; Capacitor build passes.

---

## Key files / patterns

- **Reuse near-verbatim:** `src/lib/server/db/schema.ts`, `stripe.ts`, `printful.ts`,
  `email.ts`, `password.ts`.
- **Reference, don't copy:** wolfpack's `src/pages/api/_lib/*`, `AppRoot.tsx`,
  `[...slug].astro`, `lib/theme-boot.ts`.
- **Rewrite:** all 60 `.svelte` components → React, to the mocks.
- **Retire:** Skeleton (`@skeletonlabs/*`), `adapter-cloudflare`, `wrangler.toml`, R2
  bindings in `app.d.ts`, `/blocks`, `/charts`, the `demo/` route tree, `.claude/skills/`
  (a superseded generation).
- **Carry forward:** `docs/DESIGN.md`, the font choice, the contrast-verified palette.

## Risks

- **Scope.** Three simultaneous changes (framework, host, design) with no intermediate
  state where frunk is both old-and-working and new-and-working. Mitigation: the old app
  stays live on Cloudflare until Phase 6.
- ~~**Auth discontinuity.**~~ Resolved — frunk never launched, so no accounts exist.
- **Untested upload path.** R2 writes are guarded by `!import.meta.env.DEV`, so they only
  ever run in production and have no local coverage. Rebuild them with tests.
- **App Store.** wolfpack's Capacitor loads the deployed origin via `CAP_SERVER_URL` rather
  than bundling. That is exposed under Apple Guideline 4.2 (minimum functionality), and
  `_PROJECTS.md` calls frunk the best store candidate. Decide the native strategy before
  relying on it.
- **Test coverage regresses to zero** at the start — the 7 Playwright suites are written
  against SvelteKit markup and will not survive the rewrite. Re-establish them in Phase 4.

## Verification (per checkpoint)

- **Dev:** `astro dev` serves static pages, the applet, and `/api/*` on one origin.
- **Static:** view-source on `/`, `/about`, `/pricing` shows real HTML, not an empty root.
- **Islands:** the nav user island hydrates from `/api/auth/me`; the applet mounts only on
  app routes.
- **Preview deploy:** function count ≈ 1; endpoints reachable; Stripe webhook receives.
- **Design:** each screen checked against its mock in `frunk-proj/branding/mock/`.
- **A11y:** WCAG AA contrast on both themes — the palette in `docs/DESIGN.md` is already
  verified; keep new components to that bar.
