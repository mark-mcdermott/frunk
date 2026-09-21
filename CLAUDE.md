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

**Phases 0–3 are done. Phase 4's build-out is complete** — every screen family is
built (vehicles, repairs, notes, vendors, maintenance schedules, galleries, user admin,
profile, and the repair/note detail screens), uploads are live on **Vercel Blob**
(store `frunk-uploads`, **private**), and **every applet route is code-split**
(`page()` in `AppRoot.tsx` — the shell paints from the entry chunk, screens load on
first visit). What remains of Phase 4 is its checkpoint: the component/e2e test layer.

**Profile edits go through Better Auth's `updateUser`**, not `PATCH /api/users/:id` —
that endpoint refreshes the client session store, so the header avatar and name update
without a reload. The applet's sign-out, account deletion, TOTP recovery setup
(`RecoverySetup`, finally reachable again) and the demo→real passkey conversion all
live on `/profile`.

**Query client rules** (`AppRoot.tsx`): `networkMode: 'always'` on queries _and_
mutations — TanStack's default pauses fetches whenever `navigator.onLine` is false,
which renders as an infinite "Loading…"/"Saving…", and that signal is unreliable in
exactly the webviews Capacitor will put this app in. And **no retry on 4xx** — a 403 is
a 403 every time; only 5xx/network failures earn the one retry.

**How files work:** the database never stores a blob URL — it stores the app-relative
serving path (`/api/files/u/<userId>/…`). Uploads go through `POST /api/uploads` (raw
body, 10 MB, images+PDF); serving goes through `GET /api/files/[...path]`, which checks
the session and the `u/<userId>/` pathname prefix on every request (foreign file = 404,
no existence oracle). `src/lib/server/files.ts` is the only module that touches
`@vercel/blob`. Delete/replace endpoints clean their blobs; an upload abandoned before
its form is saved leaves an orphan (accepted, see the plan). Read
`docs/PORT-PLAN.md` before doing anything here; it records what is settled and what is
outstanding.

## Stack (the port target, at the repo root)

- **Astro 7** with **React 19** islands, TypeScript
- **Tailwind CSS 4** + **shadcn/ui** — the `base-nova` style, which is built on **Base UI**
  (not Radix) and imports its class helper from the **`cn` package**, shadcn's own
  clsx+tailwind-merge replacement. `src/lib/utils.ts` was deleted so there is one
  implementation; `clsx` and `tailwind-merge` went with it
- **Neon** serverless Postgres via **Drizzle ORM**
- **Vercel** (`@astrojs/vercel`), **Vercel Blob** for file storage
- **Better Auth** for auth (Decision 2) — email+password, passkeys, TOTP recovery and
  anonymous (demo) accounts, replacing ~900 lines of hand-rolled ceremonies
- **Resend** for transactional email — the contact form (Phase 5) and, once Decision 2's
  Better Auth rework lands, verification mail. Both behind one `src/lib/server/email.ts`.
  Supersedes AWS SES, which was never wired into this app
- **Capacitor** (iOS/Android) — the shells live at the repo root (`ios/`, `android/`,
  `capacitor.config.ts`) and **load the deployed origin** rather than bundling; `pnpm
cap:sync` after a dependency change, `CAP_SERVER_URL=http://localhost:<port>` to point a
  build at a dev server. **WKWebView refuses WebAuthn unless the app is associated with
  the site**: `public/.well-known/apple-app-site-association` names the app and
  `ios/App/App/App.entitlements` carries `webcredentials:frunk.cloud` — with both, a demo
  converted and signed back in with a passkey inside the app (simulator, against
  production, 2026-09-21). The entitlement's `?mode=developer` suffix is for Xcode builds;
  drop it for a store build. Email + password works there too.

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

| branch        | endpoint                   | used by                                           |
| ------------- | -------------------------- | ------------------------------------------------- |
| `production`  | `ep-wild-glitter-a4wusipf` | **Vercel** — `DATABASE_URL`, Production + Preview |
| `development` | `ep-odd-credit-a42d9jqu`   | **local `.env`**                                  |

`DATABASE_URL` in Vercel is **hand-set and Sensitive**, not integration-managed. The Vercel
Marketplace Neon integration was deliberately removed: it had provisioned a _third_,
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

The legacy commands (`pnpm test`, `db:push`) still live in `legacy/package.json` and run
from that directory with its own `pnpm install`. Its `cap:*` scripts are dead — the shells
moved to the root.

## Verify loop

A change is done when **`pnpm check` reports 0 errors**, **`pnpm lint` reports 0 errors**,
**`pnpm format:check` is clean** and **`pnpm build` passes**. ESLint (flat config,
typescript-eslint, `react-hooks`, `jsx-a11y`, the Astro plugin) and Prettier (tabs, single
quotes, no trailing commas, 100 columns, Tailwind class sorting — the legacy app's style,
carried over) both run in CI's `check` job. `legacy/` is excluded from both.

`react-hooks/set-state-in-effect` is an **error**. Every form page is a loader that renders
a form component keyed on the row (`<VendorForm key={existing?.id ?? 'new'} …>`), so state
is seeded at mount from a prop and never set in an effect. That is the pattern to reach for.

`pnpm test:unit` runs the API integration suite (Decision 11) — the four-case ownership
matrix per entity, over HTTP against a throwaway `frunk_test` database. `tests/run.sh`
owns the server and database; read its header before changing it, because Astro's dev
server fails silently in two separate ways under Vitest. **Two checkouts cannot run it at
once**: both use `frunk_test` and port 4455, so the second inherits the first's rows and
rate-limit counters (a spurious 429 from `/api/demo` is the symptom). Set `TEST_DB` and
`TEST_PORT` in one of them.

**Nothing else may run `astro` in a checkout while a dev server is up in it** — the
harness's or your own. `astro check` (and so `pnpm check`) alongside a running
`astro dev` leaves that server's Vite dependency cache stale, and every page it serves
from then on answers 504 "Outdated Optimize Dep" until it is restarted. Run the verify
loop first, then the suite.

`pnpm test:e2e` runs the **browser journeys** (`tests/e2e/`, Playwright, chromium only)
through the same harness (`tests/run.sh --e2e`). Eight specs, serial, in filename order,
sharing one demo account (the demo endpoint allows three per hour; the run uses two).
They cover what only a real browser reaches: the forms end to end with the columns
checked in Postgres after (including the schedules and galleries edited in place on the
vehicle screen), real file uploads with the blob checked in the store after each delete,
**the passkey ceremony via a CDP virtual authenticator** (demo→real conversion, sign-out,
passkey sign-in), and TOTP recovery enrolled from the profile with codes generated by
`otplib`. Selectors are roles and
labels, never markup — the legacy suites died of markup coupling. The upload specs skip
without `BLOB_READ_WRITE_TOKEN`, which the harness exports from `.env.local` locally and
CI deliberately lacks. Two things `tests/e2e/support.ts` knows that are easy to forget:
the auth pages are `client:load`, so a fill before hydration is wiped when React syncs
the controlled input (`hydrated()` waits for it); and `textContent` of the secret button
glues the sr-only label onto the base32 with no space.

There is deliberately **no component-test layer**: every applet bug found so far lived at
the integration or database level, which jsdom would have mocked away.

CI (`.github/workflows/ci.yml`) runs typecheck, build, the API suite and the journeys,
each against a throwaway Postgres service container. Decision 11's Neon-branch-per-run
was not adopted: the container needs no credentials and exercises the same handlers.
The one path it never touches is `getDb()`'s Neon HTTP driver.

**No automatically-triggered workflow may touch a database.** The `e2e.yml` it replaced ran
`drizzle-kit push --force` on every push to every branch, against the secret that points at
the _legacy_ database, and duly rewrote the live app's schema from this branch. See
"An accident worth recording" in `docs/PORT-PLAN.md`. Migrations go through
`db-migrate.yml`: manual only, its own `ASTRO_DATABASE_URL` secret, refuses to run from a
ref without `astro.config.mjs`. Its `seed-office` action is how production gets its
template garage — the production connection string is Sensitive on Vercel, so nothing
local can reach it.

## Architecture (the port target)

- `src/pages/` — Astro routes. Static `.astro` for marketing and legal; `/api/*` as Astro
  endpoints; the app mounts as a single `client:only` React island.
- `src/app/` — the applet: `AppRoot` (QueryClient + router), `AppShell` (the signed-in
  chrome), `routes/` (one component per screen), `components/` (shared applet pieces),
  `format.ts` (**every cents↔dollars and ISO↔date-input conversion**, so no screen does
  that arithmetic inline) and `api.ts` (the typed fetch layer and the query keys). A screen declares its breadcrumb
  trail with `useCrumbs()` — the header sits outside the router outlet, so an entity name
  is only known once the page has loaded it. **Mounted by one catch-all per section** — `src/pages/vehicles/[...slug].astro`,
  `src/pages/vendors/[...slug].astro` — not a root catch-all, which would answer 200 for
  every mistyped URL on the site and destroy real 404s. Adding a screen means adding its
  route to `AppRoot` _and_ a three-line `[...slug].astro` for its section.
- `src/components/` — Astro components and, from Phase 4, React. `src/components/ui/` is
  shadcn's target directory — **generated files, kept unedited so they survive being
  re-added.** Project sizing lives in `src/app/components/Field.tsx`, not in them.

**shadcn's token vocabulary is bridged in `src/styles/global.css`**, not pasted onto each
component: `background` / `foreground` / `primary` / `muted` / `ring` map onto the
elevation-named tokens this design layer actually uses, so a newly added component
inherits the measured palette on arrival and re-resolves inside `.surface-light` for free.

**One token cannot be bridged: `accent`.** shadcn means "subtle hover surface"; here it is
the brand violet, and `bg-accent` / `focus:border-accent` already carry that meaning in the
nav, footer, auth fields and applet. After any `shadcn add`, grep the new file for
`accent` and change it to `muted` — `select.tsx` needed exactly that.

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
  passkey plugin takes a _static_ `rpID`/`origin`, but nothing static covers Vercel's
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
  **Conversion is an `after` hook in `config.ts`** on `/passkey/verify-registration`: it
  flips `roles` from DEMO to USER and clears `isAnonymous`, so the two flags never
  disagree. **Email sign-up is not a conversion path and is refused (409) while a demo
  session exists** — a `before` hook on `/sign-up/email` in the same file. Better Auth's
  sign-up always mints a _second_ account, and the anonymous plugin then treated the next
  sign-in from that browser as a _link_ and deleted the demo account, garage included
  (reproduced 2026-09-20: three vehicles, then none). That delete is now off
  (`anonymous({ disableDeleteAnonymousUser: true })`): no auth ceremony deletes a demo
  account, only the reaper does. "Keep my data" and the sign-up page both send a demo
  visitor to `/profile`'s passkey prompt; `tests/demo-conversion.test.ts` asserts both
  guards in Postgres. A converted account keeps its placeholder address
  (`hasPlaceholderEmail`) and has no password, so it cannot enrol TOTP recovery until a
  set-password flow exists. `roles` stays authoritative for gating. `POST /api/demo` needs `pnpm db:seed-office`. **Unconverted
  demos are reaped after seven days** by `GET /api/cron/reap-demos` — a Vercel cron
  (`vercel.json`, production only) presenting `CRON_SECRET`; the predicate is DEMO role,
  no passkey, older than the window, and the account's blobs go with its rows.
- **TOTP is recovery in intent and a second factor in mechanism.** Better Auth's plugin
  does not know the difference: once a code is enrolled, `sign-in/email` answers
  `{ twoFactorRedirect: true }` plus a challenge cookie instead of a session, and only
  `verify-totp` against that cookie opens one (verified over HTTP 2026-09-20). A cold
  `verify-totp` — the old "Lost your device?" form — is a 401. `signIn()` in
  `auth-client.ts` returns the challenge as a value and `SignInForm` carries on to the
  code; `recoverWithCode` trusts the device for thirty days. The recovery journey walks it.
- **`BETTER_AUTH_SECRET` is effectively unrotatable.** Better Auth encrypts TOTP secrets
  and backup codes at rest _with a key derived from it_ — verified 2026-09-19 by enabling
  TOTP under one secret, restarting under another, and watching `get-totp-uri` fail with a
  ChaCha decryption error. Sign-in still works (password hashes are independent), so the
  damage is silent: rotating does not merely log people out, it destroys every user's only
  way back after a lost passkey. **Store it outside Vercel**, where Sensitive values cannot
  be read back.

  Because that encryption exists, `src/lib/server/auth/secrets.ts` and `ENCRYPTION_KEY`
  were dead code; both are gone (the module on 2026-09-20, the Vercel variable with it).

**Island classification rule:** does a live browser runtime need to exist for this to
render? Yes → `client:only`. No → `client:load` / `client:visible`. Cross-island state is a
**nanostore, not React context** — each island is its own React root. **A form whose
submit only works with JS is a "yes"** — `client:load` puts a working-looking form in the
HTML before React owns it, and anything typed before hydration is wiped when the controlled
inputs sync. Give it a `slot="fallback"` skeleton (`.skeleton` in `global.css`,
`AuthCardSkeleton.astro` as the model) so the page still paints instantly.

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
  required status checks and GitHub's own auto-merge would merge _immediately_ rather than
  waiting for CI. Wait for green, then merge.
- Strict TypeScript — no `any` (enforced by lint). Prefer extracting a shared helper over
  repeating a cast.
- `pnpm format` before committing; CI rejects unformatted files.

## Known rough edges

- **No photography.** The studio renders live in `frunk-proj/branding/mock/`, outside the
  repo; only flattened WebP mocks were committed. `src/components/MockImage.astro` stands in.
- **Placeholder marketing copy** on the home page — the three testimonials are the mock's
  own placeholder names. Replace before the Phase 6 cutover.
- The two duplicate Stripe webhook handlers in `legacy/` are moot — the store is dropped
  (Decision 6) and neither is ported.

## Roadmap

**`docs/PORT-PLAN.md` is the roadmap** until the port lands. `README.md`'s roadmap predates
it and is stale — several of its items (cleanroom components, Tauri, the merch store) are
now explicitly dropped or superseded by the port's decisions.
