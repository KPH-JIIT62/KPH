-- Keep the current study year on the user profile so normal profile reads do not
-- have to derive it from the enrollment number.
ALTER TABLE users ADD COLUMN year_of_study INTEGER
  CHECK (year_of_study BETWEEN 1 AND 4);
ALTER TABLE users ADD COLUMN year_of_study_academic_year INTEGER;

WITH academic_clock AS (
  SELECT
    CASE
      WHEN (timezone('Asia/Kolkata', now()))::DATE < make_date(EXTRACT(YEAR FROM timezone('Asia/Kolkata', now()))::INTEGER, 7, 20)
        THEN EXTRACT(YEAR FROM timezone('Asia/Kolkata', now()))::INTEGER - 1
      ELSE EXTRACT(YEAR FROM timezone('Asia/Kolkata', now()))::INTEGER
    END AS current_academic_year
), parsed AS (
  SELECT id,
         CASE
           WHEN enrollment_no ~ '^99[0-9]{10}$' THEN 2000 + substring(enrollment_no FROM 3 FOR 2)::INTEGER
           WHEN enrollment_no ~ '^[0-9]{10}$' THEN 2000 + substring(enrollment_no FROM 1 FOR 2)::INTEGER
           ELSE NULL
         END AS admission_year
    FROM users
)
UPDATE users u
   SET year_of_study = CASE
         WHEN academic_clock.current_academic_year - parsed.admission_year + 1 BETWEEN 1 AND 4
           THEN academic_clock.current_academic_year - parsed.admission_year + 1
         ELSE NULL
       END,
       year_of_study_academic_year = academic_clock.current_academic_year
  FROM parsed CROSS JOIN academic_clock
 WHERE u.id = parsed.id
   AND parsed.admission_year IS NOT NULL;

-- The database team-membership guard reads the persisted profile value too.
CREATE OR REPLACE FUNCTION enforce_execute_team_same_year()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  leader_id UUID;
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

  SELECT year_of_study INTO leader_year FROM users WHERE id = leader_id;
  SELECT year_of_study INTO member_year FROM users WHERE id = NEW.user_id;
  IF leader_year IS NULL OR member_year IS NULL OR leader_year <> member_year THEN
    RAISE EXCEPTION USING ERRCODE = '23514', CONSTRAINT = 'execute_team_same_year',
      MESSAGE = 'Execute team members must have the same Year of Study as the leader';
  END IF;

  RETURN NEW;
END;
$$;
