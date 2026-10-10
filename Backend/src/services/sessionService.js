// Session rules + SQL. Sessions (talks, workshops...) work like contests without any extra form field: a student
// registers, and who they are (enrollment number, name, batch, branch, Year of Study) is read from their saved PROFILE,
// never from the request. Nothing about the person is stored on the registration, so it cannot go stale.
const { HttpError } = require("../utils/HttpError");
const { registrationStatus } = require("../utils/contestStatus");

// A session with no explicit deadline stops taking registrations when it ends. (Contests keep the old behaviour.)
const withDefaultDeadline = (row) => ({ ...row, registration_closes_at: row.registration_closes_at ?? row.ends_at });

// `at` is "now". The status is worked out here, on the server, so the browser can never get it wrong.
const toPublicSession = (row, at) => {
  const status = registrationStatus(withDefaultDeadline(row), at);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    venue: row.venue, // null = not announced
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationClosesAt: row.registration_closes_at, // only an explicit deadline; null = open until the session ends
    registrationStatus: status, // "SOON" | "OPEN" | "CLOSED"
    registrationOpen: status === "OPEN",
  };
};
const toPublicRegistration = (row) => ({ id: row.id, createdAt: row.created_at });

function createSessionService(pool, userService, { now = () => new Date() } = {}) {
  async function listForUser(userId) {
    // LEFT JOIN: every session is returned; the registration columns are NULL when this person has not registered.
    const { rows } = await pool.query(
      `SELECT s.*, r.id AS reg_id, r.created_at AS reg_created_at
         FROM sessions s
         LEFT JOIN session_registrations r ON r.session_id = s.id AND r.user_id = $1
        ORDER BY s.starts_at NULLS LAST, s.created_at`,
      [userId],
    );
    return rows.map((row) => ({
      ...toPublicSession(row, now()),
      registration: row.reg_id ? toPublicRegistration({ id: row.reg_id, created_at: row.reg_created_at }) : null,
    }));
  }

  async function getForUser(slug, userId) {
    const { rows } = await pool.query("SELECT * FROM sessions WHERE slug = $1", [slug]);
    if (!rows[0]) throw new HttpError(404, "SESSION_NOT_FOUND", "Session not found.");
    const reg = await pool.query("SELECT * FROM session_registrations WHERE session_id = $1 AND user_id = $2", [rows[0].id, userId]);
    return { session: toPublicSession(rows[0], now()), registration: reg.rows[0] ? toPublicRegistration(reg.rows[0]) : null };
  }

  async function register(userId, slug, { claimedYearOfStudy }) {
    const client = await pool.connect(); // one dedicated connection: a transaction must stay on a single connection
    try {
      await client.query("BEGIN");
      const session = (await client.query("SELECT * FROM sessions WHERE slug = $1", [slug])).rows[0];
      if (!session) throw new HttpError(404, "SESSION_NOT_FOUND", "Session not found.");
      const status = registrationStatus(withDefaultDeadline(session), now());
      if (status === "SOON") throw new HttpError(409, "REGISTRATION_NOT_OPEN", "Registration for this session has not opened yet.");
      if (status === "CLOSED") throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this session is closed.");

      // The saved profile is the source of truth: it must be complete, with a valid Year of Study (same rule as contests).
      const me = (await client.query("SELECT * FROM users WHERE id = $1", [userId])).rows[0];
      userService.assertProfileReadyToRegister(me, claimedYearOfStudy);

      const { rows } = await client.query(
        "INSERT INTO session_registrations (session_id, user_id) VALUES ($1, $2) RETURNING *",
        [session.id, userId],
      );
      await client.query("COMMIT");
      return { session: toPublicSession(session, now()), registration: toPublicRegistration(rows[0]) };
    } catch (error) {
      await client.query("ROLLBACK"); // undo everything done since BEGIN
      if (error.code === "23505" && error.constraint === "one_registration_per_user_per_session") {
        throw new HttpError(409, "ALREADY_REGISTERED", "You have already registered for this session.");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return { listForUser, getForUser, register };
}

module.exports = { createSessionService };
