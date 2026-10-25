-- 021_contest_leaderboard.sql
-- Store official contest leaderboard data for ended contests.
-- Cascades on delete if the parent contest is deleted.

CREATE TABLE IF NOT EXISTS contest_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL UNIQUE REFERENCES contests(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  total_participants INTEGER NOT NULL DEFAULT 0,
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contest_leaderboards_contest_id ON contest_leaderboards(contest_id);
