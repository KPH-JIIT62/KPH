-- Store the recognized campus on each account. The enrollment number is still
-- validated at profile save time, but normal profile reads use this column.
ALTER TABLE users ADD COLUMN campus TEXT
  CHECK (campus IS NULL OR campus IN ('Campus 62', 'Campus 128'));

UPDATE users
   SET campus = CASE
         WHEN enrollment_no ~ '^99[0-9]{10}$' THEN 'Campus 128'
         WHEN enrollment_no ~ '^[0-9]{10}$' THEN 'Campus 62'
         ELSE NULL
       END;
