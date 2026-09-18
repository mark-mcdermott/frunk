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

**Server state is TanStack Query, not `useEffect` + `fetch`** (Decision 9). Nanostores and
Query are not alternatives: nanostores holds *client* state that spans islands (theme, the
user island's cached hint), Query holds *server* state inside the applet. Note that with
Decision 6 the cart is gone, so nanostores' remaining job is small — theme and the nav user
island — but it is still the right primitive for both, and Better Auth ships its session as
a nanostore already.

---

## Decisions

> **Settled 2026-09-02.** frunk **never launched — there is no production data.**
> That removes the auth-discontinuity risk entirely and reduces Phase 6's data migration to
> nothing. It also means the schema can change freely if the rewrite wants it to.

1. **Canonical origin — `frunk.cloud`.** `RP_ID` / `RP_ORIGIN` bind to it; pick once and
   don't change it.

   **The DNS situation is not what it looks like.** The domain is registered at *Namecheap*,
   but its nameservers point at *Cloudflare* (`zainab`/`valentin.ns.cloudflare.com`) — so
   Cloudflare answers DNS and Namecheap's DNS UI is inert. The usual workflow (add the domain
   in Vercel, paste its records into Namecheap) requires switching nameservers back to
   Namecheap BasicDNS first.

   ⚠️ **Doing that breaks email.** frunk.cloud uses **Cloudflare Email Routing**:

   ```
   MX   route1/2/3.mx.cloudflare.net
   TXT  v=spf1 include:_spf.mx.cloudflare.net ~all
   ```

   That service only works while Cloudflare hosts the DNS. Move the nameservers and
   `hello@frunk.cloud` stops forwarding — the contact-form destination, also printed on the
   privacy page. Either keep Cloudflare as DNS-only (email survives, consolidation is
   partial) or replace forwarding before switching. **Unresolved — decide before Phase 6.**

   Also unverified: no DKIM records were found for SES, so sending from
   `noreply@frunk.cloud` may not be verified. Check independently.
2. **Auth — DECIDED: Better Auth.** *(Revised 2026-09-17. Supersedes the earlier call to
   hand-roll passkeys + TOTP from wolfpack's `@simplewebauthn` code.)*

   `better-auth` — MIT, self-hosted, an open-source library rather than a service, so no
   tier and no per-MAU cost. That shape matters for a freemium consumer app: hosted auth
   bills by monthly active user, so you would pay for free users who generate no revenue.

   - **Passkeys** via `@better-auth/passkey` (a first-party companion package, published in
     lockstep at the same version — not bundled in the core package).
   - **TOTP** via the bundled `better-auth/plugins/two-factor`.
   - **Drizzle adapter** ships inside the core package. Already our ORM.
   - **Bearer mode** (`better-auth/plugins/bearer`) for the Capacitor client — the
     cross-origin problem that Decision 1 and the `astro:actions` exclusion both circle.
   - **Session is exposed as a nanostore**, so the Phase 3 nav user island is configuration
     rather than something to build.

   **This reverses the note on `docs/DESIGN.md` §8 decision 3.** That decision asks to pick
   one of three directions — the sign-in mock's Google/Apple/GitHub OAuth, email + SES
   verification, or passkeys — and the previous call here declared the mock's OAuth
   *superseded*. With Better Auth there is nothing to pick: email+password and social
   providers are **core config**, passkeys and TOTP are plugins, all on one user table. Build
   the sign-in screen **as drawn in the mock**, social buttons included, rather than shipping
   a screen that contradicts it.

   **Future intent is now configuration, not new code.** The "fuller commercial spread of
   login options" wanted eventually — magic links, email OTP, username, phone — are bundled
   plugins. `@better-auth/sso` covers SAML/OIDC if frunk ever takes an enterprise fleet
   wedge, and `@better-auth/stripe` binds subscriptions to accounts for the premium tier.

   **Cost of adopting is at its floor right now.** No accounts exist, so there are no
   password hashes to rehash and no sessions to migrate — the two things that make an auth
   swap miserable later. Doing this before launch is the whole argument for doing it now.
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
     *attaching a credential to the account the visitor is already using*. No migration, no
     re-entry — they keep everything they made during the trial. Design the sign-up flow
     around this; it is the whole try-before-buy story and it falls out for free.
     *(Since Decision 2 → Better Auth, this is `better-auth/plugins/anonymous` rather than
     something to implement. See Phase 3.)*

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

9. **Server-state cache — DECIDED: TanStack Query.** *(Added 2026-09-17.)* This was a
   genuine gap: the plan had no answer for it. SvelteKit's `load()` functions currently
   provide revalidation-on-navigation for free, and a `client:only` applet with react-router
   has none of it — without Query, Phase 4 means hand-rolling fetch, cache and invalidation
   across every screen. Query is not an optimisation here; it is the replacement for
   something the current stack does automatically. It sits on top of the Phase 2 endpoints
   and does not change their shape.

   Two things to build in: **persist the cache** (localStorage) so a returning user paints
   their garage instantly while it revalidates behind — this is what closes the first-paint
   gap against today's SSR, and it matters most in the Capacitor build where the bundle is
   already on-device. And **code-split per route** so Phase 4 does not ship all app screens
   upfront.

10. **Stack name — DECIDED: NASDAQ-VCRZ.** *(Recorded 2026-09-17.)*

    **N**eon · **A**stro · **S**hadcn · **D**rizzle · **A**uth (Better) · **Q**uery
    (TanStack) · **V**ercel (Blob/Analytics) · **C**apacitor · **R**eact · **Z**od

    Supersedes ZENCATSNBATS for frunk, which was recorded here earlier the same day.
    The governing rule, arrived at by elimination: **every letter names a decision, not a
    default.** That is why Node, TypeScript, Vite and ESLint are absent — Node and TypeScript
    are implied by everything else, Vite comes with Astro rather than being chosen alongside
    it, and ESLint is tooling every project here runs. Their absence is not a statement that
    they are unused; `pnpm lint` and the formatter stay exactly as they are.

    Two things deliberately not letters: **Tauri** (deferred, Decision 7) and **nanostores**
    (still used for theme and the nav user island, but no longer a decision — Better Auth
    ships its session as one). Add Tauri back to the name when Decision 7 reverses.

    **On `V = Vercel (Blob/Analytics)`:** Blob runs throughout this document. Analytics was
    flagged as unplanned when this decision was first recorded and is now adopted in Phase 5
    — but note it covers the **web surface only**. See that phase for why, and the App Store
    risk entry for the decision it depends on.

    Recorded in `_PROJECTS.md`.

---

11. **Testing — DECIDED: Vitest-weighted, Playwright for flows.** *(Added 2026-09-17.)*

    Today all testing is Playwright: 7 suites, 618 lines, every assertion against SvelteKit
    markup. Vitest is installed and *configured* in `vite.config.ts` with client and server
    projects — and has **zero tests**; both projects scan `src/**` and nothing matches. There
    is no `vitest` script. Meanwhile `src/lib/server/` (723 lines, including auth, hashing,
    Stripe, Printful) has no direct coverage at all.

    The governing principle: **push tests away from markup, because markup is what churns.**
    The current suites die in this port precisely because they are markup-coupled, and 30
    mocks of redesign will do the same to any replacement written at that layer.

    **① API integration tests (Vitest, node) — the bulk.** The Phase 2 endpoints are HTTP in,
    JSON out: no DOM, no components, no framework coupling. Tests written here survive the
    Svelte→React rewrite *and* the next rewrite, and they give `src/lib/server/` its first
    real coverage. They are also where the security boundary now lives — post-port every
    endpoint is independently reachable, so one missing check is a data leak. Per endpoint:

    | case | expected |
    |---|---|
    | no session | 401 |
    | valid session, another user's row | 404/403 — never the row |
    | valid session, own row | 200 |
    | `DEMO`-role session | isolated identically to any other user |

    That last row is not optional: Decision 5 rests demo safety *entirely* on `user_id`
    scoping, so assert it directly rather than trusting it.

    **② Component tests — deliberately few.** Only components that *compute*: form
    validation, maintenance-schedule date maths, currency and VIN formatting. Not "does the
    card render the title" — that breaks on every nudge to a mock. Swap
    `vitest-browser-svelte` for the React equivalent; the existing `client` project config
    otherwise carries over.

    **③ E2E (Playwright) — four or five, not seven.** Reserved for flows crossing systems,
    never per-entity CRUD (that moves to ①): sign up → verify → sign in → sign out; **demo →
    create a vehicle → convert, data intact** (the conversion funnel Decision 5 calls the
    commercial case); one CRUD happy path to prove the wiring; and **upload a document →
    assert it is not publicly fetchable**, which is the Phase 4 privacy fix and exactly the
    kind of thing that regresses silently.

    **Test database — a Neon branch per CI run.** Playwright currently runs against a real
    Neon database via `DATABASE_URL`, and the header of `.github/workflows/e2e.yml` documents
    what that already cost: a port-branch schema applied to the legacy database, then
    reverted by another branch. Spin a Neon branch per run, seed it from `seed-office.ts`
    (17 users, 24 vehicles — a deterministic fixture), drop it after.

    **Split the scripts.** `pnpm test` is currently the full Playwright suite behind a
    production build — a multi-minute verify loop, which is real friction for agent work.

    ```
    pnpm test:unit   # vitest — seconds, run constantly
    pnpm test:e2e    # playwright — minutes, run before PR
    ```

    CI: typecheck + `test:unit` on every push; `test:e2e` on PRs only.

    **Lint becomes a gate again.** `pnpm lint` is currently excluded from the verify loop
    because it fails on ~821 files — prettier debt across files this port replaces wholesale.
    Format new files from the first commit and the backlog evaporates on its own. Add lint to
    CI once Phase 4 lands.

    **Deliberately skipped: visual regression.** Tempting given the redesign, and Playwright
    has `toHaveScreenshot` built in — but it is noisy across font rendering and CI-vs-local,
    and during an active redesign every intentional change reads as a failure. Revisit once
    the design settles.

    **Not covered:** web e2e cannot reach the Capacitor webview. The one thing that genuinely
    differs there is bearer-token auth instead of cookies — cover that at layer ① and keep
    device testing manual for now.

---

All decisions settled. Decision 2 was reopened on 2026-09-17 and resolved in favour of
Better Auth; the plan is ready to execute end to end.

---

## Local development

`npm run dev` (`astro dev`) is **one server**: static `.astro` pages, React islands with
HMR, and `/api/*` endpoints in the same process. No build step to develop. Passkeys work on
`localhost` (secure context) with `RP_ID=localhost`, `RP_ORIGIN=http://localhost:4321`.

This replaces `vite dev` + SvelteKit's server routes.

---

## Phase 0 — Prerequisites

- Land or close open PRs; start on a green `main`. Delete the stale local branch
  `feat/cleanroom-components`. **`origin/staging` is dead — just delete it** (verified
  2026-09-17): it is 82 commits behind `main`, last touched 2026-01-16, and its only
  valuable commit (`1f0b09f`, the 46 optional vehicle fields) is already on `main` via
  PR #28. There is nothing to reconcile. `git push origin --delete staging`.
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
- **Checkpoint:** every endpoint covered by the Vitest integration suite (Decision 11 ①),
  not merely `curl`-able — including the four-case auth matrix per endpoint. Reads and writes
  hit Neon; unauthenticated and cross-user calls are rejected. **This is the phase that
  matters most for coverage:** these tests are markup-free, so they are the only ones that
  survive Phase 4 intact and the only safety net the UI rewrite has.

## Phase 3 — Auth

- Mount Better Auth (Decision 2): `betterAuth()` with the Drizzle adapter against the same
  Neon database, its handler wired to a catch-all `/api/auth/[...all]` Astro endpoint.
  Generate its tables with the Better Auth CLI rather than hand-writing them.
- Enable, in one config object: `emailAndPassword`, `socialProviders` (Google/Apple/GitHub,
  per the mock), plus the `passkey`, `twoFactor`, `bearer` and `anonymous` plugins.
- Astro `signin.astro` / `signup.astro` mounting React auth islands, built to the `sign-in`
  and `sign-up` mocks **as drawn** — the social buttons are in scope now, not superseded.
- Nav user island subscribing to Better Auth's session nanostore. No bespoke
  `stores/user.ts`, no `/api/auth/me` of our own.
- **Anonymous demo sessions:** `better-auth/plugins/anonymous` is this exact lifecycle —
  issue a real anonymous user, then link a real credential to the same row later without
  migrating anything. Decision 5's "upgrade in place, keeping everything they made" is the
  plugin's headline behaviour. Cloning the Creed template into the new user stays our app
  logic; the account lifecycle does not.
- SES keeps the verification-email job (Better Auth calls out to it via
  `sendVerificationEmail`); only the hand-rolled token logic goes away.
- **Checkpoint:** register, sign in, sign out, session persistence and TOTP recovery all
  work locally and on a preview deploy; email+password, at least one social provider, and a
  passkey ceremony each complete; a logged-out visitor can start a demo, make changes, then
  convert to a real account keeping their data. The auth matrix from Decision 11 ① passes
  against real sessions rather than stubs.

## Phase 4 — The applet

- `src/pages/[...slug].astro` with `prerender = false`, mounting
  `<AppRoot client:only="react" />` — `BrowserRouter` → `AuthProvider` → `App`.
- Rebuild the app screens in React against the mocks: vehicles index and detail, vendors,
  repairs, notes, galleries, maintenance schedules, user admin. Follow `docs/DESIGN.md`
  for every component.
- Wire **TanStack Query** (Decision 9) over the Phase 2 endpoints: one `QueryClient` at
  `AppRoot` (one island, so one client — do not instantiate per screen), query keys per
  entity, mutations invalidating their entity's key. Add the localStorage persister and
  per-route code splitting. Skeleton states, not spinners — `docs/DESIGN.md` §5 specifies
  the empty-state vocabulary.
- Uploads move to **Vercel Blob**. Use `access: 'private'` for vehicle documents — the
  current R2 setup serves everything from public `r2.dev` URLs, so any document URL is
  world-readable today. This is a privacy fix, not just a storage swap.
- **Checkpoint:** full CRUD on every entity; deep links and client-side routing work;
  uploads and deletes work; private documents are not publicly fetchable; revisiting a
  screen serves from cache with no refetch; a hard reload repaints from the persisted cache
  before the network answers; the four or five Playwright flows from Decision 11 ③ pass; and
  `pnpm lint` is green and added to CI.

## Phase 5 — Static surface

- Remaining marketing and legal pages as `.astro`, built to their mocks: about, pricing,
  contact, privacy, terms. `z_privacy-policy-user-tos-layout.md` specifies the legal layout
  (numbered sidebar, download PDF, version history).
- Contact form posts to an Astro endpoint; SES stays for that (only the *verification*
  flow is superseded by passkeys).
- **Vercel Web Analytics** (`@vercel/analytics`) — one `<Analytics />` in the Astro layout.
  Cookieless, so it adds no category to the existing consent flow.

  **It covers the web surface only, by design.** The client beacons to
  `/_vercel/insights/view`, a *relative* path that Vercel's CDN intercepts on the deployment
  origin. The production Capacitor build is bundled (`webDir: 'build'`, no `server.url`), so
  it runs from `capacitor://localhost` with no Vercel CDN in front of it and that path goes
  nowhere. This is an acceptable split rather than a gap: the native build bundles the
  *applet*, not the marketing site, and marketing is where pageview analytics earns its keep.

  **What it does not answer** is the funnel the commercial case rests on — demo session
  starts → creates a vehicle → attaches a passkey → converts with data intact (Decision 5).
  That is event-based product analytics and must work on all three platforms, so it needs an
  absolute endpoint plus an API key rather than host interception (PostHog, Amplitude, or a
  `POST /api/events` into Neon, since the API already exists). **Deferred — decide once the
  demo funnel exists to measure.** Do not block Phase 5 on it.
- No store — Decision 6. The duplicate Stripe webhook problem disappears with it.
- **Checkpoint:** whole site navigable; view-source shows static HTML on every marketing
  page; contact form delivers; a pageview from the deployed marketing site lands in the
  Vercel Analytics dashboard.

## Phase 6 — Cutover

- Point `frunk.cloud` DNS at Vercel. Set env: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
  `AUTH_SECRET`, `RP_ID`, `RP_ORIGIN`, `STRIPE_*`, `PRINTFUL_API_KEY`, SES vars.
- No production data to migrate (frunk never launched). Re-seed with `seed-office.ts`.
- Re-point Capacitor at the new origin and verify a passkey ceremony inside the webview.
- **Remove `server.url` from `capacitor.config.ts` before any release build.** It currently
  points at a LAN address (`http://192.168.1.240:5173`) with `cleartext: true`, relying on a
  comment to remember to disable it. A release built with it live ships an app that loads
  nothing outside your house. Make it environment-driven rather than comment-driven.
- **Decide where the bearer token lives on device** — iOS Keychain / Android Keystore via a
  secure-storage plugin (correct), `@capacitor/preferences` (unencrypted), or localStorage
  (readable by any script in the webview — don't).
- Desktop is out of scope (Decision 7) — no Tauri step.
- Resolve the DNS/email trade in Decision 1 before switching nameservers.
- Schedule the demo-account reaper.
- Retire the Cloudflare Pages project. Update `CLAUDE.md` and `_PROJECTS.md`.
- **Checkpoint:** prod green on one origin; auth end-to-end; Capacitor build passes.

---

## Key files / patterns

- **Reuse near-verbatim:** `src/lib/server/db/schema.ts`, `stripe.ts`, `printful.ts`,
  `email.ts`. **Not `password.ts`** — Better Auth owns hashing now (Decision 2).
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

  frunk's own `capacitor.config.ts` implies **bundled** — `webDir: 'build'`, with `server.url`
  present but marked *"Comment out for production builds"*. That is the Guideline 4.2-safe
  choice and this plan assumes it.

  **Two things ride on that assumption.** Vercel Web Analytics reaches only origins Vercel
  serves, so bundling is what confines it to the web surface (Phase 5) — flip to server-URL
  mode and it would suddenly cover native too, at the cost of the App Store exposure. And the
  session token has nowhere host-provided to live, which is what forces bearer mode and the
  native token-storage question below. Decide bundling once; three things follow from it.
- **Test coverage regresses to zero** at the start — the 7 Playwright suites are written
  against SvelteKit markup and will not survive the rewrite. **Mitigated by Decision 11:**
  the markup-coupled suites are unavoidably lost, but the Phase 2 API tests never regress at
  all, so Phase 4 begins with a safety net instead of bare. Sequencing matters here — write
  the API suite *in* Phase 2, not retroactively.

## Verification (per checkpoint)

- **Dev:** `astro dev` serves static pages, the applet, and `/api/*` on one origin.
- **Tests:** `pnpm test:unit` green in seconds; `pnpm test:e2e` green before any PR; CI runs
  the former on every push and the latter on PRs, against a per-run Neon branch.
- **Static:** view-source on `/`, `/about`, `/pricing` shows real HTML, not an empty root.
- **Islands:** the nav user island hydrates from `/api/auth/me`; the applet mounts only on
  app routes.
- **Preview deploy:** function count ≈ 1; endpoints reachable; Stripe webhook receives.
- **Design:** each screen checked against its mock in `frunk-proj/branding/mock/`.
- **A11y:** WCAG AA contrast on both themes — the palette in `docs/DESIGN.md` is already
  verified; keep new components to that bar.
