-- 004: coding handles are no longer needed to finish onboarding.
-- A profile is complete with enrollment number + batch + branch; handles can be added later on the profile page.
ALTER TABLE users DROP CONSTRAINT completed_profile_has_required_fields;
ALTER TABLE users ADD CONSTRAINT completed_profile_has_required_fields CHECK (
  profile_completed_at IS NULL
  OR (enrollment_no IS NOT NULL AND batch IS NOT NULL AND branch IS NOT NULL)
);
