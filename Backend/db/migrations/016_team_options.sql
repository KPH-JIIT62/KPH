-- 016: contest participation mode (SOLO vs TEAM) and team size configuration (1 to 6 members).
-- Also makes hackerrank_handle optional for contest teams.

ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS participation_type TEXT NOT NULL DEFAULT 'SOLO' CHECK (participation_type IN ('SOLO', 'TEAM')),
  ADD COLUMN IF NOT EXISTS min_team_size INT NOT NULL DEFAULT 1 CHECK (min_team_size BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS max_team_size INT NOT NULL DEFAULT 1 CHECK (max_team_size BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS hackerrank_required BOOLEAN NOT NULL DEFAULT false;

-- Allow team hackerrank_handle to be optional
ALTER TABLE contest_teams ALTER COLUMN hackerrank_handle DROP NOT NULL;
ALTER TABLE contest_teams DROP CONSTRAINT IF EXISTS contest_teams_hackerrank_handle_check;
ALTER TABLE contest_teams ADD CONSTRAINT contest_teams_hackerrank_handle_check
  CHECK (hackerrank_handle IS NULL OR char_length(hackerrank_handle) BETWEEN 1 AND 80);

-- Configure Execute 26.4 as a team contest with team size up to 3
UPDATE contests
   SET participation_type = 'TEAM',
       min_team_size = 1,
       max_team_size = 3
 WHERE slug = 'execute-26-4';

