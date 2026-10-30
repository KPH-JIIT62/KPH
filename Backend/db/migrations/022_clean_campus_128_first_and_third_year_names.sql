-- In the 2026-27 academic year, Campus 128 first-year students were admitted
-- in 2026 and third-year students in 2024. Their Google names include a
-- separator J immediately before the enrollment number ("NAME J9926…").
-- Repair only affected saved names in those two cohorts; other campuses,
-- Campus 128 second-years, and names without the trailing J are untouched.
UPDATE users
   SET display_name = regexp_replace(rtrim(display_name), '\s+J$', '', 'i'),
       updated_at = now()
 WHERE enrollment_no ~ '^99(26|24)[0-9]{8}$'
   AND display_name ~* '\s+J\s*$';
