-- 006: contest registrations no longer have a team name.
--
-- The app no longer reads or writes team_name, but the column was NOT NULL, so new registrations (which do not
-- supply one) would fail. This migration stops requiring it. It deliberately does NOT drop the column or delete
-- any data: registrations already made keep the team name they entered.
--
-- Once you are sure you do not need that history (export it first if you do), you can remove it for good with:
--   ALTER TABLE contest_registrations DROP COLUMN team_name;
--
-- Year of Study is NOT stored anywhere by this change. It is worked out from users.enrollment_no and today's date
-- whenever it is needed, so it can never go stale. No users columns are added or changed, and no user rows are touched.

ALTER TABLE contest_registrations DROP CONSTRAINT team_name_length;
DROP INDEX contest_registrations_team_idx;
ALTER TABLE contest_registrations ALTER COLUMN team_name DROP NOT NULL;
