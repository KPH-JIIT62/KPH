-- 018: Add registration_starts_at to contests, and normalize coding Ninja's schedule to match Execute format
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS registration_starts_at TIMESTAMPTZ;

-- Normalize coding Ninja's venue and schedule to match Execute 26.4 clean layout
UPDATE contests
   SET venue = 'CL1, CL2',
       starts_at = '2026-10-30 14:00:00+05:30',
       ends_at = '2026-10-30 16:00:00+05:30',
       registration_starts_at = '2026-10-23 00:58:00+05:30',
       registration_closes_at = '2026-10-30 13:45:00+05:30'
 WHERE slug = 'coding-ninja-s';

