# Frunk — Design Spec

Derived from the mocks in `frunk-proj/branding/mock/` (outside this repo, gitignored).
Those PNGs are the source of truth for the redesign; this document is the written
translation an implementer can work from without opening Photoshop.

Colour values below were sampled from the mock pixels, not eyeballed.

---

## 1. Brand

**Product line:** "The glovebox that follows you."
**Tagline:** "Everything that matters. Within reach."
**Pull quote:** *"There had to be a better way."* — set in display serif italic.

**Wordmark:** `FRUNK.` — heavy sans, wide tracking (~0.15em), always followed by a
**violet period**. The dot is the brand signature; it also appears as the active-nav
indicator and as the terminal period in display headings ("Welcome back**.**",
"Finally, in one place**.**").

**Tone:** calm, deliberate, engineered. The mocks lean on a technical-drawing motif —
`FIG. 01`, `FRUNK / FRONT STORAGE PERSPECTIVE`, dimension lines, `CAPACITY 570 L / 4.2 CU FT`.
Keep that restraint: no gradients-as-decoration, no rounded-everything, no emoji.

---

## 2. Colour

### Dark (primary surface for the app)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#03060F` | Page background |
| `--surface` | `#050A14` | Cards, list panels |
| `--surface-raised` | `#080C16` | Nested cards, inputs on dark |
| `--surface-elevated` | `#0C1019` | Footer, header, black buttons |
| `--border` | `rgba(255,255,255,0.08)` | Hairline card + divider borders |

### Light (marketing and content pages)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FEFEFE` | Page background |
| `--surface` | `#F5F5F7` | Cards, secondary panels |
| `--text` | `#0B0F18` | Body copy, headings |

### Accent — violet, two tiers

| Token | Value | Use |
|---|---|---|
| `--accent` | `#6438CC` | Filled primary buttons on dark, checkbox fill |
| `--accent-bright` | `#9890F8` | The wordmark dot, links, eyebrow labels, arrows, active nav, VIN values |

`--accent-bright` is the one that carries the brand. Use `--accent` only for solid fills.

### Semantic

| Token | Use |
|---|---|
| green | Money amounts (`$200.00`) and `Completed` badges — green text on a dark-green pill |
| red | Destructive icon buttons only (trash), red glyph in a red-tinted circle |

**Primary button colour flips by theme.** On light backgrounds it is near-black
(`#0C1019`); on dark backgrounds it is violet (`--accent`). Do not use black-on-dark.

---

## 3. Typography

Two families, sharply contrasted — this pairing *is* the design.

**Display / headings — high-contrast serif.** Used far more widely than a typical app:
marketing headlines, page titles ("My Vehicles"), entity names ("1974 AMC Gremlin"),
section headings ("Notes", "Repairs", "Galleries"), and modal titles ("Welcome back."),
plus italic for pull quotes. Characteristics: pronounced thick/thin stroke modulation,
vertical stress, fine hairline serifs, tight optical tracking at large sizes.

**Body / UI — neutral geometric sans.** Body copy, form fields, table data, buttons,
navigation.

**Eyebrow labels** — sans, uppercase, ~11–12px, letterspaced ~0.12em, in `--accent-bright`.
Examples: `ABOUT FRUNK`, `OUR STORY`, `BUILT FOR LIFE`, `LAST UPDATED`, `ADDED`.

**Chosen: Playfair Display (display) + Plus Jakarta Sans (body).**

The mock images are flattened renders and the PSD contains no live type, so the original
families could not be recovered. Playfair Display was picked from a specimen comparison as
the closest available match with a full weight range (400–900) and a true italic; Plus Jakarta
Sans carries the body and UI. Both are self-hosted via `@fontsource-variable` — see §8.

Playfair has sturdier hairlines than a true Didone, which matters: the serif runs at ~20px
section headings on `#03060F`, where higher-contrast faces optically thin out. It has no
optical-size axis, so set small serif headings at **weight 500–600** rather than 400 to keep
them solid on the dark ground.

---

## 4. Layout

- **Alternating full-bleed sections** on marketing pages: light, then dark, then light.
- **Marketing header** is a floating white card — inset from the viewport edges, rounded,
  with a soft shadow. It is not flush to the top.
- **App header** is flush and dark, with the wordmark left, section nav centre-left,
  an icon cluster (GitHub, cart, theme toggle), avatar, then the primary action button.
- **Active nav** is `--accent-bright` text, with a small violet dot centred beneath it.
- **Breadcrumbs** sit directly under the header: `Home › Vehicles › 1974 AMC Gremlin`,
  muted, chevron separators, current page not a link.
- **Radii:** ~16px cards and containers, ~10px inputs and small controls, full-round pills
  and icon buttons.
- **Detail pages** use a 3-column top row (primary entity card | Notes | Repairs), then
  full-width stacked sections beneath (Maintenance Schedule, Galleries).

---

## 5. Components

**Buttons**
- Primary: filled pill. Violet on dark, near-black on light. Optional trailing `↗` (external
  or marketing CTA) or `→` (in-flow progression).
- Leading `+` for create actions: `+ Add Vehicle`, `+ Add Note`, `+ Add Repair`.
- Text link: `--accent-bright` with a long trailing `→` and an underline rule that extends
  well past the text ("OPEN THE GLOVEBOX ────→").

**Cards**
- `--surface` fill, 1px `--border`, ~16px radius.
- List rows inside a single card, separated by hairline dividers — not as detached cards.
- Nested cards (a note inside the Notes panel) sit on `--surface-raised` with their own border.

**List row** (vehicles index)
- 80×80 rounded thumbnail, entity title in serif, a violet metadata value (VIN), a document
  count chip with a folder icon, two right-aligned label/value stacks (`LAST UPDATED`, `ADDED`)
  with the date bold and time muted beneath, then edit and delete icon buttons.

**Icon buttons** — circular, 1px bordered, transparent fill. Neutral for edit (pencil),
red glyph on red-tinted border for delete (trash).

**Inputs**
- Dark fill, 1px border, ~10px radius, leading icon where meaningful (magnifier, mail, lock).
- Password fields carry a trailing eye toggle.
- Newsletter input pairs with a violet arrow submit button inside the same rounded container.

**Badges** — small pill, tinted background with matching text: `Completed` in green.

**Field rows** (vehicle spec table) — icon + muted label on the left, value right-aligned,
one per line, no dividers.

**Empty states** — centred: icon in a soft violet glow, a serif title
("No maintenance scheduled"), then one muted line of guidance.

**Footer** — dark in both themes. Five columns: wordmark + tagline + short violet rule,
then `PRODUCT` / `COMPANY` / `SUPPORT` link lists, then `STAY IN THE LOOP` with the
newsletter input. A divider, then copyright left and social links right (Email, Bluesky,
Mastodon, GitHub).

---

## 6. Imagery

Studio automotive renders on seamless backgrounds, lit with a **violet rim light** that ties
photography to the accent colour. Interior/frunk shots use violet light spill from inside the
compartment. Product screenshots appear inside device frames. Keep the violet glow — it is
what makes the photography feel part of the brand rather than stock.

---

## 7. Page inventory

Mocks exist for: `home`, `marketing`, `about` (light **and** dark), `pricing`, `contact`,
`sign-in`, `sign-up`, `vehicles-index`, `vehicle-single`, `vehicle-edit`, `vendor-index`,
`vendor-single`, `vendor-edit`, `repairs-index`, `repair-single`, `repair-edit`,
`notes-index`, `note-single`, `note-edit`, `profile`, `profile-edit`, `users-index`,
`admin-users-edit`, `store-index`, `store-product`, `store-cart`, `blog-index`,
`blog-single`, `terms-of-service`, and `z_header-footer`.

`z_privacy-policy-user-tos-layout.md` specifies the legal-page layout: left sidebar of
numbered sections, "Download PDF", last-updated date, and version history.

---

## 8. Open decisions

These block a faithful implementation and need Mark's call:

1. ~~**Display serif and body sans families.**~~ **Resolved** — Playfair Display +
   Plus Jakarta Sans, self-hosted via `@fontsource-variable` so the Capacitor and Tauri
   bundles work offline. The previous remote `@import` from the Google Fonts CDN meant the
   packaged apps silently fell back to system fonts.
2. **theme-forseen coupling.** `src/routes/layout.css` bridges `--color-primary`,
   `--color-accent`, `--font-heading`, `--font-body` from theme-forseen, and loads the
   Skeleton `cerberus` theme. The redesign either commits these tokens directly or ships as
   a theme-forseen preset. That choice affects every file below.
3. **Auth surface.** The `sign-in` mock shows **Google / Apple / GitHub OAuth**. The app
   today uses hand-rolled sessions with SES email verification, and the roadmap calls for
   **passkeys**. Three different directions — pick one before building the auth screens.
