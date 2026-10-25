-- 020: Fix Encode 26.2 dates & allow contest deletion even if registrations exist

UPDATE contests
   SET starts_at = '2026-10-24 14:00:00+05:30',
       ends_at = '2026-10-24 16:00:00+05:30',
       registration_status = 'CLOSED',
       updated_at = now()
 WHERE slug = 'encode-26-2';

-- Ensure foreign keys allow cascading deletion when contest is deleted
ALTER TABLE contest_registrations DROP CONSTRAINT IF EXISTS contest_registrations_contest_id_fkey;
ALTER TABLE contest_registrations ADD CONSTRAINT contest_registrations_contest_id_fkey
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE;

ALTER TABLE contest_teams DROP CONSTRAINT IF EXISTS contest_teams_contest_id_fkey;
ALTER TABLE contest_teams ADD CONSTRAINT contest_teams_contest_id_fkey
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE;

ALTER TABLE contest_team_members DROP CONSTRAINT IF EXISTS contest_team_members_team_id_fkey;
ALTER TABLE contest_team_members ADD CONSTRAINT contest_team_members_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES contest_teams(id) ON DELETE CASCADE;

