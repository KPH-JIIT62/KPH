-- Execute teams must have one academic year. The calculation mirrors KPH's July 20 academic-year rollover in IST.
CREATE OR REPLACE FUNCTION execute_year_of_study(enrollment_no TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  intake_suffix INTEGER;
  current_academic_year INTEGER;
  study_year INTEGER;
  ist_now TIMESTAMP WITHOUT TIME ZONE := timezone('Asia/Kolkata', now());
BEGIN
  IF enrollment_no ~ '^99[0-9]{10}$' THEN
    intake_suffix := substring(enrollment_no FROM 3 FOR 2)::INTEGER;
  ELSIF enrollment_no ~ '^[0-9]{10}$' THEN
    intake_suffix := substring(enrollment_no FROM 1 FOR 2)::INTEGER;
  ELSE
    RETURN NULL;
  END IF;

  current_academic_year := EXTRACT(YEAR FROM ist_now)::INTEGER;
  IF ist_now::DATE < make_date(current_academic_year, 7, 20) THEN
    current_academic_year := current_academic_year - 1;
  END IF;

  study_year := current_academic_year - (2000 + intake_suffix) + 1;
  IF study_year BETWEEN 1 AND 4 THEN
    RETURN study_year;
  END IF;
  RETURN NULL;
END;
$$;

-- Preserve history while deactivating any currently active team whose saved profiles do not establish one common year.
WITH mismatched_teams AS (
  SELECT DISTINCT t.id
    FROM contest_teams t
    JOIN users leader ON leader.id = t.leader_user_id
    JOIN contest_team_members tm ON tm.team_id = t.id AND tm.active
    JOIN users member ON member.id = tm.user_id
   WHERE t.status = 'ACTIVE'
     AND (
       execute_year_of_study(leader.enrollment_no) IS NULL
       OR execute_year_of_study(member.enrollment_no) IS NULL
       OR execute_year_of_study(leader.enrollment_no) <> execute_year_of_study(member.enrollment_no)
     )
)
UPDATE contest_teams t
   SET status = 'WITHDRAWN', withdrawn_at = COALESCE(t.withdrawn_at, now())
 WHERE t.id IN (SELECT id FROM mismatched_teams);

UPDATE contest_team_members
   SET active = FALSE
 WHERE active
   AND team_id IN (SELECT id FROM contest_teams WHERE status = 'WITHDRAWN');

CREATE OR REPLACE FUNCTION enforce_execute_team_same_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  leader_id UUID;
  leader_enrollment TEXT;
  member_enrollment TEXT;
  leader_year INTEGER;
  member_year INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND NOT NEW.active THEN
    RETURN NEW;
  END IF;

  SELECT leader_user_id INTO leader_id FROM contest_teams WHERE id = NEW.team_id;
  IF NEW.role = 'LEADER' AND NEW.user_id <> leader_id THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Execute team leader membership must match the team leader';
  END IF;

  SELECT enrollment_no INTO leader_enrollment FROM users WHERE id = leader_id;
  SELECT enrollment_no INTO member_enrollment FROM users WHERE id = NEW.user_id;
  leader_year := execute_year_of_study(leader_enrollment);
  member_year := execute_year_of_study(member_enrollment);
  IF leader_year IS NULL OR member_year IS NULL OR leader_year <> member_year THEN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'execute_team_same_year',
      MESSAGE = 'Execute team members must have the same Year of Study as the leader';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER execute_team_same_year_check
BEFORE INSERT OR UPDATE OF team_id, user_id, role, active ON contest_team_members
FOR EACH ROW EXECUTE FUNCTION enforce_execute_team_same_year();
