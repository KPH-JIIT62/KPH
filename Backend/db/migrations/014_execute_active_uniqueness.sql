-- Withdrawn Execute teams remain as history, but their names and HackerRank IDs can be reused by active registrations.
DROP INDEX IF EXISTS execute_unique_team_name;
DROP INDEX IF EXISTS execute_unique_hackerrank;

CREATE UNIQUE INDEX execute_unique_team_name
  ON contest_teams(contest_id, lower(team_name))
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX execute_unique_hackerrank
  ON contest_teams(contest_id, lower(hackerrank_handle))
  WHERE status = 'ACTIVE';
