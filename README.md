# Knuth Programming Hub

This repository contains the web app and API for the Knuth Programming Hub platform. The app is structured as a Next.js frontend and a separate Express + PostgreSQL backend, with Firebase used for Google sign-in and the backend enforcing access rules.

## Project status

This is a working, minimal contest platform focused on:

- college-only Google sign-in
- user onboarding and profile completion
- contest listing and registration
- a small dashboard experience centered on the currently open contest
- shared Knuth branding in the main header and login brand area

The current implementation is intentionally conservative: it preserves the existing backend contracts and frontend flows rather than introducing a larger framework or new data model.

### Branding note

The app includes a shared header-branding pattern used in the dashboard shell and the landing page. The branding is intentionally centralized in the common UI instead of being implemented separately on each page.

Static logo assets are stored under `public/images/branding/` and are expected to be provided as theme-specific PNG files for dark and light modes.

---

## Tech stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Firebase client SDK for authentication
- Tailwind-based styling

### Backend

- Node.js + Express 5
- PostgreSQL via `pg`
- Firebase Admin SDK for token verification
- CORS + Helmet for API hardening

### Database

- PostgreSQL
- SQL migration files under `Backend/db/migrations/`
- App uses a single PostgreSQL instance via `DATABASE_URL`

---

## Repository layout

```text
.
├── .env.example
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── src/
│   ├── app/
│   ├── components/
│   ├── config/
│   ├── fixtures/
│   ├── lib/
│   └── types/
├── public/
│   └── images/
│       └── branding/
│           ├── knuth-logo-dark.png
│           └── knuth-logo-light.png
├── Backend/
│   ├── .env.example
│   ├── package.json
│   ├── server.js
│   ├── scripts/
│   ├── src/
│   └── db/
└── README.md
```

### Frontend responsibilities

The Next.js app lives in the root project directory and handles:

- landing / auth experience
- onboarding flow for new users
- shared header / navigation branding
- dashboard shell and navigation
- profile access and edit flows
- contest overview and registration pages

The app uses the current theme state to select the correct logo asset for dark and light modes in the shared brand area.

### Backend responsibilities

The Express app under `Backend/` handles:

- Firebase token verification
- allowed-email enforcement
- user creation / profile persistence
- contest listing and registration logic
- validation and database constraints

---

## Authentication and access rules

Authentication is handled by Firebase on the web app. The real security checks happen on the backend.

### Frontend sign-in flow

- the app uses Google popup sign-in through Firebase
- the client checks only the email domain locally for quick feedback
- the backend validates the Firebase ID token and confirms the email is from the approved college domain

### Email policy

The system only allows college Google accounts with the configured domain, currently:

- `mail.jiit.ac.in`

This is controlled by:

- `src/lib/email-domain.ts` for the client-side convenience check
- `Backend/src/config/env.js` and `Backend/src/middleware/authenticate.js` for the real enforcement

If someone signs in with a non-college account, they are rejected at the API layer.

---

## User and profile model

The database stores users keyed by Firebase UID and email. The profile is complete only when the required data is present.

### Required fields for profile completion

The current backend logic treats these as the minimum required profile fields:

- enrollment number
- batch (typed by the student)
- branch (**detected by the server** from campus + batch, never typed)
- Year of Study (**detected by the server** from the enrollment number and today's date, never typed or stored)

The onboarding form and profile validation are deliberately focused on these values. Coding handles like Codeforces, CodeChef, LeetCode, and HackerRank are optional and can be added later.

This is enforced in:

- `Backend/src/validation/profile.js`
- `Backend/src/services/userService.js`
- `Backend/db/migrations/004_handles_optional.sql`

### Roles and the core team

- **Everyone** who signs in with an enrollment-number email (e.g. `2501030069@mail.jiit.ac.in`) is a **STUDENT** (`role`).
- People on the **core team list** are *additionally* marked `coreTeamRole`: **COORDINATOR** or **VOLUNTEER**. A coordinator is still a student.
- The list lives in the `core_team_members` table (migration `008`) and is loaded from a private CSV. The CSV is **not** committed (`Backend/private/` is git-ignored).
- Membership is matched against the enrollment number in the **verified login email only**. A number a user types at onboarding never counts, so nobody can claim a role by typing someone else's number.
- Changes apply on the next request. Nobody has to sign in again, and people can be listed before their first login.

**Changing the list.** Edit `Backend/private/core-team.csv` (one `enrollment_no,ROLE` per line, `ROLE` is `COORDINATOR` or `VOLUNTEER`), then:

```bash
cd Backend
npm run roles:import -- private/core-team.csv --dry-run   # shows what would change, writes nothing
npm run roles:import -- private/core-team.csv             # applies it
```

The CSV is the **full** list: the database is made to match it, so deleting a line removes that person's role. A file with any error imports nothing. For the live site, run the same import with the live `DATABASE_URL` (the same way you run `npm run migrate`).

### Academic details (campus, branch, Year of Study)

All rules are data in **one file: `Backend/src/config/academic.js`** (campuses and their enrollment-number formats, batch letter -> branch per campus with optional admission-year ranges, the July 20 academic-year start, programme length). The logic that reads it is `Backend/src/utils/academic.js`. To add a campus, batch or branch, edit the tables in the config file only.

- Campus 62 enrollment numbers: `YY` + 8 digits (e.g. `2501030069`). Campus 128: `99` + `YY` + 8 digits (e.g. `992501030069`).
- Year of Study = current academic year - admission year + 1. The academic year starts on **July 20** (India time), so it changes by itself; nothing year-related is stored in the database.
- Branch = the batch letter looked up for the student's campus (and admission year: e.g. `H` = IT on campus 62 only from the 2026 intake).
- `branch` and `yearOfStudy` sent by a client are ignored; the API returns the derived values in `profile.academic`.
- Students who think their details are wrong are told to contact `kph.jiit@gmail.com`; there is no in-app correction flow.

### Important behavior

- the application does not trust profile values sent by the browser for sensitive fields
- the backend reads or preserves values it already knows and validates the rest
- `enrollment_no` is kept once known and cannot be reused by a different account

---

## Contest flow

Contests live in the `contests` table and are seeded by migrations:

| slug | title | when (Indian time) | registration |
|---|---|---|---|
| `encode-26-2` | Encode 26.2 | 24 Oct 2026, 14:00 – 16:00 (venue: CL1 & CL2) | open until **14:15 on 24 Oct 2026**, then closes by itself |
| `execute-26-4` | Execute 26.4 | 31 Oct 2026, 14:00 – 16:00 | **Registrations Opening Soon** (not open yet) |

They are defined in `Backend/db/migrations/005_contests_registrations.sql` (the table and Encode) and `007_contest_schedule.sql` (the schedule, the registration status and Execute) and `009_contest_venue.sql` (the venue column and the Encode description).

### Schedule and registration status

Each contest has `starts_at`, `ends_at` and `registration_closes_at` (exact moments; the site always shows them in Indian time, whatever the visitor's device time zone is) and a `registration_status`:

- `SOON` — shown as "Registrations Opening Soon"; nobody can register yet (`409 REGISTRATION_NOT_OPEN`)
- `OPEN` — people can register, until `registration_closes_at` if one is set
- `CLOSED` — nobody can register (`409 REGISTRATION_CLOSED`)

When `registration_closes_at` passes, registration counts as `CLOSED` automatically, to the second, on the server; nobody has to change anything. The API returns the worked-out `registrationStatus` (and `registrationOpen`) so the browser only displays it. The dashboard and the Contests page both list every contest from the database, so a new contest appears on both by itself.

Common changes, run in the Supabase SQL editor:

```sql
-- open registration for Execute 26.4
UPDATE contests SET registration_status = 'OPEN' WHERE slug = 'execute-26-4';

-- give it a deadline (14:15 IST on 31 Oct 2026)
UPDATE contests SET registration_closes_at = '2026-10-31 14:15:00+05:30' WHERE slug = 'execute-26-4';

-- close registration right now
UPDATE contests SET registration_status = 'CLOSED' WHERE slug = 'encode-26-2';

-- remove one person's test registration (by their enrollment number)
DELETE FROM contest_registrations WHERE user_id = (SELECT id FROM users WHERE enrollment_no = '2501030069');
```

The old `registration_open` on/off column was replaced by `registration_status` in migration 007 (existing values were carried over).

### Contest API

The backend exposes these authenticated routes:

- `GET /api/contests` — list visible contests for the current user
- `GET /api/contests/:slug` — fetch contest details and registration state
- `POST /api/contests/:slug/registrations` — register the current user for a contest

The registration validation stores only:

- `hackerrankHandle`

The backend reads the member’s profile details (enrollment number, batch, branch and **Year of Study**) from the database and does not allow the client to submit another person’s details. If a request includes a `yearOfStudy` that differs from the profile, it is rejected with `400`; if the profile has no valid Year of Study the API answers `409 YEAR_OF_STUDY_UNAVAILABLE`.

(`contest_registrations.team_name` is no longer used; the column is kept, nullable, so old registrations keep their data. See `006_registration_no_team_name.sql`.)

### Sessions

Sessions are talks and workshops. They work like contests **without any form field to type**: a student clicks Register, and who they are comes from their saved profile.

- The tab is **Sessions** (`/dashboard/sessions`, and `/dashboard/sessions/[slug]` for the page + registration).
- Upcoming sessions also appear on the dashboard under **Upcoming Sessions**. A finished session drops off the dashboard; the Sessions page keeps showing it.
- The registration form shows **Enrollment number, Name, Batch, Branch and Year of Study**, all read-only and filled from the profile. The request has no body: the server reads the same details from the profile, so they cannot be changed or faked. The same rules as contests apply (profile must be complete, valid Year of Study, a mismatching `yearOfStudy` is refused with `400`).
- Tables (migration `011_sessions.sql`): `sessions` and `session_registrations` (one registration per person per session, enforced by the database). The registration stores only ids and a time; name, batch and the rest are always read from the profile.
- API (all authenticated): `GET /api/sessions`, `GET /api/sessions/:slug`, `POST /api/sessions/:slug/registrations`.
- Registration status works as for contests (`SOON` / `OPEN` / `CLOSED`). With no `registration_closes_at`, a session **closes registration by itself when it ends**.

Edit a session (all times are Indian time):

```sql
UPDATE sessions SET venue = 'LT3', starts_at = '2026-10-27 17:00+05:30', ends_at = '2026-10-27 18:30+05:30',
                    description = '...', updated_at = now()
 WHERE slug = 'interview-talks-by-seniors';

UPDATE sessions SET registration_closes_at = '2026-10-27 16:00+05:30' WHERE slug = 'interview-talks-by-seniors'; -- close earlier
UPDATE sessions SET registration_status = 'CLOSED' WHERE slug = 'interview-talks-by-seniors';                      -- or switch off now
```

Add a new session (it appears on the Sessions page and the dashboard by itself):

```sql
INSERT INTO sessions (slug, title, description, venue, starts_at, ends_at)
VALUES ('resume-workshop', 'Resume Workshop', 'How to write a resume that gets noticed.', 'LT2',
        '2026-11-05 17:00+05:30', '2026-11-05 18:00+05:30');
```

Attendee list for a session (Year of Study is not stored, so the query works it out from the enrollment number and the July 20 rule):

```sql
WITH people AS (
  SELECT u.enrollment_no, u.display_name, u.batch, u.branch, r.created_at AS registered_at,
         2000 + (CASE WHEN length(u.enrollment_no) = 12 THEN substr(u.enrollment_no, 3, 2) ELSE substr(u.enrollment_no, 1, 2) END)::int AS admission_year,
         EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int
           - CASE WHEN (now() AT TIME ZONE 'Asia/Kolkata')::date < make_date(EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int, 7, 20) THEN 1 ELSE 0 END AS academic_year
    FROM session_registrations r
    JOIN sessions s ON s.id = r.session_id
    JOIN users u    ON u.id = r.user_id
   WHERE s.slug = 'interview-talks-by-seniors'
)
SELECT enrollment_no, display_name, batch, branch, academic_year - admission_year + 1 AS year_of_study, registered_at
  FROM people ORDER BY registered_at;
```

---

## Routing and app flow

### Frontend pages

Key routes in the app include:

- `/` — landing / sign-in page
- `/onboarding` — onboarding for new users
- `/dashboard` — greeting, Upcoming Contests and Upcoming Sessions
- `/dashboard/contests` — contest listings
- `/dashboard/contests/[slug]` — contest detail + registration page
- `/dashboard/sessions` — session listings
- `/dashboard/sessions/[slug]` — session detail + registration page
- `/dashboard/profile` — user profile screen

### Route protection

The app relies on two guard layers:

- client-side UX gates in `src/components/dashboard-access.tsx` and `src/app/onboarding/page.tsx`
- backend enforcement in the Express API via `requireLogin`

This means a signed-out or invalid user cannot fully use the protected dashboard even if the frontend is bypassed.

---

## Local development setup

### 1. Install root dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
cd Backend
npm install
```

### 3. Configure environment variables

#### Frontend

Copy the sample file:

```bash
cp .env.example .env.local
```

This file contains the Firebase web config and the API URL.

#### Backend

Copy the sample file:

```bash
cp Backend/.env.example Backend/.env
```

Then fill in the actual values for:

- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `ALLOWED_EMAIL_DOMAIN`
- `CORS_ORIGIN`

Do not commit secrets or production credentials.

---

## Running the app

### Start the backend

```bash
cd Backend
npm run dev
```

### Start the frontend

```bash
npm run dev
```

The frontend is expected to communicate with the backend at the URL defined by `NEXT_PUBLIC_API_URL` in `.env.local`.

---

## Database setup and migrations

Run the migration scripts from the backend folder:

```bash
cd Backend
npm run migrate
```

This applies the SQL files under `Backend/db/migrations/` in order. The migration files currently define:

- users table
- profile completion constraints
- optional handling fields
- contests and registrations tables
- the initial seeded contest

---

## Environment file conventions

### Frontend

`src/lib/firebase/client.ts` reads Firebase values from `NEXT_PUBLIC_*` environment variables.

Example values are documented in `.env.example`.

### Backend

`Backend/server.js` and `Backend/src/config/env.js` read server-side values from `Backend/.env`.

The backend does not use Firebase service-account secrets for token verification; it uses the project ID and verifies Google-issued tokens.

---

## Validation and business rules

The backend is intentionally strict about what it accepts.

### Profile validation

`Backend/src/validation/profile.js` validates:

- `enrollmentNo`
- `batch`
- `branch`
- optional coding handles

It trims whitespace, normalizes casing where appropriate, and rejects malformed inputs.

### Registration validation

`Backend/src/validation/registration.js` requires:

- `hackerrankHandle`

and rejects invalid or empty values early.

### Database constraints

The SQL schema includes constraints for:

- unique Firebase user rows
- unique contest registration per user per contest
- required profile completion conditions

These constraints provide a second layer of protection beyond route validation.

---

## Useful verification commands

From the repo root, developers can run:

```bash
npm run build
```

From the backend folder:

```bash
cd Backend
npm test
```

---

## Notes for future contributors

- Do not trust the browser for identity or profile correctness; the backend is the source of truth.
- Keep the app minimal and aligned with the current product direction.
- If you change the onboarding or profile completion rules, update both the frontend UX and backend validation together.
- If you add new contest flow logic, keep it consistent with the existing service/controller pattern.
- Preserve the current Firebase + PostgreSQL architecture unless a concrete requirement forces a broader change.

---

## Summary

This repo is a small, focused student contest platform with:

- Firebase-backed Google auth
- PostgreSQL-backed user and contest data
- minimal dashboard and contest registration UX
- strict backend validation and domain restrictions

It is designed to be small, secure, and easy to reason about without a large app framework or unnecessary abstraction layers.
