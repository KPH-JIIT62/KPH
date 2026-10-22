-- Execute 26.4 registration cutoff and announced venue. Keep the configured contest schedule unchanged.
UPDATE contests
   SET registration_closes_at = '2026-10-31 14:15:00+05:30',
       venue = 'CL1, CL2, CL3, CL4 (ABB3 LABS)'
 WHERE slug = 'execute-26-4';
