-- 002: add branch + CodeChef handle, and change what "profile complete" means.
-- New rule: enrollment number + branch + at least one coding handle. (Batch is now optional.)
-- NOTE: migrations are never edited once applied; changes go in a NEW numbered file like this one.

ALTER TABLE users
  ADD COLUMN branch          TEXT,
  ADD COLUMN codechef_handle TEXT;

-- Fill in enrollment numbers for people who already signed in: for JIIT accounts the part
-- before the @ is the enrollment number (only when it is all digits).
UPDATE users
   SET enrollment_no = split_part(email, '@', 1)
 WHERE enrollment_no IS NULL
   AND split_part(email, '@', 1) ~ '^[0-9]{5,20}$';

-- Anyone who "completed" the old, shorter form has no branch yet: ask them again.
UPDATE users SET profile_completed_at = NULL WHERE branch IS NULL;

ALTER TABLE users DROP CONSTRAINT completed_profile_has_required_fields;
ALTER TABLE users ADD CONSTRAINT completed_profile_has_required_fields CHECK (
  profile_completed_at IS NULL
  OR (enrollment_no IS NOT NULL AND branch IS NOT NULL
      AND (codeforces_handle IS NOT NULL OR leetcode_handle IS NOT NULL
           OR codechef_handle IS NOT NULL OR hackerrank_handle IS NOT NULL))
);
