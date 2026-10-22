-- Execute 26.4 team registrations. Separate from individual registrations so existing contests retain their model.
CREATE TABLE contest_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES contests(id) ON DELETE RESTRICT,
  team_name TEXT NOT NULL,
  hackerrank_handle TEXT NOT NULL CHECK (char_length(hackerrank_handle) BETWEEN 1 AND 80),
  leader_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'WITHDRAWN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  CONSTRAINT execute_team_name_length CHECK (char_length(team_name) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX execute_unique_team_name ON contest_teams(contest_id, lower(team_name));
CREATE UNIQUE INDEX execute_unique_hackerrank ON contest_teams(contest_id, lower(hackerrank_handle));

CREATE TABLE contest_team_members (
  team_id UUID NOT NULL REFERENCES contest_teams(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('LEADER', 'MEMBER')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

CREATE UNIQUE INDEX execute_one_leader_per_team ON contest_team_members(team_id) WHERE role = 'LEADER';

CREATE INDEX contest_team_members_user_idx ON contest_team_members(user_id);
CREATE UNIQUE INDEX execute_one_active_team_per_user
  ON contest_team_members(user_id)
  WHERE active;

UPDATE contests
   SET registration_status = 'OPEN'
 WHERE slug = 'execute-26-4';
