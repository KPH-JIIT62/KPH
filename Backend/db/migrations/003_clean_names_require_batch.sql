-- 003: (a) tidy names saved before we cleaned them, (b) a completed profile now also needs a batch.

-- (a) "SHREYANSH SRIVASTAVA 2501030069" -> "Shreyansh Srivastava". Same rule as src/utils/displayName.js.
UPDATE users u
   SET display_name = CASE
         WHEN s.name = upper(s.name) OR s.name = lower(s.name) THEN initcap(lower(s.name))
         ELSE s.name
       END
  FROM (
    SELECT id,
           btrim(regexp_replace(regexp_replace(display_name, '(^|\s)[0-9]{5,}(\s|$)', ' ', 'g'), '\s+', ' ', 'g')) AS name
      FROM users
  ) s
 WHERE u.id = s.id AND s.name <> '';

-- (b) Batch used to be optional. Anyone who finished without one is asked again.
UPDATE users SET profile_completed_at = NULL WHERE batch IS NULL;

ALTER TABLE users DROP CONSTRAINT completed_profile_has_required_fields;
ALTER TABLE users ADD CONSTRAINT completed_profile_has_required_fields CHECK (
  profile_completed_at IS NULL
  OR (enrollment_no IS NOT NULL AND batch IS NOT NULL AND branch IS NOT NULL
      AND (codeforces_handle IS NOT NULL OR leetcode_handle IS NOT NULL
           OR codechef_handle IS NOT NULL OR hackerrank_handle IS NOT NULL))
);
