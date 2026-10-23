-- 015: admin_access table and initial admin seeding.
-- Admins log in using their normal college Google account.
-- When they sign in, if their email or enrollment number is listed here, their role is set to 'ADMIN'.

CREATE TABLE IF NOT EXISTS admin_access (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier  TEXT        NOT NULL UNIQUE, -- college email (e.g. 2501030287@mail.jiit.ac.in) or enrollment_no
  note        TEXT,                        -- e.g. "Core Team Coordinator", "Lead Admin"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_access_identifier_idx ON admin_access (lower(identifier));

-- Seed initial admin for Jayendra Pratap Singh
INSERT INTO admin_access (identifier, note)
VALUES 
  ('2501030287@mail.jiit.ac.in', 'Lead Admin - Jayendra Pratap Singh')
ON CONFLICT (identifier) DO NOTHING;

-- Grant ADMIN role to existing user in users table if already signed up
UPDATE users
   SET role = 'ADMIN'
WHERE email = '2501030287@mail.jiit.ac.in'
    OR enrollment_no = '2501030287';

