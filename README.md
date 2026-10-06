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
- batch
- branch

The onboarding form and profile validation are deliberately focused on these values. Coding handles like Codeforces, CodeChef, LeetCode, and HackerRank are optional and can be added later.

This is enforced in:

- `Backend/src/validation/profile.js`
- `Backend/src/services/userService.js`
- `Backend/db/migrations/004_handles_optional.sql`

### Important behavior

- the application does not trust profile values sent by the browser for sensitive fields
- the backend reads or preserves values it already knows and validates the rest
- `enrollment_no` is kept once known and cannot be reused by a different account

---

## Contest flow

The current product has a single active contest seeded into the database:

- slug: `encode-26-2`
- title: `Encode 26.2`

This is defined in:

- `Backend/db/migrations/005_contests_registrations.sql`

### Contest API

The backend exposes these authenticated routes:

- `GET /api/contests` — list visible contests for the current user
- `GET /api/contests/:slug` — fetch contest details and registration state
- `POST /api/contests/:slug/registrations` — register the current user for a contest

The registration validation accepts only:

- `teamName`
- `hackerrankHandle`

The backend reads the member’s profile details from the database and does not allow the client to submit another person’s enrollment number, batch, or branch.

---

## Routing and app flow

### Frontend pages

Key routes in the app include:

- `/` — landing / sign-in page
- `/onboarding` — onboarding for new users
- `/dashboard` — minimal dashboard view
- `/dashboard/contests` — contest listings
- `/dashboard/contests/[slug]` — contest detail + registration page
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

- `teamName`
- `hackerrankHandle`

and rejects invalid or empty values early.

### Database constraints

The SQL schema includes constraints for:

- unique Firebase user rows
- unique contest registration per user per contest
- valid team name lengths
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
