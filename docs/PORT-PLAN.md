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
store is deferred (Decision 6) so they are not needed yet. `password.ts` is superseded —
Better Auth owns hashing (Decision 2). `email.ts` is a **template rather than a copy**: its
message bodies are worth keeping, but its SES transport is replaced by Resend (Phase 5), and
verification mail — dropped when auth was passkeys — returns under Better Auth, routed
through the same shared `sendEmail()` helper as the contact form.

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

   **Status 2026-09-19: resolved. Both follow-ups closed.**

   - ~~`hello@frunk.cloud` is now dead.~~ **Live again.** The forwarding was re-homed from
     Cloudflare Email Routing to **Namecheap Email Forwarding** — Advanced DNS → Mail
     Settings → *Email Forwarding* provisions the apex MX and SPF, and the alias itself is
     mapped on the **Domain** tab under *Redirect Email* (`hello` → the owner's address),
     which is a separate screen and easy to miss. The address is safe to keep on the privacy
     page, in the footer `mailto:`, and as Phase 5's contact-form destination.
   - ~~Confirm both hostnames resolve to Vercel and the certificate issued.~~ Done — apex is
     canonical and serves, `www` 308-redirects to it, both over valid TLS.

   **The apex MX is the contended record.** Namecheap's forwarding claims it. So does
   Resend's optional *Enable Receiving*, which warns about exactly this — enabling it would
   replace the forwarding MX and kill `hello@`. Frunk never needs inbound mail
   programmatically, so **leave Resend receiving off**; sending is all that is required, and
   it lives on `send.frunk.cloud` where it cannot collide.

   Final shape:

   | role | records | owner |
   |---|---|---|
   | Sending | `resend._domainkey` TXT, `send`/`rsend` CNAME | Resend |
   | Receiving | apex MX ×5, apex SPF | Namecheap forwarding |
   | Policy | `_dmarc` TXT (`p=none`) | — |
   | Web | apex + `www` → Vercel | Vercel |

   No `rua=` on the DMARC record, so no aggregate reports arrive — add one before tightening
   past `p=none`, since those reports are the evidence that tightening is safe.

   **Email DNS is still unconfigured** — SPF covers Namecheap forwarding only, with no DKIM
   and no DMARC. Superseded in detail by the Resend item in Phase 6; the short version is
   that nothing can send as `noreply@frunk.cloud` until the domain is verified with a
   provider, and Decision 2 makes that a prerequisite for registration working at all.
2. **Auth — DECIDED: Better Auth.** *(Revised 2026-09-17. Supersedes "passkeys + TOTP
   ported from wolfpack", which was **built and locally verified** in Phase 3 before this
   reversal. Reopens Phase 3.)*

   `better-auth` — MIT, self-hosted, a library rather than a service, so no tier and no
   per-MAU cost. Passkeys via `@better-auth/passkey`, TOTP via the bundled
   `two-factor` plugin, Drizzle adapter in core, `bearer` for Capacitor, `anonymous` for the
   demo lifecycle, and social providers as core config.

   **This is a deliberate trade, not an upgrade on every axis.** What it costs: ~1,693 lines
   across 25 files, working and verified locally, replaced by a dependency. What it buys:

   - **Capacitor `bearer` mode** — otherwise a hand-built job at Phase 6, when cross-origin
     cookies stop working from `capacitor://localhost`.
   - **`anonymous` plugin** — Decision 5's demo-converts-in-place lifecycle, which is
     currently our own code.
   - **Social providers** as config, reopening the mock's Google/Apple/GitHub row (see the
     counter-argument recorded in Phase 3 — it is not obviously wanted).
   - **Less owned security surface**, and future options (`@better-auth/sso` for an
     enterprise fleet wedge, `@better-auth/stripe` for the premium tier) as installs.

   **Timing is the argument.** Phases 4–6 are still the whole app. Swapping auth before the
   applet is built on top of it is far cheaper than after, and no accounts exist, so nothing
   migrates either way.

   **This puts email back on the critical path.** Passkeys send none; Better Auth's
   `sendVerificationEmail` does, and a failed send means a failed registration. It takes a
   function, so point it at the shared `sendEmail()` helper the contact form uses (Phase 5,
   Resend) rather than giving auth its own transport. Email DNS must be verified before this
   rework ships — see Phase 6.

   ⚠️ **Six decisions were reasoned into the code being replaced. They must be re-verified
   against Better Auth's defaults, not silently lost** — the full reasoning stays in Phase 3:

   | carried-forward decision | to check against Better Auth |
   |---|---|
   | account row written in `verify`, not `options` | does registration create the user before the ceremony completes? |
   | challenges consumed on read | is a spent challenge replayable? |
   | `RP_ID`/`RP_ORIGIN` derived from request when unset | preview deploys have per-deploy hostnames; static config cannot cover them |
   | unknown email answers 404 (deliberate oracle) | what does its default leak, and is it consistent with registration? |
   | `totp/setup` refuses to overwrite working recovery | does re-running setup destroy a working recovery method? |
   | every `astro:env` var is `access: 'secret'` | unaffected — an Astro concern, keep it |
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

9. **Server-state cache — DECIDED: TanStack Query.** *(Added 2026-09-17.)* The plan had no
   answer for server state. Phase 4 mounts a `client:only` applet with react-router, which
   has none of SvelteKit's revalidation-on-navigation — so without Query it means
   hand-rolling fetch, cache and invalidation on every screen. It sits on top of the Phase 2
   endpoints without changing their shape.

   One `QueryClient` at `AppRoot` — one island, one client, never per screen. Persist the
   cache to localStorage so a returning user repaints instantly, **but gate what persists**:
   the schema holds `insurancePolicyNumber`, `lienHolder` and `loanAccountNumber`, which must
   not sit in plaintext. Purge on sign-out, set a `maxAge`, allowlist via
   `dehydrateOptions`. Code-split per route so Phase 4 does not ship every screen upfront.

10. **Stack name — NASDAQ-VCRZ.** *(Recorded 2026-09-17.)*

    **N**eon · **A**stro · **S**hadcn · **D**rizzle · **A**uth (Better) · **Q**uery
    (TanStack) · **V**ercel (Blob/Analytics) · **C**apacitor · **R**eact · **Z**od

    Rule: **every letter names a decision, not a default.** Node, TypeScript, Vite and
    ESLint are therefore absent — Vite comes *with* Astro rather than being chosen beside it
    — which says nothing about whether they are used. Tauri is out by Decision 7 (restore the
    letter when that reverses); nanostores is out because Better Auth brings it either way.
    Recorded in `_PROJECTS.md`.

11. **Testing — DECIDED: Vitest-weighted, Playwright for flows.** *(Added 2026-09-17.)*

    `legacy/` still holds 7 Playwright suites (618 lines) asserting against SvelteKit markup;
    they do not survive. Principle: **push tests away from markup, because markup churns.**

    **① API integration tests (Vitest, node) — the bulk.** The Phase 2 endpoints are HTTP in,
    JSON out, so these survive every UI change. They are also where the security boundary
    now lives: post-port each endpoint is independently reachable, so one missing check is a
    leak. Per endpoint — no session → 401; valid session but another user's row → 404/403,
    never the row; own row → 200; `DEMO`-role session → isolated identically. That last case
    is not optional: Decision 5 rests demo safety entirely on `user_id` scoping.

    **② Component tests — few.** Only components that *compute*: validation, date maths,
    currency and VIN formatting. Not "does the card render the title".

    **③ E2E (Playwright) — four or five.** Cross-system flows only, never per-entity CRUD:
    register → sign in → sign out; demo → create → convert with data intact; one CRUD happy
    path; and upload a document → assert it is **not** publicly fetchable (the Phase 4
    privacy fix, which regresses silently).

    **Test database: a Neon branch per CI run**, seeded from `seed-office.ts`, dropped after.
    See "An accident worth recording" above for why tests must not reach a real database.

    **Split the scripts** — `pnpm test:unit` (seconds, run constantly) and `pnpm test:e2e`
    (minutes, before PR). CI runs unit on every push, e2e on PRs.

    **Lint becomes a gate.** It was excluded because ~821 files failed prettier — debt in
    files this port replaces wholesale. Format new files from the start and add lint to CI
    once Phase 4 lands.

    **Skipped: visual regression.** Noisy across font rendering and CI-vs-local, and during
    an active redesign every intentional change reads as a failure. Revisit once settled.

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

## An accident worth recording

**On 2026-09-03, CI applied the port's schema to the legacy production database.**

`.github/workflows/e2e.yml` was configured `on: push` with no branch filter, and among
its steps was `npx drizzle-kit push --force` against `secrets.DATABASE_URL`. That secret
is the **legacy** database — it is what `db-backup.yml` dumps daily. So every push to the
port branch ran a schema push, and once this branch gained a root `drizzle.config.ts`
(commit `5cfd35b`), that push resolved against the *ported* schema.

Run [#94](https://github.com/mark-mcdermott/frunk/actions/runs/33701953738) applied exactly
three statements, and nothing since (later runs report "No changes detected"):

```sql
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_uuid_fk";
ALTER TABLE "user" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_uuid_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid")
  ON DELETE cascade ON UPDATE no action;
```

**Assessment: not destructive, but a real change to production.** No table, column or row
was dropped — the log shows no `CREATE TABLE`, which is also how we know the target was the
legacy database and not the blank one. Both changes loosen rather than tighten:

- `password_hash` nullable — existing rows unaffected, and the SvelteKit app always writes
  a hash, so nothing it does breaks.
- `session.user_id` now cascades — deleting a user used to raise a foreign-key error and now
  removes their sessions instead. That is arguably the bug fix described in Phase 2, but it
  is a live behaviour change nobody asked for.

frunk never launched, so no real user data was exposed to this. `frunk-daily-backups`
holds `latest.sql` if a revert is ever wanted; the two statements reverse as:

```sql
ALTER TABLE "session" DROP CONSTRAINT "session_user_id_user_uuid_fk";
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_uuid_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("uuid");
-- only if every row has one:
ALTER TABLE "user" ALTER COLUMN "password_hash" SET NOT NULL;
```

**Fixed** by replacing `e2e.yml` with `ci.yml` on this branch: typecheck and build, no
database, no secrets. The lesson is already encoded in `db-migrate.yml` — a migration is
manual, uses its own `ASTRO_DATABASE_URL` secret, and refuses to run from `main`. **No
workflow that runs automatically should hold a schema-push step.**

## Phase 3 — Auth — **REOPENED 2026-09-17** *(was DONE 2026-09-03)*

> Decision 2 was reversed to Better Auth after this phase completed. **Everything below
> describes work that was built and verified**, and is kept rather than deleted: the
> reasoning is the valuable part and most of it transfers. The React components
> (`src/components/auth/*`, ~780 lines) largely survive — they are forms. What is replaced
> is the ~900 lines of server ceremonies and client wiring.
>
> **Rework:**
>
> - Mount `betterAuth()` with the Drizzle adapter on a catch-all `/api/auth/[...all]`;
>   generate its tables with the Better Auth CLI. The existing `credentials`,
>   `webauthn_challenges` and `auth_rate_limits` tables are superseded by its schema —
>   check what `totp_secret` / `totp_enabled` on `user` become before dropping them.
> - Enable `emailAndPassword`, `socialProviders`, and the `passkey`, `twoFactor`, `bearer`
>   and `anonymous` plugins.
> - Rewire `src/lib/auth-client.ts` and the auth components to Better Auth's client; drop
>   `stores/user.ts` in favour of its session nanostore.
> - Re-point `POST /api/demo` at the `anonymous` plugin, keeping the Creed-template cloning.
> - **Walk the six carried-forward decisions in Decision 2's table** and record the answer
>   for each. That table is the deliverable of this rework, not an afterthought.
> - Re-run the full local ceremony checklist below — it is a good checklist and it still
>   applies. Then finally run it on a preview deploy, which was the one gap left in 2026-09-03.

### What was built on 2026-09-03 *(superseded — kept for its reasoning)*

- ~~Port wolfpack's `api/auth/{register,login}/{options,verify}` and `totp/*`.~~ Done.
  `_lib/session.ts` was already right: passkeys changed how a session is *established*,
  not how it is represented, so the ceremonies just call `createSession`.
- ~~Credential tables; drop `user.password_hash`.~~ Done — `credentials`,
  `webauthn_challenges`, `auth_rate_limits`, plus `totp_secret` / `totp_enabled` on
  `user`. `password_hash` is gone, and migration `0000` was regenerated rather than
  extended: the port's database had never been created, so a migration history for it
  would have been fiction.
- ~~`signin.astro` / `signup.astro` with React auth islands.~~ Done, `client:load` — the
  card is real HTML before hydration.
- ~~Nav user island + `stores/user.ts`.~~ Done. `<UserNav />` replaced the hardcoded "Get
  started" button in both `Header.astro` and the home hero.
- ~~`POST /api/demo` and the upgrade path.~~ Done, and `seed-office.ts` came with it —
  the demo has no template without it.

### What the mocks asked for and did not get

The `sign-in` and `sign-up` mocks predate Decision 2 and draw a password field, a
strength meter and a Google / Apple / GitHub row. All superseded: there is no password to
measure and no OAuth provider wired. "Forgot password?" became "Lost your passkey?", and
the OAuth row became **"Explore the demo"** — the more valuable button, since a demo
account converts in place.

The mock's "Full name (optional)" is also gone: there is no column for it, and a field
that writes nowhere is worse than an absent one. Add a `name` column first if it is
wanted. `docs/DESIGN.md` §8 decision 3 is closed by this phase.

Two things the mocks do not show, because the auth model implies them: a recovery-code
step offered straight after registration (a passkey lives on one device, and there is no
reset email any more), and the `recovered` state on sign-in, which offers to put a passkey
on the device you just recovered onto.

### Decisions taken here

- **The account row is written in `verify`, not `options`.** An abandoned ceremony — one
  dismissed prompt — would otherwise leave an empty user holding an email address nobody
  could ever sign up with again.
- **Challenges are consumed on read**, so a spent one cannot be replayed.
- **`RP_ID` / `RP_ORIGIN` are optional and derived from the request when unset.** Nothing
  static can cover Vercel's per-deploy preview hostnames. Production pins them; Phase 6
  already lists both.
- **An unknown email answers 404.** An existence oracle, deliberately: registration must
  reject a taken email, so the fact is already discoverable. See `docs/API.md`.
- **`totp/setup` refuses to overwrite working recovery.** Overwriting also clears
  `totp_enabled`, so walking away from the new QR code would destroy a recovery method
  that worked a moment earlier.
- **Every `astro:env` variable is `access: 'secret'`.** A `public` server variable is
  inlined at build time, so an optional one that is unset during the build freezes as
  undefined for the life of the deploy — silently, because it has a fallback.

### Environment — set 2026-09-19

These three belong to this phase, not to Phase 6. `ENCRYPTION_KEY` in particular was never
a cutover chore: `assertProductionSecrets` refuses any ceremony on an `https://` origin
without it, which is what kept this phase's checkpoint from ever running on a deploy.

| variable | targets | why |
|---|---|---|
| `ENCRYPTION_KEY` | **production + preview** | `assertProductionSecrets` fires on *any* https origin, and preview deploys are https. Setting it on production alone leaves previews unable to run a ceremony — the actual reason this checkpoint stalled. |
| `RP_ID` | production only | `frunk.cloud` |
| `RP_ORIGIN` | production only | `https://frunk.cloud` |

`RP_ID` / `RP_ORIGIN` stay **off** preview deliberately — `relyingParty()` derives them from
the request there, and nothing static can cover Vercel's per-deploy preview hostnames.

They are **config, not secrets** (the values appear in every page the site serves), so leave
Vercel's Sensitive flag off. That is not pedantry: sensitive values cannot be read back, and
`relying-party.ts` warns that a wrong value "does not fail loudly — it silently creates
passkeys that can never sign in." Being able to *see* that it reads `frunk.cloud` and not
`www.frunk.cloud` is worth more than secrecy that buys nothing. `ENCRYPTION_KEY` is the
opposite on both counts: genuinely secret, so mark it sensitive.

> ⚠️ **Never rotate `ENCRYPTION_KEY`.** The AES key is derived from it deterministically
> (`scryptSync(key, 'frunk-totp', 32)`), so a new value makes every sealed TOTP seed
> undecryptable. Per `secrets.ts`, TOTP is the only way back after a lost passkey — rotating
> this destroys every user's account recovery, silently and irreversibly. Set it once and
> store it somewhere outside Vercel, because the Sensitive flag means you cannot read it back.
> **It must survive the Better Auth migration**, which brings its own `BETTER_AUTH_SECRET`
> but does not replace this one unless the seeds are migrated too.

- **Checkpoint:** met locally, against a local Postgres, with a software authenticator
  completing the real ceremonies: register → `me` → sign in → replay refused → TOTP setup,
  enable and recover → second passkey → rate limits; then demo → create → convert in place
  → data intact. ~~Not yet run on a preview deploy — that needs the Neon database
  bootstrapped and `ENCRYPTION_KEY` set.~~ **`ENCRYPTION_KEY` is set (2026-09-19), on both
  production and preview. The remaining blocker is the Neon database bootstrap**
  (`pnpm db:bootstrap-sql`, then `db:seed-roles`), and production answers
  `GET /api/auth/me` → `{"user":null}`, so the API layer and `astro:env` resolve correctly
  on the real origin.

## Phase 4 — The applet

- `src/pages/[...slug].astro` with `prerender = false`, mounting
  `<AppRoot client:only="react" />` — `BrowserRouter` → `AuthProvider` → `App`.
- Rebuild the app screens in React against the mocks: vehicles index and detail, vendors,
  repairs, notes, galleries, maintenance schedules, user admin. Follow `docs/DESIGN.md`
  for every component.
- Uploads move to **Vercel Blob**. Use `access: 'private'` for vehicle documents — the
  current R2 setup serves everything from public `r2.dev` URLs, so any document URL is
  world-readable today. This is a privacy fix, not just a storage swap.
- Wire **TanStack Query** (Decision 9) over the Phase 2 endpoints: one `QueryClient` at
  `AppRoot`, keys per entity, mutations invalidating their entity's key, plus the gated
  persister and per-route code splitting.
- Re-establish tests per Decision 11 — the Vitest API suite first, since it is the safety
  net for everything else in this phase.
- **Checkpoint:** full CRUD on every entity; deep links and client-side routing work;
  uploads and deletes work; private documents are not publicly fetchable; revisiting a
  screen serves from cache without refetching; the Playwright flows pass; `pnpm lint` green
  and in CI.

## Phase 5 — Static surface

- Remaining marketing and legal pages as `.astro`, built to their mocks: about, pricing,
  contact, privacy, terms. `z_privacy-policy-user-tos-layout.md` specifies the legal layout
  (numbered sidebar, download PDF, version history).
- Contact form posts to an Astro endpoint, sending through **Resend** (decided 2026-09-19,
  superseding SES). Nothing was migrated — SES was never wired into the Astro app: no email
  dependency, no send code, no contact endpoint. Only the env vars existed.

  **Put it behind one `src/lib/server/email.ts` exporting `sendEmail()`**, the shape
  `legacy/src/lib/server/email.ts` already had. Both callers — this contact form and Better
  Auth's `sendVerificationEmail` (Decision 2) — go through it, so the provider stays a
  contained change. That matters because the one real argument for SES is cost at volume,
  which is worth nothing at zero users and easy to revisit behind this seam.
- No store — Decision 6. The duplicate Stripe webhook problem disappears with it.
- **Vercel Web Analytics** (`@vercel/analytics`) — one `<Analytics />` in the layout,
  cookieless, so it adds no category to the consent flow. **Web surface only:** the beacon
  path `/_vercel/insights/view` is relative and intercepted by Vercel's CDN, and a bundled
  Capacitor build runs from `capacitor://localhost` with no CDN in front of it. Acceptable
  rather than a gap — the native build bundles the applet, not the marketing site.
  What it cannot answer is Decision 5's funnel (demo → create → convert). That needs
  event-based product analytics working on all three platforms, so an absolute endpoint plus
  an API key — PostHog, or `POST /api/events` into Neon. **Deferred; do not block Phase 5.**
- **Checkpoint:** whole site navigable; view-source shows static HTML on every marketing
  page; contact form delivers.

## Phase 6 — Cutover

- ~~Point `frunk.cloud` DNS at Vercel.~~ **Done 2026-09-19.** Apex is canonical and serves;
  `www.frunk.cloud` 308-redirects to it, which is what makes `RP_ORIGIN=https://frunk.cloud`
  the correct pin (Decision 1).
- **Environment is mostly already set** — this list was wrong in three ways and is corrected
  here. It omitted `ENCRYPTION_KEY` entirely (it belongs to Phase 3, above, and is set); it
  named an `AUTH_SECRET` that exists nowhere in this codebase; and it still listed
  `STRIPE_*` and `PRINTFUL_API_KEY`, which Decision 6 dropped — those were deleted from the
  Vercel project on 2026-09-19, along with the `R2_*` vars that Vercel Blob replaces.

  | variable | state |
  |---|---|
  | `DATABASE_URL` + Neon integration vars | ✅ set (preview + production) |
  | `ENCRYPTION_KEY` | ✅ set — see Phase 3 |
  | `RP_ID`, `RP_ORIGIN` | ✅ set (production only) |
  | `RESEND_API_KEY` | ❌ **needed for Phase 5** — replaces SES |
  | ~~SES: `SES_FROM_EMAIL`, `AWS_*`~~ | 🗑 delete from Vercel — superseded by Resend, and nothing ever read them |
  | `BLOB_READ_WRITE_TOKEN` | ❌ **still missing — Phase 4 needs it for uploads** |
- No production data to migrate (frunk never launched). Re-seed with `seed-office.ts`.
- Re-point Capacitor at the new origin and verify a passkey ceremony inside the webview.
- Desktop is out of scope (Decision 7) — no Tauri step.
- ~~Resolve the DNS/email trade in Decision 1 before switching nameservers.~~ **Moot.** The
  nameservers already left Cloudflare — `frunk.cloud` now answers from Namecheap BasicDNS
  (`dns1/dns2.registrar-servers.com`) and email forwarding moved with it
  (`eforward1-5.registrar-servers.com`). Cloudflare Email Routing is gone, so the trade
  Decision 1 agonised over no longer exists.
- ~~**Email DNS is unconfigured**, and this gates the Better Auth rework.~~ **Done
  2026-09-19.** `frunk.cloud` is verified in Resend and sending is enabled. The record layout
  is in Decision 1; the part worth repeating is that **Resend never touched the apex** — it
  provisions a `send.frunk.cloud` subdomain carrying its own SPF and MX, so the apex SPF was
  left alone rather than extended. (An earlier draft of this plan said to add
  `include:amazonses.com` to the apex. That was SES-shaped advice and would have been wrong
  here — worth remembering if the provider ever changes again.)

  Still open: `_dmarc` is at `p=none` with no `rua=`, so no aggregate reports arrive. Add one
  before tightening, since those reports are what prove tightening is safe.

  > Choosing Resend over SES also removes a scheduling risk that was on this critical path:
  > **SES starts every account in sandbox**, able to send only to pre-verified addresses until
  > AWS grants production access on request. No amount of DNS fixes that, and it has a lead
  > time. Resend has no equivalent gate.
- Schedule the demo-account reaper.
- Retire the Cloudflare Pages project. Update `CLAUDE.md` and `_PROJECTS.md`.
- **Checkpoint:** prod green on one origin; auth end-to-end; Capacitor build passes.

---

## Key files / patterns

- **Reuse near-verbatim:** `src/lib/server/db/schema.ts`, `stripe.ts`, `printful.ts`,
  `email.ts`, `password.ts`.

  Two corrections: **`password.ts` is not reused** — Better Auth owns hashing (Decision 2).
  And **`email.ts` is a template, not a copy** — its `sendContactEmail` body and HTML are
  worth keeping, but its SES transport is replaced by Resend, and `sendVerificationEmail`
  now belongs to Better Auth's hook rather than being called directly.
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
