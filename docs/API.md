# Frunk API

The REST surface the applet talks to. Every route is an Astro `APIRoute` under
`src/pages/api/`, all bundled into a single Vercel function.

**The auth boundary is here, not on the page.** Astro serves identical static HTML to
everyone; each handler resolves the session cookie itself and answers 401 when there
isn't one. There is no `hooks.server.ts` equivalent and no per-page guard.

## Conventions

| | |
|---|---|
| Request body | JSON. `content-type: application/json` on every write. |
| Auth | `auth-session` cookie — opaque token, SHA-256 of it keys the `session` row, 30-day sliding expiry. |
| Errors | `{ "error": string }`, plus `{ "fields": { path: string[] } }` on a 422. |
| PATCH | Genuinely partial. An omitted key is left alone; an explicit `null` clears a nullable column. |
| Dates | ISO 8601 strings in and out. |
| Ownership | Enforced by a `user_id` predicate inside the query, so someone else's row is a 404, never a 403. |

### Status codes

`200` ok · `201` created · `204` deleted / signed out · `400` malformed JSON or query ·
`401` no session · `403` signed in but not allowed · `404` missing or not yours ·
`422` validation failed · `500` unexpected

### CSRF

Astro's origin check is left on. Browsers send `Origin` on every non-GET `fetch`, so the
applet is unaffected, but **curl must send it by hand** or mutating calls get a 403:

```bash
curl -X DELETE -H 'Origin: https://frunk.cloud' https://frunk.cloud/api/vehicles/$ID
```

The session cookie is additionally `SameSite=Lax`, so it is not attached to cross-site
requests in the first place.

## Routes

### Auth

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/auth/me` | `{ user }` or `{ user: null }`. **200 either way** — the nav island reads this, and signed-out is not an error. |
| `POST` | `/api/auth/signout` | 204. Idempotent. |

Registration and sign-in are Phase 3 (passkeys + TOTP, Decision 2). The session
primitive they will call already exists in `src/pages/api/_lib/session.ts`.

### Vehicles

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/vehicles` | The caller's vehicles, newest first. |
| `POST` | `/api/vehicles` | `make`, `model`, `year` required; all 46 optional columns accepted. |
| `GET` | `/api/vehicles/:id` | The whole detail screen: `{ vehicle, notes, repairs, vendors, galleries, schedules }`, galleries with their photos. |
| `PATCH` | `/api/vehicles/:id` | |
| `DELETE` | `/api/vehicles/:id` | Notes, repairs, galleries and schedules cascade. |

### Vendors

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/vendors` | |
| `POST` | `/api/vendors` | `name` required. |
| `GET` | `/api/vendors/:id` | `{ vendor, notes, repairs }`. |
| `PATCH` | `/api/vendors/:id` | |
| `DELETE` | `/api/vendors/:id` | Repairs survive; their `vendor_id` goes null. |

### Repairs

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/repairs` | Across every vehicle the caller owns, with vendor and vehicle names joined in. |
| `POST` | `/api/repairs` | `vehicleId`, `description`, `date`. A `vendorId` must also be the caller's. |
| `GET` | `/api/repairs/:id` | `{ repair, notes }`. |
| `PATCH` | `/api/repairs/:id` | |
| `DELETE` | `/api/repairs/:id` | |

### Notes

Notes attach to a vehicle, repair, vendor or parent note, and nest one level.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/notes` | Every note on the caller's vehicles. |
| `POST` | `/api/notes` | `title` plus at least one parent id. |
| `GET` | `/api/notes/:uuid` | `{ note, children }`. |
| `PATCH` | `/api/notes/:uuid` | |
| `DELETE` | `/api/notes/:uuid` | Deletes children too — `parent_note_id` has no FK, so the database will not do it. |

### Galleries and photos

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/galleries` | `vehicleId`, `name`. |
| `GET` | `/api/galleries/:id` | Gallery with its photos in display order. |
| `PATCH` | `/api/galleries/:id` | `photoOrder: string[]` rewrites `order` from the array index. Ids outside this gallery are ignored. |
| `DELETE` | `/api/galleries/:id` | Photo rows cascade. |
| `POST` | `/api/photos` | `galleryId`, `imageUrl`. |
| `PATCH` | `/api/photos/:id` | |
| `DELETE` | `/api/photos/:id` | |

**Uploads are Phase 4.** These endpoints record an `imageUrl` that already exists; they
do not accept the base64 `fileData` the SvelteKit actions took. Phase 4 adds the Vercel
Blob write in front of them, with `access: 'private'` for vehicle documents.

### Maintenance schedules

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/maintenance-schedules` | `vehicleId`, `name`, and at least one of `intervalMiles` / `intervalMonths`. |
| `PATCH` | `/api/maintenance-schedules/:id` | Marking one done is this, with `lastCompletedDate` and `lastCompletedMileage`. |
| `DELETE` | `/api/maintenance-schedules/:id` | |

### Users

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/users` | **Admin only.** `?page=&pageSize=&sortBy=id\|username\|roles&sortOrder=asc\|desc&search=` |
| `GET` | `/api/users/:uuid` | Own profile, or anyone's for an admin. |
| `PATCH` | `/api/users/:uuid` | Own profile, or anyone's for an admin. **Only an admin may set `roles`.** |
| `DELETE` | `/api/users/:uuid` | Own account (ends the session) or, for an admin, anyone's. |

## Verifying against a deploy

```bash
BASE=https://your-preview.vercel.app

# 200 with a null user — no session needed
curl -s $BASE/api/auth/me

# 401 on everything else
curl -s -o /dev/null -w '%{http_code}\n' $BASE/api/vehicles

# Signed-in calls need a session, which Phase 3 issues. Until then, insert a row into
# `session` by hand: id = sha256(token) as lowercase hex, user_id = a user's uuid.
curl -s -b "auth-session=$TOKEN" $BASE/api/vehicles
```

## Database setup

```bash
pnpm db:generate      # regenerate SQL after a schema change
pnpm db:push          # apply the schema to DATABASE_URL
pnpm db:seed-roles    # required once — ROLE_IDS in src/lib/roles.ts hardcodes these ids
```
