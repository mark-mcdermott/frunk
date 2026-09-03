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

**What ports nearly as-is:** the Drizzle schema (11 tables) and `scripts/seed-office.ts`.
`src/lib/server/{stripe,printful}.ts` are framework-agnostic and would port cleanly, but the
store is deferred (Decision 6) so they are not needed yet. `password.ts` and the SES
verification in `email.ts` are superseded by passkeys.

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

1. **Canonical origin — `frunk.cloud`.** `RP_ID` / `RP_ORIGIN` bind to it; pick once and
   don't change it.

   **DNS — DECIDED 2026-09-02: move the nameservers to Vercel and accept the email
   breakage.** The domain is registered at *Namecheap*, but its nameservers point at
   *Cloudflare* (`zainab`/`valentin.ns.cloudflare.com`), so Cloudflare answers DNS today and
   Namecheap's DNS UI is inert.

   Moving the nameservers takes **Cloudflare Email Routing** down with them:

   ```
   MX   route1/2/3.mx.cloudflare.net
   TXT  v=spf1 include:_spf.mx.cloudflare.net ~all
   ```

   `hello@frunk.cloud` stops forwarding at that moment. It is the contact-form destination
   and is printed on the privacy page. **This is accepted** — frunk never launched, so
   nothing is in flight — but forwarding has to be re-established somewhere before the
   contact form in Phase 5 is advertised as working.

   **Status 2026-09-02: nameservers moved, propagating.** Two follow-ups this creates:
   - **`hello@frunk.cloud` is now dead.** It is still printed on the privacy page and is
     still the contact form's destination. Phase 5 must not ship the contact form against a
     mailbox that does not exist — either re-home the forwarding or change the address.
   - Confirm `frunk.cloud` and `www.frunk.cloud` both resolve to Vercel and that the
     certificate issued, once propagation settles.

   Still unverified: no DKIM records were found for SES, so sending from
   `noreply@frunk.cloud` may not be verified. Check independently.
2. **Auth — DECIDED: passkeys + TOTP**, ported from wolfpack. No accounts exist, so there
   is no re-registration cost. Drops the hand-rolled session/password path and the SES
   verification flow. *(Closes `docs/DESIGN.md` §8 decision 3 — the sign-in mock's
   Google/Apple/GitHub OAuth is superseded.)*
   **Future intent:** a fuller commercial spread of login options is wanted eventually.
   Passkeys + TOTP is the v1 floor, not the ceiling — keep the auth surface swappable.
3. **Component library — DECIDED: shadcn.** The earlier "no component library" call was
   made while the target was Svelte; on React, shadcn matches wolfpack and the S in every
   `_PROJECTS.md` stack acronym.
4. **Repo shape — DECIDED: flat, the stock Astro layout.** No `apps/` or `packages/`
   nesting. wolfpack is a monorepo to separate its design system from its app; frunk has
   nothing to share yet, and flat→monorepo later is a mechanical move, not a rewrite.
   The default layout also means every Astro doc applies verbatim and Vercel needs no
   root-directory configuration.
5. **Demo — DECIDED: it is an account type, not a mode.** This is a *conversion feature*,
   not a technical convenience: a logged-out visitor must be able to click "Try the demo"
   and genuinely use the app — create, edit and delete — without signing up. frunk's
   commercial case depends on try-before-buy.

   The existing implementation is already the right shape: a visitor is issued a **real user
   row** with a `DEMO` role, cloned from `creed.bratton@dundermifflin.com`, and a real
   session. They are not in a fake mode; they are in a real, disposable account.

   So **do not thread a `demo` flag through the data layer.** The API never needs to know.
   A demo visitor is an anonymous auto-provisioned account, isolated by `user_id` exactly
   like any two real users — the same isolation the app already depends on. What goes away
   is the duplicated `demo/` route tree (16 of the 41 server files), not the behaviour.

   Two consequences to build in:

   - **A reaper.** Demo accounts accumulate, and with Blob uploads they accumulate storage.
     Scheduled job: delete `DEMO`-role users older than N days and their blobs.
   - **Upgrade in place.** Because a demo account is a real account, converting is just
     *attaching a passkey to the account the visitor is already using*. No migration, no
     re-entry — they keep everything they made during the trial. Design the sign-up flow
     around this; it is the whole try-before-buy story and it falls out for free.

   **Seed data ports.** `scripts/seed-office.ts` (552 lines) is a plain Drizzle script — 17
   users, 24 vehicles, plus vendors, repairs, notes, galleries and photos, all Office-themed.
   The schema is unchanged, so it carries over near-verbatim; only the password hashing is
   replaced with passkey credential seeding. Keep `scripts/seed-roles.ts` too.
6. **Merch store — DECIDED: dropped for now.** Retiring the robot removes the entire
   product line (all 4 Printful products are robot apparel). Do not port checkout, the
   Stripe webhook, the merch pages, or `src/lib/data/products.ts`. Re-add once there is new
   branding worth printing. Keep the `orders` table in the schema — it costs nothing and
   avoids a migration later.
7. **Tauri — DECIDED: dropped for now.** No wolfpack precedent to copy, and desktop is the
   least-used shell. Get web and mobile right, then re-add Tauri against a stable app.
   Mobile (Capacitor) stays in scope.
8. **`/blocks` and `/charts` — DONE (#25).** `/blocks` was the old About page, renamed
   rather than deleted; `/charts` was a Skeleton kitchen-sink demo. Both were live and
   unlinked. Removed ahead of the port.

All eight settled. The plan is ready to execute.

---

## Local development

`npm run dev` (`astro dev`) is **one server**: static `.astro` pages, React islands with
HMR, and `/api/*` endpoints in the same process. No build step to develop. Passkeys work on
`localhost` (secure context) with `RP_ID=localhost`, `RP_ORIGIN=http://localhost:4321`.

This replaces `vite dev` + SvelteKit's server routes.

---

## Phase 0 — Prerequisites — **DONE 2026-09-02**

- ~~Land or close open PRs; start on a green `main`.~~ Done. `main` is at the PR #28 merge.
- ~~Delete the stale branch `feat/cleanroom-components`.~~ Still on `origin`, deliberately
  kept for now: it holds 5 unmerged commits of a hand-rolled Svelte component system,
  superseded by Decision 3 (shadcn). Nothing depends on it; delete when convenient.
- ~~Reconcile or delete `origin/staging`.~~ **Deleted.** Verified fully superseded: its 46
  optional vehicle fields landed on `main` as `7146ed2` (PR #28), its Capacitor shells are
  on `main`, and its only remaining content was `src-tauri/`, which Decision 7 drops. `main`
  is strictly ahead of it (`main` also carries `maintenance_schedules`, which staging lacked).
  `feat/vehicle-detail-fields` deleted too — merged in PR #28.
- ~~Settle every decision above.~~ All eight settled; Decision 1's DNS trade closed above.
- ~~Create the Vercel project; confirm Neon is reachable from it.~~ **Done.** The project is
  linked to the GitHub repo and the branch deploys — Mark confirmed the preview renders.
  `DATABASE_URL` is set and points at a **new, blank Neon database**, not the one the
  SvelteKit app uses. That is a change from this plan's original "point at the same Neon
  database", and it is the better call: frunk never launched, Phase 6 re-seeds anyway, and
  a separate database means the port cannot disturb the live Cloudflare app. The cost is
  that the schema has to be pushed and the roles seeded before anything works — see
  "Database setup" in `docs/API.md`.
- **A Vercel Blob store does not exist yet.** Not blocking: Blob is unused until Phase 4.
- ~~Audit R2 for live user data worth migrating.~~ **Nothing to migrate.** Two buckets exist:
  - `frunk-avatars` — bound as `R2_AVATARS` in `wrangler.toml`. frunk never launched, so it
    holds no real user data. Uploads were also guarded by `!import.meta.env.DEV`, so they
    only ever ran in production.
  - `pub-9903686a35b440c6b73f8b917ba808c8.r2.dev` — public bucket of Printful merch mockups,
    referenced only by `src/lib/data/products.ts`. Dropped with the store (Decision 6).

### Outstanding manual setup (Mark)

Phase 1 builds and passes locally; it cannot be *deployed* until these exist:

1. Create the Vercel project against `mark-mcdermott/frunk`. Framework preset: **Astro**.
   Root directory: repository root (Decision 4 — no configuration needed).
2. Create a **Vercel Blob** store and attach it to the project (`BLOB_READ_WRITE_TOKEN`).
   Not used until Phase 4, but confirms the account tier supports it.
3. Set `DATABASE_URL` to the Neon connection string and confirm Neon accepts connections
   from Vercel's region.
4. Move `frunk.cloud` nameservers to Vercel (Decision 1) — can happen any time before Phase 6.

## Phase 1 — Astro shell, deployable and empty — **DONE 2026-09-02**

- ~~New Astro app: `@astrojs/react`, `@astrojs/vercel`, Tailwind 4, React 19.~~ Astro 7.2,
  React 19.2, Tailwind 4.3, flat stock layout at the repository root (Decision 4).
- ~~Port the design tokens from `docs/DESIGN.md` and the fonts already chosen.~~
  `src/styles/global.css` carries the full token layer. Two additions the spec left open:
  - **`--accent-text`.** `--accent-bright` (#9890F8) clears 7.4:1 on the dark ground but only
    **2.7:1 on the light one**, so it fails AA as text on light surfaces — which is what the
    mock's light-section eyebrow labels are. Light surfaces therefore step down to `--accent`
    (#6438CC, 7.0:1). `--accent-bright` stays the accent on dark.
  - **Semantic green and red** were named but not valued in DESIGN.md; both themes now carry
    AA-clearing pairs.
  - Marketing sections alternate light and dark independently of the viewer's theme
    (DESIGN.md §4), so the surface tokens are also exposed as `.surface-light` /
    `.surface-dark` blocks applied per `<section>`.
- ~~Add the inline theme-boot script.~~ `src/lib/theme.ts` exports `THEME_BOOT_SCRIPT`,
  inlined in `<head>` and applied before first paint. The SvelteKit app set the theme in
  `onMount` and flashed white on every load.
- ~~One static `index.astro` built to the `home` mock.~~ All six sections.

**Two gaps carried into later phases, both deliberate:**

- **No photography.** The studio automotive renders live in `frunk-proj/branding/mock/`,
  outside the repo — only flattened WebP mocks were committed. `src/components/MockImage.astro`
  stands in at the right aspect ratio with the violet rim light, and every usage is a
  one-line swap once the renders land.
- **Placeholder marketing copy.** The three testimonials are the mock's own placeholder
  names and must be replaced before the Phase 6 cutover. The mock's "FEATURED IN" press-logo
  row is **deliberately not built** — frunk has no coverage, and real publication logos
  would misrepresent it. Add it when there is something true to put there.

**Checkpoint:** `astro check` 0 errors; `astro build` passes; view-source on `/` is real
static HTML (18 KB, **zero hydration islands** — the lucide glyphs render to inline SVG at
build time); all 11 font files self-hosted with no CDN reference in the output; theme boot
inlined ahead of paint. **Deploying to Vercel is blocked on the manual setup above.**

The old SvelteKit app moved to `legacy/` rather than being deleted — it is the reference for
Phase 2's 25 load functions and Phase 4's 60 components, and it is excluded from the Astro
build and typecheck. Delete the directory at the end of Phase 5. `legacy/` also holds the
Capacitor shells (`android/`, `ios/`, `capacitor.config.ts`), which are pinned to the
SvelteKit dev port and `build/` output; Phase 6 re-points them at the Astro origin.

## Phase 2 — Data layer: REST endpoints — **DONE 2026-09-03**

- ~~Port the Drizzle schema verbatim.~~ `src/lib/server/db/schema.ts`, all 11 tables, same
  table and column names. Two deliberate deviations, both free because the database is blank:
  - `user.password_hash` is **nullable**. Decision 2 replaces passwords with passkeys, so
    Phase 3 stops writing it; NOT NULL would make it impossible to create a user without a
    password nothing checks. The column stays until Phase 3 so `seed-office.ts` still runs.
  - `session.user_id` now cascades. It carried no `onDelete`, so deleting a user who had
    ever signed in raised a foreign-key violation — the SvelteKit "delete account" action
    could not have worked.
- ~~Convert the 25 non-demo load functions and form actions into Astro `APIRoute` handlers.~~
  18 route files under `src/pages/api/`, documented in **`docs/API.md`**. Shared pieces live
  in `src/pages/api/_lib/` (underscore keeps them out of routing): `session.ts`, `guard.ts`,
  `http.ts`, `schemas.ts`.
- ~~Every handler resolves the session itself.~~ There is no `locals` equivalent by design.
- The store endpoints (`stripe.ts`, `printful.ts`, checkout, the two webhooks) are **not**
  ported — Decision 6. `password.ts` and the SES verification flow are superseded by
  Decision 2; the plan's line about reusing them predates that decision being settled.

**Three things worth knowing about the port:**

- **Ownership is a predicate, not a comparison.** The SvelteKit actions fetched a row and
  then compared `row.userId !== locals.user.uuid`. The guards in `_lib/guard.ts` put the
  owner into the `WHERE` clause instead, so a row belonging to someone else is
  indistinguishable from one that does not exist — no existence oracle, and one query.
- **Astro's CSRF origin check is left on.** Browsers send `Origin` on every non-GET
  `fetch`, so the applet is unaffected, but curl must set it by hand on mutating calls or
  they 403. The session cookie is also `SameSite=Lax`.
- **Uploads are deferred to Phase 4.** The photo and vehicle-image endpoints record an
  `imageUrl` that already exists; they do not accept the base64 `fileData` the SvelteKit
  actions took. Phase 4 puts the Vercel Blob write in front of them.

**Checkpoint — met.** `astro check` 0 errors, `astro build` passes, function count is **1**
(`_render.func`), and `/` is still static HTML.

*Unauthenticated calls are rejected* — all 18 routes answer 401 except `GET /api/auth/me`,
which is 200 with `{"user": null}` by design. A cross-origin mutating call is refused, an
unknown method or path is 404, and 401 precedes 422 so an unauthenticated bad body does not
leak the schema.

*Reads and writes hit the database* — 31 assertions against a real Postgres 16, driven
through the running endpoints with a real session cookie. Covered: CRUD on every entity;
PATCH leaving omitted keys alone and an explicit `null` clearing a column; note nesting and
child deletion; gallery reordering, including an id from another gallery being ignored
rather than moved; FK cascades on vehicle delete, with the vendor surviving; the admin gate;
and **ownership isolation** — a second user gets 404, never 403, on every route, and cannot
attach a repair to someone else's vehicle.

This became possible because `getDb()` now picks its driver from the `DATABASE_URL`
hostname: `.neon.tech` uses Neon's HTTP protocol, anything else uses node-postgres over TCP.
That is worth having beyond the test — the app runs against a throwaway local Postgres with
no Neon account, and Phase 4's e2e suite can do the same in CI.

**Still outstanding:** the Neon HTTP driver path itself is unexercised, and no schema has
been pushed to the blank Neon database. The sandbox's egress allowlist cannot reach Neon
(`api.neon.tech`, `console.neon.tech` and `neon.tech` are all refused, and TCP 5432 is not
proxied), so this is Mark's to run — three ways to do it, two of them from a phone, are in
"Database setup" in `docs/API.md`.

## Phase 3 — Auth

- Implement the chosen model from Decision 2: port wolfpack's
  `api/auth/{register,login}/{options,verify}` and `totp/*`. **`_lib/session.ts` already
  exists** — Phase 2 built it, since passkeys change how a session is established, not how
  it is represented. The ceremonies just call `createSession`.
- Add the credential tables (passkey public keys, TOTP secrets) and drop
  `user.password_hash` once `seed-office.ts` seeds credentials instead.
- Astro `signin.astro` / `signup.astro` pages mounting React auth islands, built to the
  `sign-in` and `sign-up` mocks.
- Nav user island + `stores/user.ts` nanostore reading `/api/auth/me`.
- **Anonymous demo sessions:** a `POST /api/demo` that clones the Creed template into a new
  `DEMO`-role user and issues a session — no passkey involved. Plus the upgrade path:
  attaching a passkey to the current demo account converts it in place.
- **Checkpoint:** register, sign in, sign out, session persistence and TOTP recovery all
  work locally and on a preview deploy; a logged-out visitor can start a demo, make changes,
  then convert to a real account keeping their data.

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

## Phase 5 — Static surface

- Remaining marketing and legal pages as `.astro`, built to their mocks: about, pricing,
  contact, privacy, terms. `z_privacy-policy-user-tos-layout.md` specifies the legal layout
  (numbered sidebar, download PDF, version history).
- Contact form posts to an Astro endpoint; SES stays for that (only the *verification*
  flow is superseded by passkeys).
- No store — Decision 6. The duplicate Stripe webhook problem disappears with it.
- **Checkpoint:** whole site navigable; view-source shows static HTML on every marketing
  page; contact form delivers.

## Phase 6 — Cutover

- Point `frunk.cloud` DNS at Vercel. Set env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
  `AUTH_SECRET`, `RP_ID`, `RP_ORIGIN`, `STRIPE_*`, `PRINTFUL_API_KEY`, SES vars.
- No production data to migrate (frunk never launched). Re-seed with `seed-office.ts`.
- Re-point Capacitor at the new origin and verify a passkey ceremony inside the webview.
- Desktop is out of scope (Decision 7) — no Tauri step.
- Resolve the DNS/email trade in Decision 1 before switching nameservers.
- Schedule the demo-account reaper.
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
  bindings in `app.d.ts`, `/blocks`, `/charts`, the `demo/` route tree, `src-tauri/` and the
  `tauri:*` scripts, `/merch` + `src/lib/data/products.ts` + the two Stripe webhook routes,
  `password.ts`, `.claude/skills/` (a superseded generation).
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
