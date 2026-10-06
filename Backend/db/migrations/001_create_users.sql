-- 001: users
-- One row per person who has signed in. Identity comes from Firebase (firebase_uid);
-- everything else (role, profile) is OURS and lives only in this database.

CREATE TYPE user_role AS ENUM ('STUDENT', 'ORGANIZER', 'ADMIN');

CREATE TABLE users (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- identity (copied from the verified Firebase token on first login)
  firebase_uid         TEXT        NOT NULL UNIQUE,
  email                TEXT        NOT NULL UNIQUE,   -- always stored lower-case
  display_name         TEXT        NOT NULL,
  photo_url            TEXT,

  -- authorization: decided by us, never by the client
  role                 user_role   NOT NULL DEFAULT 'STUDENT',

  -- profile: NULL until the student completes onboarding
  enrollment_no        TEXT        UNIQUE,            -- one account per enrollment number
  batch                TEXT,
  codeforces_handle    TEXT,
  leetcode_handle      TEXT,
  hackerrank_handle    TEXT,
  profile_completed_at TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- the database itself refuses a "completed" profile with the essentials missing
  CONSTRAINT completed_profile_has_required_fields CHECK (
    profile_completed_at IS NULL
    OR (enrollment_no IS NOT NULL AND batch IS NOT NULL
        AND (codeforces_handle IS NOT NULL OR leetcode_handle IS NOT NULL OR hackerrank_handle IS NOT NULL))
  )
);
