-- 019: add team_name_required column to contests table
ALTER TABLE contests
  ADD COLUMN IF NOT EXISTS team_name_required BOOLEAN NOT NULL DEFAULT true;

