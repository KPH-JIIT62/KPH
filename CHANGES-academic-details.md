# Academic details + ENCODE 26.2 registration changes

## What to run after unzipping onto the project root
```bash
cd Backend
npm run migrate          # applies 006_registration_no_team_name.sql (the only DB change)
npm test                 # needs TEST_DATABASE_URL pointing at a database whose name contains "test"
cd .. && npx tsc --noEmit && npm run build
```
No new dependencies, no new environment variables. Restart the backend after migrating.

## Database
Only `006_registration_no_team_name.sql`: drops the `team_name` NOT NULL, its length CHECK and its index on
`contest_registrations`. **No data is deleted** - existing registrations keep their team name. No `users` columns are
added or changed and no user rows are touched. Year of Study is deliberately NOT stored (it would go stale every July 20).
To remove the old column for good later: `ALTER TABLE contest_registrations DROP COLUMN team_name;`

## Where the rules live
- `Backend/src/config/academic.js` - ALL campus / batch / branch / July-20 data. Edit this to add campuses, batches, branches.
- `Backend/src/utils/academic.js` - the logic that reads it (pure functions, clock passed in).
- The frontend has no copy of the rules: `GET /api/users/me` returns `profile.academic`, including this student's valid batch letters.

## API
- `GET /api/users/me`, `PUT /api/users/me/profile`: responses now include `profile.academic`
  `{ campus, campusLabel, admissionYear, yearOfStudy, yearOfStudyLabel, batchBranches, error }`.
- `PUT /api/users/me/profile`: `branch` / `yearOfStudy` in the body are ignored; branch is derived from enrollment + batch.
  400 `fields.batch` for unknown / other-campus / not-yet-available batches; 400 `fields.enrollmentNo` when it can't be read.
- `POST /api/contests/:slug/registrations`: body is `{ hackerrankHandle }`. `teamName` ignored. A `yearOfStudy` that differs
  from the profile -> 400; no valid Year of Study -> 409 `YEAR_OF_STUDY_UNAVAILABLE`. Response no longer has `registration.teamName`.
