-- 005: contests, and one registration per student per contest.

CREATE TABLE contests (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT        NOT NULL UNIQUE,          -- used in URLs: /dashboard/contests/encode-26-2
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL DEFAULT '',
  starts_at         TIMESTAMPTZ,                          -- NULL = date not announced yet
  registration_open BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contest_registrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: a contest that has registrations cannot be deleted by accident.
  contest_id        UUID        NOT NULL REFERENCES contests (id) ON DELETE RESTRICT,
  -- CASCADE: if a user row is deleted, their registrations go with it (they mean nothing without the person).
  user_id           UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  team_name         TEXT        NOT NULL,
  hackerrank_handle TEXT        NOT NULL,                  -- the HackerRank ID they registered with
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- the database itself guarantees nobody registers twice, even if two requests arrive at the same moment
  CONSTRAINT one_registration_per_user_per_contest UNIQUE (contest_id, user_id),
  CONSTRAINT team_name_length CHECK (char_length(team_name) BETWEEN 2 AND 40)
);
-- indexes for the questions we will ask: "who is in team X of contest Y?" and "which contests is user Z in?"
CREATE INDEX contest_registrations_team_idx ON contest_registrations (contest_id, lower(team_name));
CREATE INDEX contest_registrations_user_idx ON contest_registrations (user_id);

-- The first contest. Edit the date later, e.g.:  UPDATE contests SET starts_at = '2026-11-15 18:00+05:30' WHERE slug = 'encode-26-2';
INSERT INTO contests (slug, title, description)
VALUES ('encode-26-2', 'Encode 26.2',
        'Register your team below. You will need a HackerRank account. The date and full details will be announced soon.')
ON CONFLICT (slug) DO NOTHING;
