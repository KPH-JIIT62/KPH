-- 026: User Feedbacks Table
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email      TEXT NOT NULL,
  user_name       TEXT,
  enrollment_no   TEXT,
  feedback_type   TEXT NOT NULL,
  rating          INT NOT NULL DEFAULT 5,
  message         TEXT NOT NULL,
  email_sent      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_feedbacks_user_id_idx ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS user_feedbacks_created_at_idx ON user_feedbacks(created_at DESC);

