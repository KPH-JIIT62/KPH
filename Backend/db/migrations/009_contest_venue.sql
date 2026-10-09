-- 009: contest venue + the full Encode 26.2 description.
--
-- venue is optional free text ("CL1 & CL2"); NULL means "not announced", and the site simply hides the line.

ALTER TABLE contests
  ADD COLUMN venue TEXT;

-- Encode 26.2: held in CL1 & CL2.
UPDATE contests
   SET venue       = 'CL1 & CL2',
       description = 'Encode 26.2 is an individual competitive programming contest by Knuth Programming Hub, designed to challenge your problem-solving skills, strengthen your understanding of Data Structures and Algorithms (DSA), and help you grow as a competitive programmer. Compete for a prize pool of ₹6,000 and put your coding skills to the test!',
       updated_at  = now()
 WHERE slug = 'encode-26-2';
