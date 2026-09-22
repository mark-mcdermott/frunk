# Port Plan: frunk → Astro + React islands on Vercel

> **How to resume with cleared context:** tell a fresh session
> _"Read `docs/PORT-PLAN.md` and execute it phase by phase."_
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
_hosting/packaging_ — its app was already React. frunk's is three changes at once:

|            | from                                                           | to                              |
| ---------- | -------------------------------------------------------------- | ------------------------------- |
| View layer | 60 `.svelte` components                                        | React (a genuine rewrite)       |
| Data layer | 41 `+page.server.ts` load functions & 33 files of form actions | REST endpoints the applet calls |
| Host       | Cloudflare Pages, Workers R2 bindings                          | Vercel, Vercel Blob             |

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

| Surface                                             | Rendering                                  | Notes                                  |
| --------------------------------------------------- | ------------------------------------------ | -------------------------------------- |
| Home, about, pricing, contact, legal, privacy       | **Astro static**                           | SEO + instant paint, no JS             |
| Header / footer                                     | **Astro** + tiny `client:only` user island | reads `/api/auth/me` via a nanostore   |
| Sign in / sign up                                   | **Astro page** + React auth island         | `client:only` — WebAuthn is browser JS |
| Vehicles, vendors, repairs, notes, galleries, users | **`client:only` applet**                   | react-router owns navigation           |
| `/api/*`                                            | **Astro endpoints**                        | one bundled Vercel function            |

**Island classification rule** (from wolfpack): _does a live browser runtime need to exist
for this to render?_ Yes → `client:only`. No → `client:load` / `client:visible`.

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
   breakage.** The domain is registered at _Namecheap_, but its nameservers point at
   _Cloudflare_ (`zainab`/`valentin.ns.cloudflare.com`), so Cloudflare answers DNS today and
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
     Settings → _Email Forwarding_ provisions the apex MX and SPF, and the alias itself is
     mapped on the **Domain** tab under _Redirect Email_ (`hello` → the owner's address),
     which is a separate screen and easy to miss. The address is safe to keep on the privacy
     page, in the footer `mailto:`, and as Phase 5's contact-form destination.
   - ~~Confirm both hostnames resolve to Vercel and the certificate issued.~~ Done — apex is
     canonical and serves, `www` 308-redirects to it, both over valid TLS.

   **The apex MX is the contended record.** Namecheap's forwarding claims it. So does
   Resend's optional _Enable Receiving_, which warns about exactly this — enabling it would
   replace the forwarding MX and kill `hello@`. Frunk never needs inbound mail
   programmatically, so **leave Resend receiving off**; sending is all that is required, and
   it lives on `send.frunk.cloud` where it cannot collide.

   Final shape:

   | role      | records                                       | owner                |
   | --------- | --------------------------------------------- | -------------------- |
   | Sending   | `resend._domainkey` TXT, `send`/`rsend` CNAME | Resend               |
   | Receiving | apex MX ×5, apex SPF                          | Namecheap forwarding |
   | Policy    | `_dmarc` TXT (`p=none`)                       | —                    |
   | Web       | apex + `www` → Vercel                         | Vercel               |

   No `rua=` on the DMARC record, so no aggregate reports arrive — add one before tightening
   past `p=none`, since those reports are the evidence that tightening is safe.

   **Email DNS is still unconfigured** — SPF covers Namecheap forwarding only, with no DKIM
   and no DMARC. Superseded in detail by the Resend item in Phase 6; the short version is
   that nothing can send as `noreply@frunk.cloud` until the domain is verified with a
   provider, and Decision 2 makes that a prerequisite for registration working at all.

2. **Auth — DECIDED: Better Auth.** _(Revised 2026-09-17. Supersedes "passkeys + TOTP
   ported from wolfpack", which was **built and locally verified** in Phase 3 before this
   reversal. Reopens Phase 3.)_

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

   **Identity — DECIDED 2026-09-19: adopt Better Auth's `user.id`; retire `user.uuid`.**

   This is the substantive half of Decision 2 and it was not obvious from "swap the auth
   library". Better Auth owns the user table and issues its own text primary key, while
   frunk's identity is `user.uuid` — every entity's `user_id` is a text FK to it, and the
   ownership pattern in `guard.ts` takes `userUuid` throughout. That is **109 references**
   across `src/pages/api` and `src/lib/server`.

   Three ways to reconcile were weighed:

   |                                    | what it does                                                                  | cost                                                                                                                                                              |
   | ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **A — adopt `user.id`** _(chosen)_ | retarget every FK from `user.uuid` to `user.id`, rename `userUuid` → `userId` | large mechanical diff, one time                                                                                                                                   |
   | B — map onto existing tables       | tell the Drizzle adapter `id`→`uuid`, `email`→`username`                      | permanent friction: `emailVerified` is `integer` where it wants `boolean`, PK is `serial` where it wants text; every future plugin re-checked against the mapping |
   | C — two user tables, linked        | Better Auth keeps its own; a join links them                                  | two answers to "who is this person", forever                                                                                                                      |

   A wins because the churn is mechanical rather than structural — both columns are `text`,
   so it is a retarget and a rename, not a data migration — and because it ends the existing
   oddity of `user` carrying _two_ identities (`id serial` **and** `uuid text`). There is no
   production data, which is the condition that makes it cheap; that condition will not
   recur.

   **This is why Phase 3 gates Phase 4.** All ~22 applet screens are user-scoped, so each one
   threads a user identity through fetch and ownership check. Built against `uuid` and then
   migrated, every screen is revisited. Built after this lands, they are written once.

   ⚠️ **Six decisions were reasoned into the code being replaced. They must be re-verified
   against Better Auth's defaults, not silently lost** — the full reasoning stays in Phase 3:

   **Answered 2026-09-19** against Better Auth 1.7.5, running on a real database:

   | carried-forward decision                            | outcome                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
   | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | account row written in `verify`, not `options`      | **Moot.** Email+password has no two-step ceremony, and `addPasskey` requires an existing session — so there is no window in which an abandoned ceremony can strand an empty row.                                                                                                                                                                                                                                                                                                        |
   | challenges consumed on read                         | **Verified 2026-09-20** in the passkey journey: the exact assertion that just signed in, replayed through the API, is refused.                                                                                                                                                                                                                                                                                                                                                          |
   | `RP_ID`/`RP_ORIGIN` derived from request when unset | **Preserved.** `getAuth()` caches one instance per origin rather than taking static config — see `server/auth/config.ts`.                                                                                                                                                                                                                                                                                                                                                               |
   | unknown email answers 404 (deliberate oracle)       | **Reversed, and better.** Sign-in returns an identical `Invalid email or password` for known and unknown addresses, and **sign-up with an existing address also returns 200** with a phantom id, creating nothing. Better Auth is anti-enumeration on both endpoints. The old reasoning — "registration must reject a taken email, so the fact is already discoverable" — no longer holds, because registration does not reject.                                                        |
   | `totp/setup` refuses to overwrite working recovery  | **Preserved — no guard needed.** Better Auth refuses with `TOTP_ALREADY_ENABLED` once a secret is _confirmed_, and replaces one that is not. That is exactly the old rule: `totpEnabled` stayed false until a code was produced, so a half-finished setup could be redone but a working one could not be clobbered. _(An earlier note here claimed a regression. That was a bad test — it enabled twice without ever confirming the first, so there was no working method to protect.)_ |
   | every `astro:env` var is `access: 'secret'`         | Unaffected, kept.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

   **And the encryption question is settled: Better Auth encrypts at rest.** The stored
   `two_factor.secret` is hex (`e4b8f6f9…`) while the otpauth URI carries base32
   (`O55FK5JZ…`); `backup_codes` is likewise not plaintext. So **`src/lib/server/auth/secrets.ts`
   is redundant** and `ENCRYPTION_KEY` loses its only caller.

   > ⚠️ **Confirmed 2026-09-19: `BETTER_AUTH_SECRET` is unrotatable.** The encryption key
   > _is_ derived from it. Tested by enabling TOTP under one secret, restarting the server
   > under another against the same database, and calling `get-totp-uri`: it fails inside
   > `rawDecrypt` (`better-auth/dist/crypto`) with a ChaCha error. Sign-in still succeeds,
   > because password hashes do not depend on it — so the loss is silent and total.
   >
   > Rotating therefore destroys every user's recovery method, which is precisely the
   > property `ENCRYPTION_KEY` was documented as having. Treat it as permanent and keep a
   > copy outside Vercel.

   **Two UX consequences that need building**, both from the anti-enumeration default:

   - Signing up with an address that already exists shows "Check your email" and sends
     nothing. The user is stranded with no feedback and no account.
   - The same is true when the verification mail fails, since it is a background task
     (see `server/email.ts`). "Resend verification email" is on the sign-up screen for
     exactly this, but it cannot help someone who already has an account.

3. **Component library — DECIDED: shadcn.** The earlier "no component library" call was
   made while the target was Svelte; on React, shadcn matches wolfpack and the S in every
   `_PROJECTS.md` stack acronym.
4. **Repo shape — DECIDED: flat, the stock Astro layout.** No `apps/` or `packages/`
   nesting. wolfpack is a monorepo to separate its design system from its app; frunk has
   nothing to share yet, and flat→monorepo later is a mechanical move, not a rewrite.
   The default layout also means every Astro doc applies verbatim and Vercel needs no
   root-directory configuration.
5. **Demo — DECIDED: it is an account type, not a mode.** This is a _conversion feature_,
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
     _attaching a passkey to the account the visitor is already using_. No migration, no
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

9. **Server-state cache — DECIDED: TanStack Query.** _(Added 2026-09-17.)_ The plan had no
   answer for server state. Phase 4 mounts a `client:only` applet with react-router, which
   has none of SvelteKit's revalidation-on-navigation — so without Query it means
   hand-rolling fetch, cache and invalidation on every screen. It sits on top of the Phase 2
   endpoints without changing their shape.

   One `QueryClient` at `AppRoot` — one island, one client, never per screen. Persist the
   cache to localStorage so a returning user repaints instantly, **but gate what persists**:
   the schema holds `insurancePolicyNumber`, `lienHolder` and `loanAccountNumber`, which must
   not sit in plaintext. Purge on sign-out, set a `maxAge`, allowlist via
   `dehydrateOptions`. Code-split per route so Phase 4 does not ship every screen upfront.

10. **Stack name — NASDAQ-VCRZ.** _(Recorded 2026-09-17.)_

    **N**eon · **A**stro · **S**hadcn · **D**rizzle · **A**uth (Better) · **Q**uery
    (TanStack) · **V**ercel (Blob/Analytics) · **C**apacitor · **R**eact · **Z**od

    Rule: **every letter names a decision, not a default.** Node, TypeScript, Vite and
    ESLint are therefore absent — Vite comes _with_ Astro rather than being chosen beside it
    — which says nothing about whether they are used. Tauri is out by Decision 7 (restore the
    letter when that reverses); nanostores is out because Better Auth brings it either way.
    Recorded in `_PROJECTS.md`.

11. **Testing — DECIDED: Vitest-weighted, Playwright for flows.** _(Added 2026-09-17.)_

    `legacy/` still holds 7 Playwright suites (618 lines) asserting against SvelteKit markup;
    they do not survive. Principle: **push tests away from markup, because markup churns.**

    **① API integration tests (Vitest, node) — the bulk.** The Phase 2 endpoints are HTTP in,
    JSON out, so these survive every UI change. They are also where the security boundary
    now lives: post-port each endpoint is independently reachable, so one missing check is a
    leak. Per endpoint — no session → 401; valid session but another user's row → 404/403,
    never the row; own row → 200; `DEMO`-role session → isolated identically. That last case
    is not optional: Decision 5 rests demo safety entirely on `user_id` scoping.

    **② Component tests — few.** Only components that _compute_: validation, date maths,
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
- ~~A Vercel Blob store does not exist yet.~~ **`frunk-uploads` (private, iad1) exists and
  is connected (2026-09-19).**
- ~~Audit R2 for live user data worth migrating.~~ **Nothing to migrate.** Two buckets exist:
  - `frunk-avatars` — bound as `R2_AVATARS` in `wrangler.toml`. frunk never launched, so it
    holds no real user data. Uploads were also guarded by `!import.meta.env.DEV`, so they
    only ever ran in production.
  - `pub-9903686a35b440c6b73f8b917ba808c8.r2.dev` — public bucket of Printful merch mockups,
    referenced only by `src/lib/data/products.ts`. Dropped with the store (Decision 6).

### Outstanding manual setup (Mark)

Phase 1 builds and passes locally; it cannot be _deployed_ until these exist:

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

- ~~**No photography.**~~ **Landed 2026-09-21.** The studio automotive renders lived in
  `frunk-proj/branding/mock/`, outside the repo, and `src/components/MockImage.astro` stood
  in at the right aspect ratio with the violet rim light. Mark sliced all six from the PSD
  at twice their slot (hero and page leads, three pillar tiles, the phone, the closing
  compartment, the about page's desk at night); they live in `src/assets/renders/` and are
  served through `astro:assets` by `Render.astro` as AVIF and WebP. The placeholder is gone.
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
build and typecheck. ~~Delete the directory at the end of Phase 5.~~ **Deleted 2026-09-21**,
once the Cloudflare project was gone; the last commit holding it is `5f2364c`. `legacy/`
also held the Capacitor shells (`android/`, `ios/`, `capacitor.config.ts`), which are pinned to the
SvelteKit dev port and `build/` output; ~~Phase 6 re-points them at the Astro origin~~
**moved to the repo root and re-pointed 2026-09-20 — see Phase 6.**

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

_Unauthenticated calls are rejected_ — all 18 routes answer 401 except `GET /api/auth/me`,
which is 200 with `{"user": null}` by design. A cross-origin mutating call is refused, an
unknown method or path is 404, and 401 precedes 422 so an unauthenticated bad body does not
leak the schema.

_Reads and writes hit the database_ — 31 assertions against a real Postgres 16, driven
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
(commit `5cfd35b`), that push resolved against the _ported_ schema.

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

## Phase 3 — Auth — **DONE 2026-09-19** _(reopened 2026-09-17 for Better Auth; first done 2026-09-03)_

> **Closed 2026-09-19.** The Better Auth rework landed, Decision 2's carried-forward table is
> answered, and Phase 4 was built on `user.id`. Its last open row — challenge
> replay refusal — was closed 2026-09-20 by the passkey journey, which replays the assertion
> it just signed in with and asserts the refusal. `secrets.ts`, `ENCRYPTION_KEY` and `totp.ts` are
> deleted (2026-09-20).

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

### What was built on 2026-09-03 _(superseded — kept for its reasoning)_

- ~~Port wolfpack's `api/auth/{register,login}/{options,verify}` and `totp/*`.~~ Done.
  `_lib/session.ts` was already right: passkeys changed how a session is _established_,
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

### A finding after the fact — 2026-09-20

**Recovery was enrolled but unreachable.** Better Auth's `twoFactor` plugin answers a
password sign-in on an enrolled account with `{ twoFactorRedirect: true }` and a
challenge cookie, not a session; the client treated that as a user and threw, so an
account with recovery set up could no longer sign in with its password at all — and the
"Lost your device?" form posted a bare code, which the plugin refuses without the
challenge (`INVALID_TWO_FACTOR_COOKIE`). Verified over HTTP, fixed in the client
(`fix/totp-sign-in`): the password step carries on to the code, the code trusts the
device for thirty days, and the recovery journey now signs out and back in that way. The
design consequence is recorded in `docs/API.md`: TOTP is recovery in intent and a second
factor in mechanism, so a password sign-in from an untrusted browser asks for it.

### Environment — set 2026-09-19

These three belong to this phase, not to Phase 6. `ENCRYPTION_KEY` in particular was never
a cutover chore: `assertProductionSecrets` refuses any ceremony on an `https://` origin
without it, which is what kept this phase's checkpoint from ever running on a deploy.

| variable         | targets                  | why                                                                                                                                                                                                        |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY` | **production + preview** | `assertProductionSecrets` fires on _any_ https origin, and preview deploys are https. Setting it on production alone leaves previews unable to run a ceremony — the actual reason this checkpoint stalled. |
| `RP_ID`          | production only          | `frunk.cloud`                                                                                                                                                                                              |
| `RP_ORIGIN`      | production only          | `https://frunk.cloud`                                                                                                                                                                                      |

`RP_ID` / `RP_ORIGIN` stay **off** preview deliberately — `relyingParty()` derives them from
the request there, and nothing static can cover Vercel's per-deploy preview hostnames.

They are **config, not secrets** (the values appear in every page the site serves), so leave
Vercel's Sensitive flag off. That is not pedantry: sensitive values cannot be read back, and
`relying-party.ts` warns that a wrong value "does not fail loudly — it silently creates
passkeys that can never sign in." Being able to _see_ that it reads `frunk.cloud` and not
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

## Phase 4 — The applet — **DONE 2026-09-20**

**Landed 2026-09-19 — the foundation** (`feat/applet-foundation`): the island mounts, the
shell is built to the mock, and two screens read real data through TanStack Query.

- ~~`src/pages/[...slug].astro`~~ **One catch-all per section** — `src/pages/vehicles/[...slug].astro`
  and `src/pages/vendors/[...slug].astro`, each `prerender = false` and mounting the same
  `<AppRoot client:only="react" />`. A single root catch-all would swallow every unmatched
  URL in the site, so a typo'd marketing link would answer 200 with the applet instead of 404. Scoping costs one three-line file per section and keeps real 404s real. Verified:
  `/vehicles` 200, `/vendors` 200, `/nonexistent` 404.
- **The island starts at the shell, not the page body.** The app header carries the
  route-dependent active-nav dot, a contextual primary action and the avatar — all three
  want state the router owns, so putting the header in Astro would mean plumbing each
  across the boundary.
- **One `QueryClient`, module-level.** Constructing it in the component body hands every
  render a fresh cache, which presents as "the data keeps refetching". `staleTime: 60_000`
  — vehicle data changes when _you_ change it.
- **`src/app/api.ts` is the applet's whole view of the API**: it unwraps the `{ vehicles: [] }`
  envelopes once, owns the query `keys` so a mutation cannot invalidate a key the list is
  not cached under, and redirects to `/signin` on a 401 rather than rendering an empty
  screen that looks like you own nothing.
- Repairs and Notes are deliberately **absent from the nav** until their screens exist —
  dead links inside the app are the thing the marketing nav was just cleaned up to avoid.

**Landed 2026-09-19 — vehicles are full CRUD** (`feat/vehicle-crud`): detail, add, edit
and delete, verified in a browser and then at the database level (optionals stored as
`NULL` rather than `''`; a cleared field actually cleared).

- **shadcn is real now.** `button`, `input`, `label`, `select` are in `src/components/ui/`.
  Three things about the current generator were not obvious:
  - The `base-nova` style is built on **Base UI, not Radix**, and `shadcn add` did _not_
    install it — the components imported a package that was not there. `@base-ui/react`
    had to be added by hand.
  - It imports from a package literally named **`cn`** — which is shadcn's own
    clsx+tailwind-merge replacement, not a typosquat. Since `src/lib/utils.ts` had zero
    consumers, it and `clsx`/`tailwind-merge` were deleted rather than kept as a second
    implementation.
  - Its components are written against `background`/`foreground`/`primary`/`muted`/`ring`,
    which this design layer does not use. **Bridged once in `global.css`** so future adds
    inherit the palette. `accent` is the one name that cannot be bridged — see `CLAUDE.md`.
- **Generated files are kept unedited** so they survive being re-added; shadcn's `h-8`
  dashboard scale is overridden in `src/app/components/Field.tsx` instead.
- Only `input`, `label` and `select` were kept. `shadcn add` also wrote `button`, but
  buttons already have a design-system class (`.btn-primary`) used across the marketing
  site, and swapping them is a wider change than this one — an unused generated file is
  just dead code, so it was deleted rather than left waiting.
- **Three departures from `vehicle-edit.webp`**, each because the mock's control implies
  data the model does not carry: Make is a text input (a select needs a curated marque
  list; the column is free text), Engine is two fields (`engineSize` + `engineType`, joined
  for display), and Cover Image is absent (uploads are a Blob job and
  `BLOB_READ_WRITE_TOKEN` is not provisioned, so "Change Image" would do nothing).
  Nickname and Current Mileage were _added_ — the garage list renders both, and without
  them there was no way to set either.
- The detail screen's panels are **read-only**: the mock's `+ Add Note` / `+ Add Repair`
  and the per-row edit/delete icons wait for those screens, on the same dead-link rule.
  **Landed 2026-09-19 — repairs and notes are full CRUD** (`feat/repairs-and-notes`): both
  index screens with counted filter chips and search, both forms, delete on each, the nav
  entries they were waiting for, and the `+ Add Note` / `+ Add Repair` buttons the vehicle
  detail screen has been missing. `?vehicle=<id>` preselects, so those buttons never ask
  which vehicle you meant.

- **`src/app/format.ts` now owns every conversion.** Costs are cents, timestamps are ISO,
  and `<input type="date">` speaks `YYYY-MM-DD`; doing that arithmetic per screen is how
  it goes subtly wrong. Two traps it records: `toISOString().slice(0, 10)` reads the date
  in **UTC**, so an evening timestamp west of Greenwich shows the next day — verified
  against a 21:45 row, which the local-getter version reads correctly as the 15th.
- **A date-only input must not rewrite a stored timestamp.** Sending the input back on
  every save collapsed `21:45:30` to local midnight when only the _cost_ had changed. The
  form now sends the original value whenever the calendar day is untouched.
- **Three departures from `repair-edit.webp`:** Cost and Vendor are optional (the mock
  marks both required; the schema does not, and they genuinely are not); there is no Notes
  textarea (it implies a `notes` column on the repair — notes are their own rows attached
  by `repairId`, so a box there would drop its text or quietly create a note the Notes
  screen shows separately); and no attachments block, on the same unprovisioned-Blob
  grounds as the vehicle's cover image.
- **The vehicle cannot be changed after creation** on either form. `updateRepairSchema`
  omits `vehicleId` and `updateNoteSchema` accepts only `title`/`body`/`imageUrl`/`order`,
  so reparenting is not in the API — the forms state where the row lives instead of
  offering a select that would silently fail.
- **Neither index paginates**, though both mocks do. The endpoints have no cursor and
  return everything, so paging would be decoration over a full result set. It goes in with
  the endpoint's `LIMIT`.
  **Landed 2026-09-19 — vendors and maintenance schedules are full CRUD**
  (`feat/vendors-and-schedules`).

- **Vendors closed a dead end this port created**: the repair form's "Add a vendor" hint
  linked to a vendors screen that had no way to add one. The form validates that a
  website starts with a scheme — the column is free text, and a stored `example.com`
  renders as a relative link pointing inside the app.
- **The vendor delete confirmation says what actually happens**: repairs are kept and
  their `vendor_id` goes null (`docs/API.md`), so the copy promises exactly that instead
  of implying the service history goes too.
- **The vendor index intentionally contradicts its mock.** `vendor-index.webp` draws
  detached cards; DESIGN.md §5 says rows live in one card with hairline dividers, the
  other three index screens follow the spec, and one screen looking different for no
  reason costs more than matching a mock that contradicts the spec derived from it.
- **Schedules are edited in place on the vehicle panel, not on a route.** Three fields
  attached to the vehicle already on screen, no identity of their own, no mock either
  way — `/vehicles/:id/schedules/new` is navigation the record does not earn. The form
  enforces `createScheduleSchema`'s refinement (at least one interval) client-side.
  **Landed 2026-09-19 — uploads on Vercel Blob, and galleries are full CRUD**
  (`feat/uploads-and-galleries`). The store is **`frunk-uploads`, private, iad1**, created
  and connected via `vercel blob create-store` (the dashboard-API route 403s for blob
  creation; the CLI from a linked repo is what works). An earlier unconnected attempt left
  an empty orphan store — **`frunk-files` (store_nfhGNM9xPPxInwlz), delete it interactively
  with `vercel blob delete-store store_nfhGNM9xPPxInwlz`** (the CLI refuses to do it
  non-interactively, correctly).

- **Private is the point.** The legacy R2 setup served documents from public `r2.dev`
  URLs — any leaked link world-readable forever. Here a blob is only reachable through
  `GET /api/files/[...path]`, which requires a session and checks the `u/<userId>/`
  pathname prefix — a foreign user's file answers **404**, the house no-existence-oracle
  rule. Verified over HTTP: owner 200 byte-identical, no session 401, second demo user
  404, 11 MB 413, zip 415.
- **The database never stores a blob URL** — it stores the `/api/files/…` serving path.
  `<img src>` works unchanged (same-origin cookie), external seeded R2 URLs keep
  rendering, and the store could be swapped without a data migration.
- **Deletes clean their blobs**: photo delete, gallery delete (pathnames collected
  before the FK cascade erases the rows), note delete (children included), vehicle
  delete (cover + photos + note attachments), and a PATCH that replaces or clears the
  cover image deletes the old blob — verified against the live store each time.
  Cleanup is best-effort _after_ the rows are gone: a blob failure logs and leaves an
  orphan rather than failing the request.
- **Known orphan case, accepted:** upload-then-abandon (a file picked in a form that is
  never saved). Bounded, invisible to users, reconcilable later by diffing the store
  against the columns.
- Cover image on the vehicle form and attachment on the note form share `FileField`
  (upload on pick, preview, PDF chip); galleries get `GalleryEditor` on the vehicle
  panel — create/delete gallery, add/remove photos. Captions, drag-to-reorder
  (`photoOrder`) and gallery rename ride a later polish pass.
  **Landed 2026-09-19 — user admin** (`feat/user-admin`): the users table (the first
  **server-paginated** list — page/pageSize/search live in the query key,
  `keepPreviousData` holds the old page while the next loads) and the edit screen with
  role checkboxes. The nav entry is admin-gated as presentation only; the auth boundary
  stays at `requireAdmin`, and a non-admin who types /users gets the API's 403 rendered.

- **Two latent port bugs found under it**: `updateUserSchema` still carried `username`
  and `avatar` — the _pre-rename_ column names, so a PATCH with them targeted columns
  that no longer exist (now `name`/`image`; email is deliberately not editable here —
  address changes belong to Better Auth's verified flow). And self-delete ran
  Better Auth's `signOut` _after_ deleting the user row, despite its own comment saying
  it must run before — it survived only because the cascade had already destroyed the
  session and the stale cookie 401'd later anyway.
- **One real applet bug found by the 403 path**: TanStack's default
  `networkMode: 'online'` paused the query's retry when the embedded browser flickered
  `navigator.onLine`, leaving "Loading…" forever. Now `networkMode: 'always'` on queries
  and mutations (no offline mode exists to protect, and Capacitor webviews are where
  `onLine` lies most), and **4xx responses are never retried** — only 5xx/network earn
  the single retry.
- **Departures from `users-index.webp` / `admin-users-edit.webp`**, each because the
  mock draws data that does not exist: no Status column or select (no active/inactive
  flag), no Permissions checklist (no permissions model — three roles), no `+ Add User`
  (accounts are created by sign-up; a password-less admin-created account would bypass
  the only registration path), roles as checkboxes not a single dropdown (it is an
  array, and the mock's own index shows Admin+User on one row), and no avatar upload —
  files serve from the _owner's_ `u/<userId>/` prefix, so an admin-uploaded avatar
  would 404 for the user it belongs to. Avatars come with the profile screen.
- Deleting yourself is blocked on the admin screen (the API allows it — that is account
  deletion — but it belongs to the profile flow); removing your own admin role warns
  before you save.
  **Landed 2026-09-20 — the profile screen** (`feat/profile`), which pays off three debts
  at once: the applet finally has **sign out**, `RecoverySetup` is **reachable again**
  (sign-up offered it once; there was no second chance until now), and the demo→real
  **passkey conversion** (Decision 5) has a home a demo user can actually find.

- **Name and avatar save through Better Auth's own `updateUser`**, not our PATCH — it
  refreshes the client session store, so the header chip updates the moment the save
  lands. Verified live: heading, header aria-label and both avatar images changed with
  no reload; column and blob checked after every step (replace deletes the old blob,
  remove nulls the column and empties the store).
- **`DELETE /api/uploads?url=` exists for exactly this**: the entity endpoints clean
  their own blobs server-side, but the avatar column is written by Better Auth's
  endpoint, which cannot — so the client requests cleanup after the save lands, and
  the same `u/<userId>/` prefix rule makes a foreign pathname a 404.
- **Recovery is gated on the account password** (Better Auth re-checks it before
  handing out a TOTP secret), so the profile asks for it first; a demo account — which
  has no password — sees the convert-by-passkey prompt instead.
- **Self-deletion verified end to end**: confirm → row gone, sessions table empty,
  landed on the marketing page signed out.
- The mock's Notifications and Appearance rows are omitted — no notification system,
  no applet theming — and **the shell's dead Theme button is gone** (it never did
  anything; the avatar, now a link to /profile, took its slot). Applet theming is an
  open item; `setTheme()` in `src/lib/theme.ts` still has no caller anywhere.
  **Landed 2026-09-20 — the repair and note detail screens, and per-route code
  splitting** (`feat/detail-screens`). Phase 4's build-out is complete; its checkpoint
  (the e2e layer) is what remains.

- **The repair detail exists for repair-attached notes**, which surfaced nowhere else:
  the notes index endpoint only joins vehicle-attached notes, so a receipt hung on a
  repair was invisible. `+ Add Note` passes `?repair=<id>`; the note form shows "On
  this repair" instead of a vehicle select and lands back on the repair.
- **The note detail is where attachments actually render** — inline image or a
  PDF chip, through the ownership-checked `/api/files/*` route. Everything else only
  says "Has attachment".
- **Two type lies fixed**: `getRepair`/`getNote` claimed the list shapes (vendor and
  vehicle names joined in), but both endpoints return raw rows — the extra fields were
  silently `undefined`. Screens now join names from the cached lists instead.
- **Seed fix that matters for the production demo**: the seeded notes' `imageUrl`
  points at `/documents/samples/*.svg`, legacy static assets the Astro app never got —
  every demo attachment 404'd on dereference. The four sample documents are copied
  into `public/`.
- **Code splitting** (Decision 9's last piece): all 14 route components load via
  `React.lazy` with a Suspense fallback inside the shell. Verified in the build output:
  14 separate page chunks, the entry-path `AppRoot` chunk at ~12 KB.
- Mock panels not built, because the data does not exist: the repair mock's separate
  Attachments panel (a repair's attachments _are_ its notes' files) and Repair History
  (the vehicle's other repairs, already listed in full on the vehicle screen); the note
  mock's "Created by" (single-user data). Child notes render read-only when legacy
  data has them; nothing creates nested notes yet.

**Landed 2026-09-20 — the browser journeys** (`feat/e2e-journeys`): Phase 4's checkpoint.
Playwright, chromium only, eight specs in ~20 s, wired into CI as its own job.

- **Why Playwright and not a component layer**: every applet bug found during the
  build-out — the paused-retry infinite loading, the repair timestamp collapsing, the
  seeded attachments 404ing, the select sentinel leaking — lived at the integration or
  database level. jsdom mocks exactly those seams. The API suite is the light layer;
  the journeys cover what only a browser reaches.
- **The passkey ceremony is tested** via a CDP virtual authenticator — register on a
  demo account, sign out, sign in with the passkey, same user id. Nothing lighter than
  a real browser can exercise WebAuthn at all.
- **Two real fixes found by writing them**: sign-in still landed on `/` (`AFTER_AUTH`,
  whose own comment said "becomes /vehicles once the applet exists" — it did, four PRs
  ago); and the auth pages are `client:load`, so a value typed before hydration is
  wiped when React syncs the controlled input — a real race for a fast typist on a
  slow connection. ~~The journeys wait for hydration; the pages are unchanged, and
  whether they should be `client:only` is an open call.~~ **Resolved 2026-09-20**
  (`feat/auth-skeleton`): both forms are `client:only` behind an `AuthCardSkeleton`
  in the `slot="fallback"` — the same container as the card, shimmer bars in the
  form's shape, `role="status" aria-busy`. The page still paints instantly, which was
  the whole reason `client:load` had been chosen, and nothing can be typed into a form
  React does not own. The applet's Suspense fallback uses the same `.skeleton`
  primitive (`PageSkeleton`), so "loading" is one visual language. The journeys'
  hydration wait was deleted with the race.
- **Three findings**: (1) ~~adding a passkey to a demo account leaves `roles = [DEMO]`~~
  **fixed 2026-09-20** (`feat/demo-conversion`) — see the reaper bullet in Phase 6.
  (2) ~~`src/lib/server/auth/totp.ts` has no importers since Better Auth took over TOTP;
  dead code, still to delete.~~ **Deleted 2026-09-20** (`chore/loose-ends`); `otplib` is a
  dev dependency now, kept for the recovery journey. (3) ~~"Keep my data" pointed at
  email sign-up, which is not a conversion: Better Auth's sign-up mints a _second_
  account, and the anonymous plugin then deleted the demo account — garage included — on
  the next sign-in from that browser.~~ **Fixed 2026-09-20** (`fix/demo-email-signup`),
  reproduced first in the API suite as three vehicles, then none: `/sign-up/email` is
  refused (409) from a demo session, the plugin's delete is switched off
  (`disableDeleteAnonymousUser`) so only the reaper retires a demo, and both "Keep my
  data" and the sign-up page send a demo visitor to the profile's passkey prompt.
  `tests/demo-conversion.test.ts` holds it.
- **Two ways the journeys lie if written carelessly**, both recorded in `support.ts`:
  a base32 regex on the secret button's `textContent` runs into the sr-only label
  ("Invalid code" that looks like a server bug); and database checks must be scoped
  to the demo account's `user_id` — the seed has other owners' Toyotas.
- Uploads: the specs need the private store's token and skip visibly without it. CI
  has none on purpose; locally `tests/run.sh` exports it from `.env.local`.
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
- **Checkpoint — met 2026-09-20:** full CRUD on every entity; deep links and client-side
  routing work; uploads and deletes work; private documents are not publicly fetchable
  (verified 401/404 over HTTP); revisiting a screen serves from cache; the Playwright
  journeys pass in CI; `pnpm lint` green and in CI.

  **Lint arrived last** (`chore/lint`): there was no linter at all until then — ESLint and
  Prettier with the legacy app's style. The first run reformatted 87 files (one mechanical
  commit) and found 14 things, 7 of them one pattern: every form seeds its state from
  the loaded row inside an effect (`react-hooks/set-state-in-effect`). ~~Left as a **warning** with a scheduled fix~~ **Landed 2026-09-20** (`refactor/keyed-forms`):
  every form page is a loader rendering a form keyed on the row and seeded at mount, the
  rule is an `error`, and the journeys now cover the vendor, repair and note _edit_ paths
  (a seeded field is asserted before it is changed, which is what the refactor could break). The rest were real and fixed: a useless escape, a dead assignment,
  and the role checkboxes' label association. `.llm/` (untracked, gitignored) holds two
  Phase 3 scripts for the hand-rolled WebAuthn flow Better Auth replaced; ignored by
  both tools and safe to delete.

## Phase 5 — Static surface — **mostly done; see status below**

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
- **Status 2026-09-20:** `about`, `contact` (with `POST /api/contact` through Resend),
  `privacy` and `terms` exist and are live. `pricing` exists but is disabled
  (`_pricing.astro`) by decision until there is a price. ~~**Vercel Analytics is not
  installed.**~~ **Installed 2026-09-20** (`chore/loose-ends`): `<Analytics />` from
  `@vercel/analytics/astro` in `BaseLayout.astro`, so every page carries it. The legal
  pages are live and ~~unreviewed~~ **reviewed 2026-09-21** (Mark; "good for now"). (The privacy page's
  "AES-256-GCM" claim was corrected the same day: Better Auth encrypts recovery secrets,
  and the algorithm is no longer named.)
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

  | variable                               | state                                                             |
  | -------------------------------------- | ----------------------------------------------------------------- |
  | `DATABASE_URL` + Neon integration vars | ✅ set (preview + production)                                     |
  | ~~`ENCRYPTION_KEY`~~                   | 🗑 removed 2026-09-20 — Better Auth encrypts at rest (see Phase 3) |
  | `RP_ID`, `RP_ORIGIN`                   | ✅ set (production only)                                          |
  | `RESEND_API_KEY`                       | ✅ set (production + preview), verified 2026-09-20                |
  | ~~SES: `SES_FROM_EMAIL`, `AWS_*`~~     | 🗑 deleted 2026-09-21; nothing ever read them                      |
  | `BLOB_READ_WRITE_TOKEN`                | ✅ set by connecting the `frunk-uploads` store (2026-09-19)       |

- ~~No production data to migrate (frunk never launched). Re-seed with `seed-office.ts`.~~
  **Seeded 2026-09-20** through `db-migrate.yml`'s `seed-office` action (run #6), after a
  `status` run confirmed the secret reached `ep-wild-glitter` and found no template. The
  live demo button had been answering 503 since the cutover — `DemoTemplateMissing` in the
  runtime logs — because nothing had ever seeded the production branch.
- ~~Re-point Capacitor at the new origin and verify a passkey ceremony inside the webview.~~
  **Done 2026-09-20** (`feat/capacitor`), with a finding that was resolved the next day:

  - The shells moved from `legacy/` to the repo root with their history, on Capacitor 8.5.
    `capacitor.config.ts` loads the deployed origin (`CAP_SERVER_URL`, default
    `https://frunk.cloud`) rather than bundling: the applet's routes are server-rendered
    catch-alls with no static entry, and a bundled `capacitor://localhost` origin could never
    be the relying party. `webDir` is a placeholder page the shell never shows. The iOS
    build passes from the command line (`xcodebuild … -sdk iphonesimulator`); Android was
    not built here — this Mac has no Java runtime.
  - **Verified in the iOS 26 simulator against a local server on `localhost`** (a secure
    context, unlike a LAN IP): the site loads, the demo starts, the garage renders, the
    profile edits. **The passkey ceremony is refused.** `navigator.credentials.create()`
    in WKWebView throws `NotAllowedError` — "The request is not allowed by the user agent
    or the platform in the current context" — before any sheet appears. That is WebKit's
    documented stance: WebAuthn inside `WKWebView` is reserved for apps with the web
    browser entitlement. **Email + password works** in the webview, so sign-in is not
    blocked, but demo→real conversion is — and that is the funnel the whole demo design
    serves.
  - **Resolved 2026-09-21 by the cheap remedy** (PR #77). With the app associated to the
    site — `public/.well-known/apple-app-site-association` naming
    `VRFF4MSHAC.com.frunk.app` under `webcredentials`, served as `application/json` by a
    header in `vercel.json`, and `ios/App/App/App.entitlements` carrying
    `webcredentials:frunk.cloud` — WKWebView hands WebAuthn to the system. Verified in the
    iOS 26 simulator against **production**: a demo started in the app, "Add a passkey"
    raised the real "Add a passkey?" sheet, Face ID (simulated) registered it, the account
    converted ("this account is yours now"), and after signing out, "Use a passkey" on the
    sign-in page raised the sign-in sheet and landed in the garage. No native plugin needed.
    Three practicalities: the entitlement carries `?mode=developer`, which lets an
    Xcode-installed build fetch the association file straight from the site instead of
    through Apple's CDN — drop it for a store build; the simulator needs Face ID enrolled
    (Features → Face ID, or `notifyutil -s com.apple.BiometricKit.enrollmentChanged 1`)
    or the sheet says so and stops; and the passkey is labelled with the demo account's
    placeholder address (`…@anonymous.placeholder.invalid`), which is ugly in the sheet and
    in Passwords — the account-settings pass that gives converted accounts a real address
    is what fixes it. Android is the same idea with `assetlinks.json` and Credential
    Manager. **Done 2026-09-21** (PR #90): with `assetlinks.json` live and the WebView opted
    in by a Capacitor plugin at load time, the Android 16 emulator's Credential Manager
    opens its "Create passkey" sheet inside the app, labelled with the address being
    claimed. Two things the test taught: the opt-in has to run before the first page
    load (a plugin's `load()`, not `MainActivity.onCreate`), and it needs a WebView that
    advertises the feature — the Android 15 image's WebView 124 does not, the Android 16
    image's 134 does. Finishing the ceremony needs a Google account for Google Password
    Manager, which the emulator does not have; a real phone does.
  - Two fixes found by the test: the headers ran under the status bar (`viewport-fit=cover`
    plus `env(safe-area-inset-*)` padding on both headers and the applet's bottom), and the
    profile's demo branch never rendered a failed ceremony — the button just reset.

- **Sign-in throttling moved to Postgres — 2026-09-21.** Better Auth's limiter was on in
  production but in memory, one counter per Vercel instance; it now uses the database
  store (`rate_limit`), is on in every environment, and has explicit rules for the
  endpoints that cost something (10 password sign-ins a minute, 10 sign-ups and 5
  verification mails per ten minutes, per address). `tests/rate-limit.test.ts` asserts
  the 429 and the row behind it; the suites give each account its own forwarded address.
- **Native plan, decided 2026-09-21:** v1 ships as the responsive site plus "Add to Home
  Screen" — no store submission, so App Store guideline 4.2 (minimum functionality) does
  not apply yet. The iOS App Store is a v2 goal; before it, drop the developer-mode suffix
  from the entitlement, bundle the applet instead of loading it, and add native features
  worth reviewing. Android's shell is built and verified (above); it waits on the same v2 decision.
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

  ~~Still open: `_dmarc` is at `p=none` with no `rua=`.~~ **Done 2026-09-21:** the record
  carries `rua=` pointing at Postmark's free DMARC digests. Tighten to `p=quarantine` once a
  few weeks of reports show only Resend sending as frunk.cloud.

  > Choosing Resend over SES also removes a scheduling risk that was on this critical path:
  > **SES starts every account in sandbox**, able to send only to pre-verified addresses until
  > AWS grants production access on request. No amount of DNS fixes that, and it has a lead
  > time. Resend has no equivalent gate.

- ~~Schedule the demo-account reaper.~~ **Built 2026-09-20** (`feat/demo-reaper`):
  `GET /api/cron/reap-demos`, daily at 04:00 UTC from `vercel.json`, guarded by
  `CRON_SECRET` (timing-safe compare; 503 rather than open when unset). The window is
  seven days (`DEMO_TTL_DAYS`). The delete is one statement with the predicate in its
  `WHERE`, and the blobs under `u/<id>/` go with the row — `DELETE /api/users/:id` was
  leaving those orphaned too, and now uses the same cleanup. Asserted in Postgres by
  `tests/reaper.test.ts`. **Its predicate is settled (2026-09-20):** `roles`
  contains DEMO **and** the account has no passkey **and** it is older than the window.
  Conversion — an `after` hook on `/passkey/verify-registration` in `config.ts` — flips
  the role to USER and clears `isAnonymous`, so a converted account never matches; the
  no-passkey clause is the belt to that brace. ~~Two gaps a converted account carries,
  deliberately left for a later account-settings pass: it keeps the placeholder address
  and it has no password, so TOTP recovery cannot be enrolled.~~ **Closed 2026-09-21 (the
  account-settings pass):** the keep step asks for an address and a name before the
  passkey, the passkey is labelled with the address, `change-email` applies it at once
  (the placeholder is unverified) and mails the verification link, and
  `POST /api/account/password` sets a password on a kept account so recovery can be
  enrolled. `tests/account.test.ts` walks a kept account through address, password,
  verification, sign-in and recovery; the passkey journey reads the credential's label
  back from the virtual authenticator and asserts the whole conversion in Postgres.
- ~~Retire the Cloudflare Pages project.~~ **Done 2026-09-21** — deployments, custom
  domains and the project are gone; `frunk.cloud` is served by Vercel alone. ~~Update
  `CLAUDE.md` and `_PROJECTS.md`.~~ Both
  current as of 2026-09-20 (the roster on its own PR). `db-backup.yml` now dumps the
  production branch nightly (2026-09-21, from the `database` environment's secret); the
  repo-level `DATABASE_URL` secret that pointed at the legacy database can go.
- **Checkpoint:** prod green on one origin; auth end-to-end; Capacitor build passes.
  **Met 2026-09-21** on iOS: password, code and passkey sign-in and the demo conversion are
  verified on production, in the browser and inside the app, and the email path is verified
  live the same day — a real sign-up on frunk.cloud, with the verification mail delivered to
  a hey.com inbox. The two items still open that day closed the same day: the
  Android shell (Java runtime installed; the passkey sheet opens inside the app, above) and
  the Cloudflare project retirement that made the origin truly singular. **Nothing in this
  phase remains open** (2026-09-22).

---

## After the port

The plan above is complete; what follows is product work, recorded here so this file
stays the one place that says what frunk is.

- **Maintenance reminders — shipped 2026-09-22.** The roadmap's core value proposition.
  Schedules already existed as rows with intervals and a "last done"; what was missing
  was any verdict. Now: `assess()` in `src/lib/maintenance.ts` decides overdue / due soon
  (30 days or 500 miles) / on track / not started, the same function on both sides of
  the wire; the garage badges each car with its counts; the detail panel shows a pill per
  schedule and a **Mark done** form that moves "last done", moves the odometer forward
  and logs the service as a repair that counts toward the schedule (`repairs.schedule_id`);
  the repair form can link a repair to a schedule the same way, and linked repairs keep
  the schedule in step through edit and delete; the add form starts from twelve common
  services; and a daily digest (`/api/cron/maintenance-digest`, Resend) mails once per
  due cycle (`reminder_sent_at`), only to verified non-demo addresses, with a
  **Reminders** switch on the profile (`user.reminders_by_email`). The seed gives every
  car one schedule in each state and an odometer reading, so the demo shows all of it.
  **Renewals joined the same day:** the registration, inspection, emissions and insurance
  dates the vehicle table always had now have a form section, a Renewals block on the
  detail with the same pills, a place in the badge counts and in the digest — once per
  date, tracked in `expiration_reminders`, so a renewed registration earns its own cycle.
  **Not built, by choice:** push notifications (v2, native) and mileage-based reminders
  that update themselves — without an odometer feed the reading moves when a service is
  logged, which is the honest v1.

- **Receipts on repairs — 2026-09-22.** The repair screen's mock had an Attachments panel
  that was skipped because the store was not provisioned; it is now `repair_attachments`
  behind `POST /api/repairs/:id/attachments` (after the usual upload) and
  `DELETE /api/attachments/:id`, listed as **Receipts & documents** on the repair, counted
  as a chip on every repair card, and cleaned from the store when the repair or the
  vehicle goes — which also closed a gap where a repair-attached note's file outlived its
  vehicle.

- **Exports and reports — 2026-09-22.** `GET /api/vehicles/:id/report` renders the
  maintenance history as a PDF (pdfkit, Helvetica, Letter): the vehicle's facts, its public
  renewals, the schedules with what is next, and the service record oldest first with
  vendor, cost, receipts on file and a total; `/history.csv` gives the same rows to a
  spreadsheet. Insurance and notes stay out — it is the record of the car, not of its
  owner. Two links on the vehicle screen. This is the resale story the premium tier was
  going to be built on; it ships free for now, and a tier can gate it later.

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
- ~~**Untested upload path.**~~ R2 writes were guarded by `!import.meta.env.DEV`, so they
  only ever ran in production. **Resolved:** the Blob path runs locally and in the journeys
  — the avatar and gallery-photo specs upload real files and, after each delete, check the
  store as well as the row (2026-09-20).
- **App Store.** wolfpack's Capacitor loads the deployed origin via `CAP_SERVER_URL` rather
  than bundling. That is exposed under Apple Guideline 4.2 (minimum functionality), and
  `_PROJECTS.md` calls frunk the best store candidate. Decide the native strategy before
  relying on it.
- ~~**Test coverage regresses to zero**~~ at the start — the 7 Playwright suites were
  written against SvelteKit markup and did not survive the rewrite. **Re-established in
  Phase 4:** the API suite and eight browser journeys, selecting by role and label only.

## Verification (per checkpoint)

- **Dev:** `astro dev` serves static pages, the applet, and `/api/*` on one origin.
- **Static:** view-source on `/`, `/about`, `/pricing` shows real HTML, not an empty root.
- **Islands:** the nav user island hydrates from `/api/auth/me`; the applet mounts only on
  app routes.
- **Preview deploy:** function count ≈ 1; endpoints reachable (`docs/API.md`, "Verifying
  against a deploy"). Preview URLs sit behind Vercel's deployment protection, so probe
  production after the merge instead.
- **Design:** each screen checked against its mock in `frunk-proj/branding/mock/`.
- **A11y:** WCAG AA contrast on both themes — the palette in `docs/DESIGN.md` is already
  verified; keep new components to that bar.
