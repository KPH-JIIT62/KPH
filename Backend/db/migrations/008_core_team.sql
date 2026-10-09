-- 008: the core team roster.
--
-- Everyone who signs in with an enrollment-number email is a STUDENT (users.role is not touched by this migration).
-- People on this list are ADDITIONALLY core team, as either a COORDINATOR or a VOLUNTEER.
--
-- The list is keyed by enrollment number, not by user, so:
--   - a person can be listed before they have ever signed in (they get the role on their first login),
--   - changing the list takes effect on the very next request: no user rows are rewritten, nobody has to sign in again.
-- The server matches it against the enrollment number in the VERIFIED login email only, never against a number a user typed.
--
-- The list is loaded from a private CSV with:  npm run roles:import -- private/core-team.csv
-- To add a role later (e.g. LEAD): add it to Backend/src/config/coreTeam.js AND to the CHECK below (new migration).

CREATE TABLE core_team_members (
  enrollment_no TEXT        PRIMARY KEY,
  role          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT core_team_role_valid CHECK (role IN ('COORDINATOR', 'VOLUNTEER')),
  -- same shape the app takes from an email: digits only
  CONSTRAINT core_team_enrollment_format CHECK (enrollment_no ~ '^[0-9]{5,20}$')
);
