# Vulcan

> The school library, from the door.

Vulcan is the school library's check-in ledger. It replaces the paper sign-in book where students write their name, laptop, and times.

Members sign themselves in and out with a school Google account, register the laptops they bring, and keep their admission number on file. Gatekeepers run a full-screen door code at the entrance, search the register when a code will not scan, and record manual entries and exits. The librarian gets a live view of who is inside, the full visit history, laptop trails by serial, role grants, and an append-only audit ledger.

The interface is deliberately a ledger, not a dashboard: Fraunces for display, Instrument Sans for interface text, JetBrains Mono for recorded data, hairline rules, flat surfaces, and a paper grain. Forest means **IN**, vermilion means **OUT**, and brass is reserved for marks and focus. There are no gradients, glass panels, oversized metric cards, or identical card grids.

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Routes](#routes)
- [Roles and permissions](#roles-and-permissions)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Authentication and authorization](#authentication-and-authorization)
- [Core flows](#core-flows)
- [Door codes](#door-codes)
- [Database](#database)
- [API reference](#api-reference)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Demo mode and seed data](#demo-mode-and-seed-data)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)
- [Security notes](#security-notes)
- [Known limitations](#known-limitations)
- [License](#license)

---

## Overview

Vulcan is a single-school application. One deployment serves one school, configured through environment variables rather than a tenant system.

### What it replaces

The paper library sign-in book records a name and a time. Vulcan records the same things plus the laptop that came through the door, which matters when the library owns equipment or when a student borrows a machine. It keeps the visit open until an exit is recorded, and it makes mismatches visible instead of silently losing them.

The system is built around four rules:

1. **One open visit per member.** A member cannot be inside twice.
2. **One open visit per laptop.** A physical laptop cannot be inside under two people.
3. **Every exit stays on the record.** An exit without an entry is recorded and flagged, not discarded.
4. **The ledger and the audit trail agree.** Visit writes and audit rows are written in the same transaction.

### Who uses it

| Person | What they do |
| --- | --- |
| **Member** | Signs in with Google, saves an admission number, registers laptops, scans the door code to enter or leave, and checks their own page. |
| **Gatekeeper** | Opens `/door/in` or `/door/out`, shows the rotating code, watches recent scans, searches the register, and records manual entries or exits. |
| **Librarian (admin)** | Sees who is inside, searches history, traces laptop serials, grants or revokes gatekeeper/admin roles, reads the audit ledger, and can close an open visit manually. |

---

## Features

### Members

- Google-only school sign-in with a server-side domain gate.
- Personal page with a live library state, greeting, admission number, and registered laptops.
- Admission number required before the first scan; saved back to the member's own row.
- Laptop registration with a required laptop photo and an optional serial-sticker photo.
- Browser-side photo resizing before upload: width capped at 1200px and height at 1600px, encoded as JPEG.
- Soft removal: a removed laptop keeps its visit history and can be revived by re-adding the same serial.
- Serial uniqueness with a non-revealing conflict message when the laptop belongs to someone else.
- Scan confirmation pass with a double-line IN/OUT stamp, live clock, and laptop photo.
- Members can open only their own confirmation; gatekeepers and admins can open any.

### Gatekeepers

- Full-viewport door screen at `/door/in` and `/door/out`.
- Large paper-white QR tile, brass countdown ring, and the eight most recent scans.
- Fresh code every 30 seconds; each code is valid for 60 seconds.
- Direction-bound tokens: an entry code cannot record an exit, and vice versa.
- Manual lookup by name or admission number at `/door/manual?dir=in|out`.
- Manual scans apply the same conflict, borrowed-laptop, open-visit, and audit rules as QR scans.
- “Simulate scan” link in demo mode for local testing.

### Librarian

- Live inside ledger at `/admin`, refreshed every five seconds.
- Per-row sign-out with `exit_method = manual`, the `manual` flag, `closed_by`, and an audit row.
- History at `/admin/history` with date range, name/admission/serial search, flag filter, pagination, and CSV export.
- Laptop trail at `/admin/laptops`: search a serial and see the registered laptop plus every visit it travelled with.
- Gatekeeper grants at `/admin/gatekeepers`: add gatekeeper or admin grants with an optional end date, or revoke them.
- Audit ledger at `/admin/audit`: read-only, paginated, with actor, action, entity, and details.

### Operations

- Protected daily auto-close job that closes every visit still open.
- Auto-close writes one audit row per closed visit using a reserved system account.
- Idempotent: running the job twice closes zero visits on the second run.
- Migrations and demo seed scripts.
- Vercel Cron wiring in `vercel.json`.
- Light and dark themes.
- Loading skeletons drawn as ruled ledger pages, plus ledger-voice error, 404, auth-error, and expired-code pages.

### Interface and accessibility

- Fraunces, Instrument Sans, and JetBrains Mono via `next/font`.
- Phosphor icons only; no emoji and no Lucide.
- Forest = IN, vermilion = OUT, brass = marks and focus.
- Hairline rules, flat surfaces, paper grain, and rubber-stamp details.
- WCAG 2.2 AA target: 4.5:1 text contrast, 44px touch targets, visible labels, keyboard paths, and reduced-motion support.
- Responsive ledgers: tables become compact ruled lists below the `xl` breakpoint.
- Skip link, per-page metadata, and a stamp favicon.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 via `@tailwindcss/turbopack` |
| Auth | Auth.js (NextAuth v5 beta) with Google |
| Database | Neon Postgres |
| ORM | Drizzle ORM and Drizzle Kit |
| Driver | `node-postgres` (`pg`) over a pooled TCP connection |
| File storage | Vercel Blob (public store) |
| Icons | Phosphor Icons |
| Door tokens | `jose` HS256 JWTs |
| Scheduling | Vercel Cron |
| Hosting | Vercel |

The app uses a pooled `pg` connection rather than Neon's HTTP driver. `src/db/index.ts` prefers IPv4 DNS results and attaches the pool to Vercel's Fluid compute lifecycle with `attachDatabasePool`, so idle connections are released before a function suspends.

Cache Components are disabled in `next.config.ts` because the shared header reads the signed-in session; routes are rendered per request rather than partially prerendered.

---

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page and sign-in entry. Shows an auth notice when redirected from a guarded page. |
| `/me` | Signed-in member | Personal state, admission number, and registered laptops. |
| `/me/laptops/new` | Signed-in member | Register a laptop. |
| `/me/laptops/[id]/edit` | Owner only | Edit a laptop; ownership is re-checked on the server. |
| `/door/[dir]` | Gatekeeper or admin | Full-screen door code for `in` or `out`. |
| `/door/manual?dir=in\|out` | Gatekeeper or admin | Manual member lookup and scan. |
| `/scan?t=…` | Public page, sign-in to submit | Door-code scan flow. |
| `/scan/expired` | Public | Dedicated expired-code page. |
| `/scan/confirmation/[id]` | Own visit, gatekeeper, or admin | Paper-style door pass. |
| `/admin` | Admin | Live inside ledger. |
| `/admin/history` | Admin | Visit history and filters. |
| `/admin/history/export` | Admin | CSV export of the current filter. |
| `/admin/laptops` | Admin | Laptop trail by serial. |
| `/admin/gatekeepers` | Admin | Role grants. |
| `/admin/audit` | Admin | Audit ledger. |
| `/auth/error` | Public | Sign-in failure explanation. |
| `/api/auth/[...nextauth]` | Auth.js | OAuth routes. |

Guarded pages redirect signed-out visitors to `/?auth=required`. The scan flow preserves its own return path separately. `/admin` re-reads the role from the database on every request.

---

## Roles and permissions

Vulcan has three roles: `member`, `gatekeeper`, and `admin`.

| Action | Member | Gatekeeper | Admin |
| --- | ---: | ---: | ---: |
| Sign in with a school Google account | Yes | Yes | Yes |
| Open `/me` and manage own laptops | Yes | Yes | Yes |
| Scan the door code for self | Yes | Yes | Yes |
| Open `/door/in` or `/door/out` | No | Yes | Yes |
| Search the register and record manual scans | No | Yes | Yes |
| Open the librarian desk and all `/admin` pages | No | No | Yes |
| Close another member's visit | No | No | Yes |
| Grant or revoke roles | No | No | Yes |
| Read the audit ledger | No | No | Yes |

Role resolution order:

1. An email in `ADMIN_EMAILS` is always an admin.
2. An active row in `role_grants` where `ends_at` is null or in the future.
3. Otherwise, `member`.

A grant can exist before the person first signs in. The unique email index means one grant per address. `role_grants.created_by` stores the granting admin's email, so the grant survives a user row being re-created.

The session JWT carries a role snapshot. Auth.js refreshes that snapshot from the database at most every five minutes. The librarian area and its server actions do **not** trust the snapshot: they call `getFreshRole()` / `requireAdmin()` and re-read `role_grants` and `ADMIN_EMAILS` on every request. A revoked admin loses the desk immediately. Gatekeeper pages and door APIs use the cached session role, so a revoked gatekeeper can retain door access for up to five minutes.

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer; Node 22 is recommended.
- npm.
- A Neon account and project, or another Postgres database with SSL.
- A Google Cloud project with an OAuth 2.0 Web application client.
- A Vercel Blob store for laptop photos; the rest of the app works without it.
- A Vercel account for deployment and cron; not required for local development.

### Quick start

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with the values described below.
npm run db:migrate
NEXT_PUBLIC_DEMO_MODE=true npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a Google account that matches `SCHOOL_DOMAIN`, or with an address listed in `ADMIN_EMAILS`.

### 1. Install dependencies

```bash
npm install
```

### 2. Create the environment file

```bash
cp .env.example .env.local
chmod 600 .env.local
```

`.env.local` is gitignored and must never be committed. Generate each secret independently:

```bash
openssl rand -base64 32
```

Use the output for `AUTH_SECRET`, `TOKEN_SECRET`, and `CRON_SECRET`. Use different values in production.

### 3. Create the Neon database

1. Create a Neon project.
2. Copy the **pooled** connection string into `DATABASE_URL`. The hostname should contain `-pooler`.
3. Copy the **direct** connection string into `DATABASE_URL_UNPOOLED`. This is recommended for migrations.
4. Keep `sslmode=require` on both.

The app uses `DATABASE_URL`. Drizzle Kit prefers `DATABASE_URL_UNPOOLED` and falls back to `DATABASE_URL` if the direct URL is absent. A direct connection is safer for schema changes because PgBouncer's transaction pooling can interfere with session-level migration operations.

If you use the Neon CLI, `neon deploy` can pull both values into `.env.local`. The repository includes `neon.ts` for Neon CLI project configuration; `.neon` is the local CLI link and is gitignored.

### 4. Create the Google OAuth client

In Google Cloud Console → **APIs & Services** → **Credentials**, create an **OAuth 2.0 Client ID** of type **Web application**.

Add both redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://vulcanlcs.vercel.app/api/auth/callback/google
```

Copy the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

OAuth consent screen notes:

- For a Google Workspace school, an **Internal** app is simplest.
- For an External app in **Testing**, only accounts added under **Test users** can sign in.
- Publish the app before real users need access, or keep the test-user list current.
- If you use personal Gmail accounts for a local demo, `SCHOOL_DOMAIN="gmail.com"` admits **any** Gmail account, so use it only for a private test deployment. If only the librarian needs a Gmail address, keep the real school domain and add that exact address to `ADMIN_EMAILS` instead.

The app sends Google's `hd` parameter as an account-chooser hint when `SCHOOL_DOMAIN` is not `gmail.com` or `googlemail.com` and every address in `ADMIN_EMAILS` belongs to the school domain. If an allowlisted admin is on another domain, `hd` is omitted so that account can still reach the chooser. The server-side `signIn` callback is the actual gate; `hd` is not trusted for authorization.

### 5. Create the Blob store

In Vercel → **Storage** → **Blob**, create a **public** store. Laptop photos are displayed by public URL, so a private store will not work.

Copy the read/write token into `BLOB_READ_WRITE_TOKEN`. `BLOB_STORE_ID` is optional; set it only if the token does not expose a store id the app can parse. Uploads are scoped under `devices/<user id>/` and validated against the configured public Blob hostname.

Without a Blob token, the rest of the app runs, but photo uploads return a configuration error.

### 6. Set school access rules

```dotenv
SCHOOL_DOMAIN="school.edu"
ADMIN_EMAILS="librarian@school.edu,head.librarian@school.edu"
SCHOOL_TIME_ZONE="Africa/Nairobi"
```

- `SCHOOL_DOMAIN` is stored without the leading `@`. It admits ordinary members.
- `ADMIN_EMAILS` is comma-separated. These accounts are always admins and may be on another Google domain, such as a personal Gmail address.
- `SCHOOL_TIME_ZONE` is an IANA timezone and controls greetings, dates, door clocks, history day boundaries, and grant end dates. It defaults to `Europe/London` when unset; this deployment uses `Africa/Nairobi`.

### 7. Set the door and public URL values

```dotenv
TOKEN_SECRET="a long random secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`NEXT_PUBLIC_APP_URL` is the public origin written into door QR codes. No trailing slash. The door screen shows a configuration error if `TOKEN_SECRET` or `NEXT_PUBLIC_APP_URL` is missing.

### 8. Set the cron secret

```dotenv
CRON_SECRET="a separate long random secret"
```

Vercel Cron sends this as `Authorization: Bearer <CRON_SECRET>` when the variable is set in the Vercel project. Use a different value from `AUTH_SECRET` and `TOKEN_SECRET`.

### 9. Apply migrations

```bash
npm run db:migrate
```

The included migrations create the five tables, the enums, the indexes, and the `auto` value on `exit_method`. To verify the schema after migrating:

```bash
psql "$DATABASE_URL" -c '\dt'
psql "$DATABASE_URL" -c "select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'exit_method';"
```

### 10. Seed the demo ledger (optional)

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run seed
```

The seed is guarded and idempotent. See [Demo mode and seed data](#demo-mode-and-seed-data).

### 11. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a Google account that ends in `@$SCHOOL_DOMAIN`, or with an address listed in `ADMIN_EMAILS`. If your address is in `ADMIN_EMAILS`, the account menu will include the librarian desk.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Neon Postgres connection string used by the app. Include `sslmode=require`. |
| `DATABASE_URL_UNPOOLED` | Recommended for migrations | Direct Neon connection string used by Drizzle Kit. Falls back to `DATABASE_URL` when absent. Include `sslmode=require`. |
| `AUTH_SECRET` | Yes | Secret used by Auth.js to sign and encrypt session tokens. Generate with `openssl rand -base64 32`. |
| `AUTH_URL` | In production | Canonical app origin for Auth.js. Locally, `http://localhost:3000`. |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client id. |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret. |
| `SCHOOL_DOMAIN` | Yes | The email domain admitted to ordinary member sign-in, without the leading `@`. |
| `ADMIN_EMAILS` | No | Comma-separated accounts that are always admins, with or without a grant. They may be outside `SCHOOL_DOMAIN`. |
| `SCHOOL_TIME_ZONE` | No | IANA timezone for greetings, dates, door clocks, history boundaries, and grant end dates. Defaults to `Europe/London`. |
| `BLOB_READ_WRITE_TOKEN` | Yes for photos | Vercel Blob read/write token. Without it, uploads return a configuration error. |
| `BLOB_STORE_ID` | No | Explicit Blob store id, used when the token does not expose one in a form the app can parse. |
| `TOKEN_SECRET` | Yes | Signs the short-lived door QR tokens. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public origin written into door QR codes. No trailing slash. |
| `NEXT_PUBLIC_DEMO_MODE` | No | Set to exactly `true` to show “Simulate scan” on door screens and allow `npm run seed`. Any other value disables both. |
| `CRON_SECRET` | Yes for auto-close | Bearer token required by `/api/cron/auto-close` and sent automatically by Vercel Cron. |

`NEXT_PUBLIC_*` values are embedded at build time. Set them in Vercel before building; changing them after a deployment requires a rebuild.

Minimal local example:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@POOLED_HOST/DATABASE?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@DIRECT_HOST/DATABASE?sslmode=require"

AUTH_SECRET="replace-me"
AUTH_URL="http://localhost:3000"
AUTH_GOOGLE_ID="000000000000-xxxxxxxx.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="replace-me"

SCHOOL_DOMAIN="school.edu"
ADMIN_EMAILS="librarian@school.edu"
SCHOOL_TIME_ZONE="Africa/Nairobi"

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
BLOB_STORE_ID=""

TOKEN_SECRET="replace-me"
CRON_SECRET="replace-me"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEMO_MODE="true"
```

---

## Authentication and authorization

### The sign-in gate

Only Google accounts that satisfy both conditions are admitted:

1. Google reports `email_verified: true`.
2. The email ends in `@$SCHOOL_DOMAIN`, **or** the address is listed in `ADMIN_EMAILS`.

The check runs in the Auth.js `signIn` callback on the server. The client cannot bypass it by calling an API directly. The admin exception is deliberately narrow: a personal Gmail account is admitted only when its exact address is in `ADMIN_EMAILS`.

Rejected accounts are sent to `/auth/error`, which explains the school-domain rule without exposing internal details. A provider other than Google is rejected even if it is added later.

### User provisioning

On first successful sign-in, Auth.js upserts a `users` row with the Google name, email, image, and resolved role. The JWT stores the internal user id, role, name, picture, and email.

The session strategy is JWT, not database sessions. This keeps ordinary page loads cheap while still allowing the librarian area to re-check the database when it matters.

### Role refresh

- Ordinary session role: refreshed from the database at most every five minutes.
- Librarian pages and server actions: fresh check on every request.
- Gatekeeper pages and door APIs: cached session role, so revocation can lag by up to five minutes.

### Route guards

`src/lib/authz.ts` provides:

- `requireSession()` — redirects to `/?auth=required`.
- `requireRole(...roles)` — session plus cached role check.
- `requireFreshRole(...roles)` — session plus a fresh database role check.
- `requireAdmin()` — `requireFreshRole("admin")`.
- `getAdminSession()` — API-friendly admin check that returns `null` instead of redirecting.

Every member API starts with `getApiUser()`. User id and role come from the session, never from the request body. Device updates and deletes require both the device id and `owner_id = session.user.id`; another member's id returns 404.

### Safe redirects

`src/lib/navigation.ts` accepts only same-origin relative paths for post-auth redirects. It rejects absolute URLs, protocol-relative URLs, backslashes, and control characters. This prevents `redirectTo` from becoming an open redirect.

### Email domain hints

For a Workspace domain, the app passes Google's `hd` parameter to make the account chooser prefer the school domain. It omits `hd` for `gmail.com` and `googlemail.com`, and whenever an allowlisted admin is outside the school domain; otherwise that admin could be blocked before the app's own gate runs. The server-side gate remains authoritative in every case.

---

## Core flows

### First sign-in

1. The member opens `/` and chooses **Continue with Google**.
2. Auth.js redirects to Google with a PKCE challenge and the school domain hint where applicable.
3. Google returns to `/api/auth/callback/google`.
4. The `signIn` callback verifies the Google account and either the school domain or the admin allowlist.
5. The `jwt` callback upserts the `users` row and resolves the role.
6. The member is sent to `/me` or to the safe `next` path they came from.

### Admission number

The admission number is stored on the member's own `users` row. It is trimmed, uppercased, and limited to 40 characters. The database check constraint requires the stored value to equal `upper(btrim(value))`.

On the `/me` form the input's placeholder is derived from the member's email when the address is on `ueab.ac.ke`: the part before the `@`, in capitals. It is a hint only; the member still saves the number themselves.

A member without an admission number is sent to `/me?next=…&reason=admission` before a scan can be recorded. Saving the number returns them to the scan.

### Registering a laptop

A laptop record requires:

- A model, up to 120 characters.
- A serial, up to 80 characters, trimmed and uppercased.
- A laptop photo.
- An optional serial-sticker photo.

The browser resizes the photo to a maximum width of 1200px and a maximum height of 1600px, then encodes it as JPEG at quality 0.84 before upload. The server accepts JPEG, PNG, or WebP up to 5 MB, detects the format from the file signature rather than the MIME header, and writes to `devices/<user id>/` in the public Blob store.

Serials are unique across the whole register. If a serial belongs to another account, the API returns:

> This serial is already registered to another account. Ask the librarian if the laptop changed hands.

If the same owner removed the laptop earlier, re-adding the serial revives the original row and keeps its visit history. Removing a laptop sets `active = false`; it never hard-deletes the row. A laptop with an open visit cannot be removed.

### Entry

The member scans an entry code and lands on `/scan?t=…`.

1. The token signature, expiry, and direction are checked on the page.
2. The member must be signed in.
3. The member must have an admission number.
4. The member chooses one of their laptops, enters the serial of a borrowed laptop, or records **No device**.
5. The server re-checks the token, member, admission number, device ownership, and laptop conflict.
6. If the member already has an open visit, it is closed with `no_tap_out` and the new visit is opened.
7. The visit and its audit row are written in one transaction.

The first laptop, or the laptop on an open visit, is preselected.

### Exit

An exit closes the member's open visit with `exit_method = qr` or `manual` and sets `closed_by`. If the member has no open visit, Vulcan creates a same-time visit with `entry_at = exit_at = now` and the `no_matching_entry` flag rather than discarding the exit.

### Borrowed and unregistered laptops

- A borrowed serial that belongs to another member is linked to that device and marked `borrowed`.
- An unregistered serial is stored in `loose_serial` and marked both `borrowed` and `unregistered_device`.
- A laptop already inside under another visit is refused before anything is written:

> This laptop is already inside under another visit. Tell the gatekeeper.

The partial unique index on open visits for a device is the final backstop if two scans race.

### Manual desk scan

`/door/manual?dir=in|out` lets a gatekeeper search by name or admission number, select a member, and record the same flow. Manual writes use `entry_method` / `exit_method = manual` and add the `manual` flag. The same laptop-conflict, borrowed-device, open-visit, and audit rules apply.

### Librarian sign-out

On `/admin`, a librarian can close an open visit with **Sign out**. The visit gets `exit_method = manual`, the `manual` flag, and `closed_by` set to the librarian. An audit row with action `visit.admin_check_out` records the actor and the target member.

The inside ledger polls `/api/admin/inside` every five seconds, so new visits and sign-outs appear without a reload.

### Auto-close

`GET|POST /api/cron/auto-close` closes every open visit.

- Authentication is `Authorization: Bearer $CRON_SECRET`.
- A missing or wrong token returns 401 with `WWW-Authenticate: Bearer`.
- A missing `CRON_SECRET` returns 503 because the job is not configured.
- Each open visit gets `exit_at = now`, `exit_method = auto`, the `no_tap_out` flag, and `closed_by` set to the reserved system account `auto-close@vulcan.invalid`.
- One `audit_log` row is written per closed visit with action `visit.auto_check_out`.
- The visit update and audit insert run as a single writable CTE, so the ledger and audit trail cannot disagree if the job is interrupted.
- The response is JSON: `{ "closed": number, "checkedAt": "ISO timestamp" }`.
- Running it again is safe; the second run closes zero visits.

Vercel Cron sends GET, so the route exports both GET and POST. POST is useful for a manual run or another scheduler.

> **Cron schedule:** `vercel.json` schedules the job at `30 19 * * *`, which is 22:30 in `Africa/Nairobi` (19:30 UTC). Vercel Cron schedules are in UTC. Nairobi does not observe daylight saving, so this needs no seasonal adjustment; a school in a DST zone would.

### Confirmation pass

`/scan/confirmation/[id]` is a paper-style pass with a double-line, rotated IN/OUT stamp, the member's name and admission number, a live mono clock, a moving diagonal hatch band, and the laptop photo (largest on exits).

Members can open only their own confirmation. Gatekeepers and admins can open any. The pass shows flags and a plain-language note for each one.

---

## Door codes

`GET /api/door/token?dir=in|out` returns an HS256 JWT signed with `TOKEN_SECRET`:

- `dir` is `in` or `out`.
- `iat` is the issue time.
- `exp` is 60 seconds later.
- `jti` is a random UUID so two codes issued in the same second are still different.
- `scanUrl` is `${NEXT_PUBLIC_APP_URL}/scan?t=${token}`.

Only gatekeepers and admins can request codes, read the recent-scan feed, search members, or record manual scans. Every check is repeated in the relevant route handler or server action; the client is never trusted for a role.

The door screen refreshes its code every 30 seconds. The QR tile shows a brass countdown ring. Expired codes redirect to `/scan/expired`, which keeps the exact message:

> That code has expired. Scan the code on the screen again.

If `TOKEN_SECRET` or `NEXT_PUBLIC_APP_URL` is missing, the door screen shows a configuration error instead of a code.

---

## Database

The schema lives in `src/db/schema.ts`; generated SQL is in `drizzle/`.

```mermaid
erDiagram
    users ||--o{ devices : "owns"
    users ||--o{ visits : "makes"
    devices o|--o{ visits : "carried on"
    users o|--o{ visits : "closed by"
    users ||--o{ audit_log : "acts"

    users {
      uuid id PK
      text email UK
      text name
      text image
      text admission_number
      user_role role
      timestamptz created_at
    }

    devices {
      uuid id PK
      uuid owner_id FK
      text serial UK
      text model
      text photo_url
      text serial_photo_url
      device_kind kind
      boolean active
      timestamptz created_at
    }

    visits {
      uuid id PK
      uuid user_id FK
      uuid device_id FK
      text loose_serial
      timestamptz entry_at
      timestamptz exit_at
      entry_method entry_method
      exit_method exit_method
      text_array flags
      uuid closed_by FK
    }

    role_grants {
      uuid id PK
      text email UK
      role_grant_role role
      timestamptz ends_at
      text created_by
    }

    audit_log {
      uuid id PK
      uuid actor_id FK
      text action
      text entity
      text entity_id
      jsonb meta
      timestamptz created_at
    }
```

`role_grants.created_by` is an email string, not a foreign key. The diagram shows the enforced foreign-key relationships; the grant creator is intentionally denormalised so a grant survives a user account being re-created.

### Tables

| Table | What it holds |
| --- | --- |
| `users` | One row per Google account that has signed in, plus the reserved auto-close account. Holds the current role and admission number. |
| `role_grants` | Gatekeeper and admin grants by email, with an optional `ends_at` and the granting admin's email. |
| `devices` | Registered laptops. `owner_id` points at `users`. `serial` is globally unique. `active = false` is a soft delete. |
| `visits` | One row per entry, with an optional exit. `device_id` may be null; `loose_serial` holds a borrowed, unregistered serial. |
| `audit_log` | Append-only actor/action/entity records with JSON metadata. |

### Enums

| Enum | Values |
| --- | --- |
| `user_role` | `member`, `gatekeeper`, `admin` |
| `role_grant_role` | `gatekeeper`, `admin` |
| `device_kind` | `personal`, `library` |
| `entry_method` | `qr`, `manual` |
| `exit_method` | `qr`, `manual`, `auto` |

`device_kind = library` is reserved for library-owned machines; the current member flow creates `personal` devices.

### Constraints and indexes

- **One open visit per user:** partial unique index on `visits.user_id` where `exit_at is null`.
- **One open visit per device:** partial unique index on `visits.device_id` where `device_id is not null and exit_at is null`.
- **Visit flags are restricted at the database level** to the allowed set.
- **Exit cannot precede entry:** check constraint on `visits.exit_at >= visits.entry_at`.
- **Serials and admission numbers are normalised:** stored values must equal `upper(btrim(value))` and be non-empty.
- **Audit lookups** are indexed by actor, entity, and creation time.
- **Visit lookups** are indexed by user, device, entry time, and open state.
- **Role grant expiry** is indexed by `ends_at`.

### Visit flags

| Flag | Meaning |
| --- | --- |
| `no_tap_out` | A visit was still open when the member entered again, or the library closed with the visit still open. |
| `no_matching_entry` | An exit was recorded without an open entry. |
| `manual` | The transition was recorded from the manual desk screen or by a librarian. |
| `borrowed` | The laptop belongs to another member or its serial is unregistered. |
| `no_device` | The member entered without a laptop. |
| `unregistered_device` | A borrowed serial was not found on the device register. |

### Migrations

| Migration | Purpose |
| --- | --- |
| `0000_initial_schema.sql` | Tables, enums, foreign keys, indexes, and checks. |
| `0001_member_laptops.sql` | Optional serial-sticker photo and normalisation checks for serials and admission numbers. |
| `0002_real_alice.sql` | Adds `auto` to the `exit_method` enum. |

After changing the schema:

```bash
npm run db:generate
npm run db:migrate
```

Review generated SQL before applying it in production. The `auto` enum value is required by the auto-close job.

### Time zones

All timestamps are stored as `timestamp with time zone`. Display and day boundaries use `SCHOOL_TIME_ZONE`, not the server timezone.

History filters interpret a date as the half-open range from the start of that day in the school timezone to the start of the next day. Grant end dates are stored as the end of the selected school day (`23:59:59.999` local). This avoids the common bug where an “end date” expires at the start of the day.

---

## API reference

### Common behaviour

- Authenticated routes use the Auth.js session.
- Errors are JSON: `{ "error": "message", "code"?: "code", "field"?: "field" }`.
- Door and scan responses use `Cache-Control: no-store`.
- Status codes: `400` bad request, `401` signed out, `403` wrong role, `404` not found or not owned, `409` conflict, `410` expired token, `413` too large, `415` unsupported type, `422` validation failure, `429` rate limited, `500` server error, `502` storage failure, `503` not configured.

### Member APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `PATCH` | `/api/me` | Member | Update only `admissionNumber` on the session user's row. |
| `POST` | `/api/devices` | Member | Create a device owned by the session user. |
| `PATCH` | `/api/devices/[id]` | Owner | Update a device; ownership is part of the query. |
| `DELETE` | `/api/devices/[id]` | Owner | Soft-delete a device if it has no open visit. |
| `POST` | `/api/uploads` | Member | Upload a JPEG, PNG, or WebP up to 5 MB to Vercel Blob. |

`POST /api/uploads` returns `{ "url": "...", "pathname": "devices/<user id>/<uuid>.<ext>" }`. The URL is accepted later only if it is HTTPS, on the configured public Blob hostname, under the session user's prefix, and ends in `.jpg`, `.jpeg`, `.png`, or `.webp`.

### Door and scan APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/door/token?dir=in\|out` | Gatekeeper/admin | Issue a 60-second door token and scan URL. |
| `GET` | `/api/door/lookup?q=…` | Gatekeeper/admin | Search the register by name or admission number. Query must be 2–80 characters. |
| `GET` | `/api/door/recent` | Gatekeeper/admin | Return the eight most recent scans. |
| `POST` | `/api/scan` | Signed-in member with a valid token | Record a QR entry or exit. Entry requires a device choice. |

`POST /api/scan` accepts:

```json
{
  "token": "door JWT",
  "choice": "device:<uuid> | borrowed | none",
  "borrowedSerial": "optional serial when choice is borrowed"
}
```

It is rate-limited to 10 scans per minute per member in process. A 429 includes `Retry-After`.

### Admin APIs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/inside` | Admin (fresh role) | Live list of open visits plus count and check time. |
| `GET` | `/admin/history/export?from=…&to=…&q=…&flag=…` | Admin | CSV export of the current history filter. |

The CSV is UTF-8 with a BOM and CRLF line endings for Excel compatibility. Columns: time in, time out, duration, name, admission number, laptop model, laptop serial, loose serial, flags, entry method, exit method.

### Operations

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET`, `POST` | `/api/cron/auto-close` | `Authorization: Bearer $CRON_SECRET` | Close every open visit and write audit rows. |
| `*` | `/api/auth/[...nextauth]` | Auth.js | OAuth sign-in, callback, session, and sign-out. |

Manual auto-close run:

```bash
curl -X POST https://vulcanlcs.vercel.app/api/cron/auto-close \
  -H "Authorization: Bearer $CRON_SECRET"
```

Successful response:

```json
{ "closed": 4, "checkedAt": "2026-11-09T19:30:00.000Z" }
```

---

## Design system

The visual language is a well-kept library ledger, not a SaaS dashboard.

### Typography

| Role | Typeface | Use |
| --- | --- | --- |
| Display | Fraunces | Page titles, greetings, large statements. |
| Interface | Instrument Sans | Body copy, labels, buttons. |
| Record | JetBrains Mono | Times, serials, admission numbers, stamps, metadata. |

All three are loaded through `next/font/google` in `src/app/layout.tsx` and exposed as CSS variables.

### Colour semantics

| Token | Meaning |
| --- | --- |
| `forest` | IN, entry, open visit, positive state. |
| `vermilion` | OUT, exit, conflict, expired, missing state. |
| `brass` | Marks, focus rings, accents, manual/administrative notes. |
| `paper` | Page background. |
| `surface` | Raised ledger surface. |
| `wash` | Quiet tint behind status marks. |
| `ink` | Primary text. |
| `ink-muted` | Secondary text. |
| `rule` | Hairline borders and ruled lines. |

Light and dark theme tokens both meet a 4.5:1 contrast ratio for text and UI marks, including vermilion and brass. The theme toggle persists the choice and the root layout bootstraps it before paint.

### Layout and materials

- Hairline rules instead of card borders and shadows.
- Flat surfaces, no gradients.
- Paper grain on the page.
- Rotated rubber-stamp marks for states such as **In library**, **Away**, **Entry**, **Exit**, and **Sample**.
- Double-line stamps on confirmation passes.
- Tables become compact ruled lists below `xl`.
- Sticky librarian rail on large screens.

### Icons and motion

- Phosphor icons only.
- No emoji, no Lucide.
- Motion is limited to state feedback: the door stamp, the hatch band, countdowns, and live clocks.
- `prefers-reduced-motion: reduce` removes animation and transition duration globally.

### Key files

- `src/app/globals.css` — tokens, base styles, focus rings, pass styles, reduced motion.
- `src/app/layout.tsx` — fonts, metadata, skip link, theme bootstrap.
- `src/components/ledger-skeleton.tsx` — shared ruled loading skeleton.
- `src/components/top-bar.tsx`, `user-menu.tsx`, `theme-toggle.tsx` — shell.
- `src/components/admin/*` — librarian desk components.
- `src/components/door/*` — door screen and manual lookup.
- `src/components/scan/*` — member scan flow.
- `src/components/laptops/*` — registration and photo fields.

---

## Accessibility

Target: **WCAG 2.2 AA**.

- Every interactive control has a touch target of at least 44px.
- Inputs always have a visible label or a screen-reader label.
- Focusable elements get a 2px brass focus ring with a 3px offset.
- Status is never conveyed by colour alone; flags and states have text labels.
- Light and dark themes meet 4.5:1 text contrast.
- The skip link jumps to the main content.
- The door screen has an accessible countdown label and a visible **New code** button.
- The live inside ledger announces its refresh state and keeps a visible check time.
- Tables have caption/label context; compact list views preserve the same information.
- `prefers-reduced-motion: reduce` disables animation and transition duration.
- Error, 404, expired-code, and auth-error pages use the same ledger language and focus treatment.

When changing UI, verify keyboard order, focus visibility, zoom at 200%, and the compact layouts at `sm`, `lg`, and `xl`.

---

## Demo mode and seed data

`npm run seed` is guarded. It exits without changing the database unless `NEXT_PUBLIC_DEMO_MODE` is exactly `true`.

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run seed
```

The seed is idempotent:

- Upserts 12 invented members by email as `demo.student1@$SCHOOL_DOMAIN` through `demo.student12@$SCHOOL_DOMAIN`.
- Upserts one laptop per member by serial, with model, admission number, and a generated SVG placeholder image in `public/demo/laptops/`.
- Deletes only those demo users' prior visits, then creates 4 open visits and 30 past visits spread across the last three days.
- Mixes realistic flags: `no_tap_out`, `borrowed`, `no_matching_entry`, `manual`, and `no_device`.

The seed does **not** create Google logins and does **not** bypass the sign-in gate. Demo member rows are ledger data; to use the app, sign in with a real Google account from `SCHOOL_DOMAIN`.

Demo mode also shows a **Simulate scan** link on the door screens. Never enable it in production, and never run the seed against production data.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript without emitting. |
| `npm run db:generate` | Generate a Drizzle migration from schema changes. |
| `npm run db:migrate` | Apply Drizzle migrations. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run seed` | Seed demo data when `NEXT_PUBLIC_DEMO_MODE=true`. |

Recommended pre-deploy check:

```bash
npm run typecheck
npm run lint
npm run build
```

There is no automated test script at present. See [Known limitations](#known-limitations).

---

## Project structure

```text
.
├── drizzle/                     Generated SQL migrations and metadata
├── public/
│   └── demo/laptops/            Generated demo laptop SVGs
├── scripts/
│   └── seed.ts                  Guarded, idempotent demo seed
├── src/
│   ├── app/
│   │   ├── actions.ts           Sign-in and sign-out server actions
│   │   ├── admin/               Librarian desk pages, actions, CSV export
│   │   ├── api/                 Auth, member, door, scan, admin, cron routes
│   │   ├── auth/error/          Sign-in failure page
│   │   ├── door/                Door screens and manual lookup
│   │   ├── me/                  Member page and laptop forms
│   │   ├── scan/                Scan flow, confirmation, expired page
│   │   ├── globals.css          Design tokens and global styles
│   │   ├── layout.tsx           Fonts, metadata, skip link, theme bootstrap
│   │   └── page.tsx             Landing page
│   ├── components/              UI by area: admin, door, laptops, member, scan
│   ├── db/
│   │   ├── index.ts             Lazy pooled database client
│   │   └── schema.ts            Drizzle schema and constraints
│   ├── lib/                     Auth, data, validation, time, rate limit, helpers
│   └── types/                   Auth.js type augmentation
├── drizzle.config.ts            Drizzle Kit configuration
├── neon.ts                      Neon CLI project configuration
├── next.config.ts               Next.js configuration
├── PRODUCT.md                   Product intent and design principles
├── vercel.json                  Cron schedule
└── README.md
```

Useful modules:

| File | Responsibility |
| --- | --- |
| `src/auth.ts` | Google provider, domain gate, user upsert, role resolution, JWT/session callbacks. |
| `src/lib/authz.ts` | Server-side page and action guards, fresh-role checks. |
| `src/lib/scan-service.ts` | Shared entry/exit write path for QR and manual scans. |
| `src/lib/auto-close.ts` | Writable-CTE auto-close and system actor. |
| `src/lib/door-token.ts` | Door JWT issuance and verification. |
| `src/lib/admin-data.ts` | Librarian queries, filters, pagination, exports. |
| `src/lib/school-date.ts` | Timezone-safe day boundaries. |
| `src/lib/time.ts` | School-timezone formatting and greetings. |
| `src/lib/photos.ts` | Image signature detection and Blob URL validation. |
| `src/lib/member-rules.ts` | Shared limits, normalisation, and exact copy. |

---

## Deployment

Vulcan is designed for Vercel with Neon Postgres and a public Vercel Blob store.

### 1. Create the production database

Create or reuse a Neon project. Keep the production branch separate from local demo data. Copy the pooled and direct connection strings.

### 2. Apply migrations

Run against the production database before the first deploy:

```bash
DATABASE_URL="postgres://…pooled…" \
DATABASE_URL_UNPOOLED="postgres://…direct…" \
npm run db:migrate
```

Do not run `npm run seed` in production unless you are deliberately creating a demo environment.

### 3. Create the Vercel project

Import the repository and add every required variable under **Project → Settings → Environment Variables**. Use separate secrets from local development.

Production-specific values:

```dotenv
AUTH_URL="https://vulcanlcs.vercel.app"
NEXT_PUBLIC_APP_URL="https://vulcanlcs.vercel.app"
SCHOOL_TIME_ZONE="Africa/Nairobi"
NEXT_PUBLIC_DEMO_MODE="false"
```

`NEXT_PUBLIC_*` values are build-time. Setting them after a build requires a redeploy.

### 4. Update Google OAuth

Add the production redirect URI in Google Cloud Console:

```text
https://vulcanlcs.vercel.app/api/auth/callback/google
```

Publish the OAuth consent screen or keep the test-user list current.

### 5. Connect Vercel Blob

Create a public Blob store and add `BLOB_READ_WRITE_TOKEN`. Leave `BLOB_STORE_ID` blank unless the token does not expose the store id.

### 6. Configure the cron job

`vercel.json` schedules `/api/cron/auto-close` at the library's closing time:

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-close",
      "schedule": "30 19 * * *"
    }
  ]
}
```

The schedule is in UTC. `30 19 * * *` is **22:30 in `Africa/Nairobi`** (19:30 UTC). Nairobi does not observe daylight saving, so no adjustment is needed. If you move the school to a DST timezone, adjust the schedule seasonally or use an external scheduler that understands `SCHOOL_TIME_ZONE`.

### 7. Deploy

Build and deploy. Verify:

- `/` loads and the Google button starts the OAuth flow.
- The callback returns to `/me`.
- `/admin` is reachable only by an admin.
- A door screen issues codes and the scan flow records visits.
- A laptop photo uploads successfully.
- The cron route returns 401 without the bearer token and 200 with it.

### Production checklist

- [ ] Production `DATABASE_URL` set in Vercel; `DATABASE_URL_UNPOOLED` available for migration runs.
- [ ] Migrations applied to the production branch.
- [ ] `AUTH_SECRET`, `TOKEN_SECRET`, and `CRON_SECRET` are distinct, strong production values.
- [ ] Production Google redirect URI registered.
- [ ] OAuth app published or test users maintained.
- [ ] `AUTH_URL` and `NEXT_PUBLIC_APP_URL` use the production origin.
- [ ] `SCHOOL_DOMAIN` is the real school domain.
- [ ] `ADMIN_EMAILS` contains the real librarian address(es).
- [ ] `SCHOOL_TIME_ZONE` is the school's IANA timezone.
- [ ] Public Blob store connected and photo upload tested.
- [ ] `NEXT_PUBLIC_DEMO_MODE` is `false` or unset.
- [ ] `vercel.json` cron schedule replaced with the real closing time.
- [ ] Seed not run against production.
- [ ] `/api/cron/auto-close` tested with the bearer token.
- [ ] Backups or Neon branch/restore policy understood.

---

## Operations

### Check who is inside

```sql
select
  v.id,
  v.entry_at,
  u.name,
  u.email,
  u.admission_number,
  d.model,
  d.serial,
  v.loose_serial,
  v.flags
from visits v
join users u on u.id = v.user_id
left join devices d on d.id = v.device_id
where v.exit_at is null
order by v.entry_at;
```

### Run auto-close manually

```bash
curl -X POST https://vulcanlcs.vercel.app/api/cron/auto-close \
  -H "Authorization: Bearer $CRON_SECRET"
```

Running it during the day closes every open visit. Use it only at closing time or in a controlled test.

### Check the audit trail

```sql
select created_at, action, entity, entity_id, meta
from audit_log
order by created_at desc
limit 50;
```

### Rotate secrets

- `AUTH_SECRET` — rotating signs out every session.
- `TOKEN_SECRET` — rotating invalidates every outstanding door code; new codes work immediately.
- `CRON_SECRET` — update it in Vercel as well, or the cron will receive 401.
- Google client secret — create a new secret in Google Cloud Console and update Vercel.
- Neon password — reset the role password and update both connection strings.

Rotate immediately if a secret is committed, pasted into a chat, or exposed in logs.

### Neon branches

Neon's copy-on-write branches are useful for testing migrations and destructive changes. Create a branch, run migrations and the seed against it, verify, then discard it. Do not point local development at the production branch while testing destructive SQL.

### Logs

Server errors are logged with `console.error` and appear in the Vercel function logs. The most useful messages are prefixed with the flow name, such as `Scan write failed`, `Auto-close failed`, `Vercel Blob upload failed`, or `Librarian sign-out failed`.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `redirect_uri_mismatch` from Google | The callback URL is not registered exactly. | Add `http://localhost:3000/api/auth/callback/google` and the production equivalent. Match scheme, host, port, and path. |
| “Access blocked” or “app is being tested” | OAuth app is External and in Testing, and the account is not a test user. | Add the address under **OAuth consent screen → Test users**, or publish the app. |
| Sign-in succeeds at Google but Vulcan rejects the account | The email is neither at `SCHOOL_DOMAIN` nor in `ADMIN_EMAILS`. | Use a school account, or add the address to `ADMIN_EMAILS` if it should have the librarian desk. Restart the dev server after changing env values. |
| `DATABASE_URL is not set` | `.env.local` missing or the server started before it existed. | Add the pooled URL and restart `npm run dev`. |
| `relation "users" does not exist` | Migrations have not run against this database. | `npm run db:migrate` with the correct `DATABASE_URL`/`DATABASE_URL_UNPOOLED`. |
| `password authentication failed` | Wrong password, role, or database in the connection string. | Re-copy the Neon connection string; check for stale credentials. |
| SSL warning from `pg` | `pg` treats `sslmode=require` as `verify-full` in the next major version. | The warning is informational. Use `sslmode=verify-full` explicitly, or add `uselibpqcompat=true` for libpq semantics. |
| Photo upload returns 503 | `BLOB_READ_WRITE_TOKEN` is missing or invalid. | Create a public Blob store and set the token. Restart the server. |
| Photo URL rejected when saving a laptop | The URL is not from the configured public Blob store or not under the user's prefix. | Confirm the store is public and the token/`BLOB_STORE_ID` matches the store that issued the URL. Re-upload the photo. |
| Door screen says “Door codes aren't configured” | `TOKEN_SECRET` or `NEXT_PUBLIC_APP_URL` is missing. | Set both and restart/rebuild. `NEXT_PUBLIC_APP_URL` needs a rebuild in production. |
| QR code points at the wrong host | `NEXT_PUBLIC_APP_URL` is stale or wrong. | Set the correct origin, no trailing slash, and rebuild. |
| “That code has expired” | The 60-second code has passed. | Scan the code currently on the screen. |
| “This laptop is already inside under another visit” | Another open visit holds the same device. | Ask the gatekeeper to close the other visit, or choose the correct laptop. |
| 429 from a scan | More than 10 scans in a minute for the member. | Wait for `Retry-After` seconds. |
| Cron returns 401 | `CRON_SECRET` does not match the bearer token. | Update the Vercel env var and redeploy; check the request header. |
| Cron returns 503 | `CRON_SECRET` is not set. | Add it to the environment. |
| Auto-close closed everyone at midday | The route closes every open visit; it has no time-of-day guard. | Run it only at closing time. The schedule, not the route, controls timing. |
| History dates look shifted | `SCHOOL_TIME_ZONE` is wrong. | Set the correct IANA timezone and restart/rebuild. |
| Admin desk access does not change immediately | Only fresh-role checks bypass the JWT snapshot. Gatekeeper pages can lag up to five minutes. | Sign out and back in, or wait for the refresh window. |
| Tables overflow on a tablet | The compact layout starts below `xl`. | Check the `xl` breakpoint and the compact list rendering. |
| `npm run seed` does nothing | `NEXT_PUBLIC_DEMO_MODE` is not exactly `true`. | Set it in `.env.local` or prefix the command. |
| Build fails after changing `NEXT_PUBLIC_*` | Public env values are read at build time. | Set them in the build environment and redeploy. |

---

## Security notes

- **Server-side authorization.** Every guarded page and API re-checks the session and role on the server. The client is never trusted for identity or role.
- **Domain gate.** Google sign-in is restricted to verified school-domain emails, with a narrow exception for explicitly allowlisted `ADMIN_EMAILS`. The Google `hd` hint is not an authorization control.
- **Fresh admin checks.** The librarian area re-reads `role_grants` and `ADMIN_EMAILS` on every request.
- **Safe redirects.** Post-auth return paths are limited to same-origin relative paths.
- **Secret isolation.** `AUTH_SECRET`, `TOKEN_SECRET`, `CRON_SECRET`, the Google client secret, the Neon password, and the Blob token are server-side secrets. Never expose them through `NEXT_PUBLIC_*`.
- **Door tokens.** HS256, 60-second expiry, direction-bound, unique `jti`. Verification happens on both the page and the write route.
- **Photo URL validation.** Uploads are written under the user's prefix; attached URLs must be HTTPS on the configured public Blob host and under that prefix.
- **Image validation.** The upload route detects JPEG/PNG/WebP from file signatures rather than trusting the MIME header.
- **SQL safety.** Drizzle parameterises queries. Dynamic filters are parsed and bounded instead of concatenated.
- **Rate limiting.** Scans are limited in process. This is a double-tap guard, not a hard distributed quota.
- **Soft deletes.** Devices are marked inactive instead of deleted, preserving visit history.
- **Audit trail.** Visit and role changes write audit rows. Auto-close uses a single writable CTE so the visit and audit row cannot diverge.
- **Reserved system account.** `auto-close@vulcan.invalid` cannot sign in because `.invalid` can never match a real school domain.
- **PII.** The ledger holds names, school email addresses, admission numbers, laptop serials, and photos. Restrict database, Blob, and Vercel access to staff who need it. Public Blob URLs are unguessable but not access-controlled; do not upload sensitive documents.
- **Production demo mode.** Leave `NEXT_PUBLIC_DEMO_MODE` off in production. Do not run the seed against real data.
- **Secret rotation.** Rotate any credential that has been pasted into a chat, committed, or printed in a log. Rotate `CRON_SECRET` in Vercel at the same time as the app.

---

## Known limitations

- **In-process rate limiting.** Serverless instances do not share memory. A hard cross-instance quota needs a shared store such as Upstash Redis.
- **Gatekeeper revocation lag.** Door pages and door APIs use the cached JWT role, so a revoked gatekeeper may retain access for up to five minutes. The librarian area is immediate.
- **Single school.** The deployment is configured for one `SCHOOL_DOMAIN` and one timezone. Multi-tenant support would require schema and configuration changes.
- **Cron is UTC.** The schedule is set to `30 19 * * *` (22:30 EAT / 19:30 UTC). It does not follow daylight saving automatically; a school in a DST zone must adjust it seasonally or use an external scheduler.
- **No automated tests yet.** Typecheck, lint, and manual flows are the current safety net. Add unit tests for scan state transitions and timezone boundaries, and integration tests for the API guards.
- **Public photo URLs.** Laptop and serial photos are publicly readable by URL. They are not indexed, but they are not private.
- **No offline mode.** The door needs a network connection to issue codes and write visits.
- **No email or notification delivery.** There are no reminders for open visits or grants.
- **No bulk import.** Members and laptops are created through sign-in and the register, or through the seed for demos.
- **`device_kind = library` is reserved.** The current member flow creates personal devices only.
- **No hard-delete UI.** Users, visits, and audit rows are not deleted from the app. Use database tooling for retention work.
- **Manual scans use a server action.** There is no public manual-scan JSON API; the desk UI posts to a server action.

---

## License

No license file is included in this repository. Treat Vulcan as a private project unless a license is added before distribution.
