// Contest rules + SQL. Registering is the interesting part: it touches TWO tables
// (the registration, and the HackerRank ID on the user's profile) inside ONE transaction,
// so either both changes happen or neither does.
const { HttpError } = require("../utils/HttpError");
<<<<<<< Updated upstream
=======
const { registrationStatus } = require("../utils/contestStatus");
>>>>>>> Stashed changes

const toPublicContest = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description,
  startsAt: row.starts_at,
  registrationOpen: row.registration_open,
});
const toPublicRegistration = (row) => ({
  id: row.id,
  teamName: row.team_name,
  hackerrankHandle: row.hackerrank_handle,
  createdAt: row.created_at,
});

function createContestService(pool, userService) {
  async function listForUser(userId) {
    // LEFT JOIN: every contest is returned; the registration columns are NULL when this person has not registered.
    const { rows } = await pool.query(
      `SELECT c.*, r.id AS reg_id, r.team_name, r.hackerrank_handle, r.created_at AS reg_created_at
         FROM contests c
         LEFT JOIN contest_registrations r ON r.contest_id = c.id AND r.user_id = $1
        ORDER BY c.starts_at NULLS LAST, c.created_at`,
      [userId],
    );
    return rows.map((row) => ({
      ...toPublicContest(row),
      registration: row.reg_id
        ? toPublicRegistration({ id: row.reg_id, team_name: row.team_name, hackerrank_handle: row.hackerrank_handle, created_at: row.reg_created_at })
        : null,
    }));
  }

  async function getForUser(slug, userId) {
    const { rows } = await pool.query("SELECT * FROM contests WHERE slug = $1", [slug]);
    if (!rows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    const reg = await pool.query("SELECT * FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [rows[0].id, userId]);
    return { contest: toPublicContest(rows[0]), registration: reg.rows[0] ? toPublicRegistration(reg.rows[0]) : null };
  }

  async function register(userId, slug, { teamName, hackerrankHandle }) {
    const client = await pool.connect(); // one dedicated connection: a transaction must stay on a single connection
    try {
      await client.query("BEGIN");
      const contest = (await client.query("SELECT * FROM contests WHERE slug = $1", [slug])).rows[0];
      if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      if (!contest.registration_open) throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this contest is closed.");

<<<<<<< Updated upstream
      const me = (await client.query("SELECT profile_completed_at FROM users WHERE id = $1", [userId])).rows[0];
      if (!me?.profile_completed_at) throw new HttpError(409, "PROFILE_INCOMPLETE", "Please complete your profile before registering.");
=======
      // The saved profile is the source of truth for who is registering and for their Year of Study.
      const me = (await client.query("SELECT * FROM users WHERE id = $1", [userId])).rows[0];
      userService.assertProfileReadyToRegister(me, claimedYearOfStudy);
>>>>>>> Stashed changes

      const { rows } = await client.query(
        `INSERT INTO contest_registrations (contest_id, user_id, team_name, hackerrank_handle)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [contest.id, userId, teamName, hackerrankHandle],
      );
      const user = await userService.setHackerrankHandle(userId, hackerrankHandle, client);
      await client.query("COMMIT");
      return { contest: toPublicContest(contest), registration: toPublicRegistration(rows[0]), user };
    } catch (error) {
      await client.query("ROLLBACK"); // undo everything done since BEGIN
      if (error.code === "23505" && error.constraint === "one_registration_per_user_per_contest") {
        throw new HttpError(409, "ALREADY_REGISTERED", "You have already registered for this contest.");
      }
      throw error;
    } finally {
      client.release();
    }
  }

  return { listForUser, getForUser, register };
}

module.exports = { createContestService };
