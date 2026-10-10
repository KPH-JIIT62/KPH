-- 011: sessions (talks, workshops...) and one registration per student per session.
--
-- A session is like a contest without a HackerRank ID: students just register. Who registered is read from their
-- saved profile (enrollment number, name, batch, branch; Year of Study is worked out from the enrollment number),
-- so nothing about the person is stored on the registration itself and it can never go stale.
--
-- registration_status works exactly as for contests:
--   SOON   = "Registrations opening soon": shown on the site, nobody can register yet
--   OPEN   = people can register
--   CLOSED = nobody can register
-- A session with no registration_closes_at stops taking registrations by itself when it ends (the site does this;
-- nobody has to flip anything). Set registration_closes_at to close earlier, e.g. when the hall fills up.
-- All times are exact moments (timestamptz); the site shows them in Indian time.

CREATE TABLE sessions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   TEXT        NOT NULL UNIQUE,   -- used in URLs: /dashboard/sessions/interview-talks-by-seniors
  title                  TEXT        NOT NULL,
  description            TEXT        NOT NULL DEFAULT '',
  venue                  TEXT,                          -- NULL = not announced; the site hides the line
  starts_at              TIMESTAMPTZ,                   -- NULL = date not announced yet
  ends_at                TIMESTAMPTZ,
  registration_closes_at TIMESTAMPTZ,
  registration_status    TEXT        NOT NULL DEFAULT 'OPEN',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT session_registration_status_valid      CHECK (registration_status IN ('SOON', 'OPEN', 'CLOSED')),
  CONSTRAINT session_ends_after_it_starts           CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  CONSTRAINT session_registration_closes_by_the_end CHECK (registration_closes_at IS NULL OR ends_at IS NULL OR registration_closes_at <= ends_at)
);

CREATE TABLE session_registrations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: a session that has registrations cannot be deleted by accident.
  session_id UUID        NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
  -- CASCADE: if a user row is deleted, their registrations go with it.
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- the database itself guarantees nobody registers twice, even if two requests arrive at the same moment
  CONSTRAINT one_registration_per_user_per_session UNIQUE (session_id, user_id)
);
CREATE INDEX session_registrations_user_idx ON session_registrations (user_id);

-- Interview Talks by Seniors: 27 Oct 2026, 17:00-18:30 IST, LT3.
-- The description is a short placeholder. Change it any time:
--   UPDATE sessions SET description = '...' WHERE slug = 'interview-talks-by-seniors';
INSERT INTO sessions (slug, title, description, venue, starts_at, ends_at)
VALUES ('interview-talks-by-seniors', 'Interview Talks by Seniors',
        'Seniors share their interview experiences and tips on how to prepare.',
        'LT3', '2026-10-27 17:00:00+05:30', '2026-10-27 18:30:00+05:30')
ON CONFLICT (slug) DO NOTHING;
