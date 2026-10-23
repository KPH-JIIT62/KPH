-- Questions for sessions are stored with the authenticated KPH user who submitted them.
CREATE TABLE session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX session_questions_session_created_idx ON session_questions(session_id, created_at);
CREATE INDEX session_questions_user_idx ON session_questions(user_id);
