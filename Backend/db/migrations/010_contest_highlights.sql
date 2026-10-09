-- 010: contest highlights (prize pool + goodies).
--
-- Both are optional short texts shown as their own badges on the contest page and card, instead of being buried
-- in the description. NULL means "none", and the site simply hides that badge.

ALTER TABLE contests
  ADD COLUMN prize_pool TEXT,
  ADD COLUMN goodies    TEXT;

-- Encode 26.2: Prize Pool of 6K + Exciting Goodies. The prize sentence leaves the description (it has its own badge now).
UPDATE contests
   SET prize_pool  = 'Prize Pool of ₹6K',
       goodies     = 'Exciting Goodies',
       description = 'Encode 26.2 is an individual competitive programming contest by Knuth Programming Hub, designed to challenge your problem-solving skills, strengthen your understanding of Data Structures and Algorithms (DSA), and help you grow as a competitive programmer. Put your coding skills to the test!',
       updated_at  = now()
 WHERE slug = 'encode-26-2';
