-- 007: contest schedule + registration status.
--
-- registration_status replaces the old on/off flag registration_open:
--   SOON   = "Registrations opening soon": shown on the site, nobody can register yet
--   OPEN   = people can register (until registration_closes_at, if one is set)
--   CLOSED = nobody can register
-- When registration_closes_at passes, registration counts as CLOSED automatically; nobody has to flip anything.
-- All times are stored as exact moments (timestamptz); the site shows them in Indian time.

ALTER TABLE contests
  ADD COLUMN ends_at                TIMESTAMPTZ,
  ADD COLUMN registration_closes_at TIMESTAMPTZ,
  ADD COLUMN registration_status    TEXT NOT NULL DEFAULT 'OPEN' CHECK (registration_status IN ('SOON', 'OPEN', 'CLOSED'));

-- keep what is already there: open stays open, closed stays closed
UPDATE contests SET registration_status = CASE WHEN registration_open THEN 'OPEN' ELSE 'CLOSED' END;
ALTER TABLE contests DROP COLUMN registration_open;

ALTER TABLE contests
  ADD CONSTRAINT contest_ends_after_it_starts      CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  ADD CONSTRAINT registration_closes_before_the_end CHECK (registration_closes_at IS NULL OR ends_at IS NULL OR registration_closes_at <= ends_at);

-- Encode 26.2: 24 Oct 2026, 14:00-16:00 IST. Registration closes at 14:15 that day.
UPDATE contests
   SET description            = 'Individual contest. You will need a HackerRank account to register.',
       starts_at              = '2026-10-24 14:00:00+05:30',
       ends_at                = '2026-10-24 16:00:00+05:30',
       registration_closes_at = '2026-10-24 14:15:00+05:30',
       updated_at             = now()
 WHERE slug = 'encode-26-2';

-- Execute 26.4: 31 Oct 2026, 14:00-16:00 IST. Registrations are not open yet.
-- When they open:  UPDATE contests SET registration_status = 'OPEN' WHERE slug = 'execute-26-4';
INSERT INTO contests (slug, title, description, starts_at, ends_at, registration_status)
VALUES ('execute-26-4', 'Execute 26.4', 'Registrations opening soon. Details will be announced here.',
        '2026-10-31 14:00:00+05:30', '2026-10-31 16:00:00+05:30', 'SOON')
ON CONFLICT (slug) DO NOTHING;
