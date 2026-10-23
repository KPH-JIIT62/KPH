-- Fix open contests where registration_closes_at was mistakenly set to past or start time
UPDATE contests
   SET registration_closes_at = NULL
 WHERE registration_status = 'OPEN'
   AND registration_closes_at IS NOT NULL
   AND registration_closes_at <= now();

