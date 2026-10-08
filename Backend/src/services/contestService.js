// Contest rules + SQL. Registering is the interesting part: it touches TWO tables
// (the registration, and the HackerRank ID on the user's profile) inside ONE transaction,
// so either both changes happen or neither does.
// The person's Year of Study is read from their PROFILE here on the server; it is not stored on the registration.
const { HttpError } = require("../utils/HttpError");
const { yearInputMatches } = require("../utils/academic");
const { SUPPORT_EMAIL } = require("../config/academic");
const { registrationStatus } = require("../utils/contestStatus");

// `at` is "now". The status is worked out here, on the server, so the browser can never get it wrong.
const toPublicContest = (row, at) => {
  const status = registrationStatus(row, at);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationClosesAt: row.registration_closes_at,
    registrationStatus: status, // "SOON" | "OPEN" | "CLOSED"
    registrationOpen: status === "OPEN",
  };
};
const toPublicRegistration = (row) => ({
  id: row.id,
  hackerrankHandle: row.hackerrank_handle,
  createdAt: row.created_at,
});

function createContestService(pool, userService, { now = () => new Date() } = {}) {
  async function listForUser(userId) {
    // LEFT JOIN: every contest is returned; the registration columns are NULL when this person has not registered.
    const { rows } = await pool.query(
      `SELECT c.*, r.id AS reg_id, r.hackerrank_handle, r.created_at AS reg_created_at
         FROM contests c
         LEFT JOIN contest_registrations r ON r.contest_id = c.id AND r.user_id = $1
        ORDER BY c.starts_at NULLS LAST, c.created_at`,
      [userId],
    );
    return rows.map((row) => ({
      ...toPublicContest(row, now()),
      registration: row.reg_id
        ? toPublicRegistration({ id: row.reg_id, hackerrank_handle: row.hackerrank_handle, created_at: row.reg_created_at })
        : null,
    }));
  }

  async function getForUser(slug, userId) {
    const { rows } = await pool.query("SELECT * FROM contests WHERE slug = $1", [slug]);
    if (!rows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    const reg = await pool.query("SELECT * FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [rows[0].id, userId]);
    return { contest: toPublicContest(rows[0], now()), registration: reg.rows[0] ? toPublicRegistration(reg.rows[0]) : null };
  }

  async function register(userId, slug, { hackerrankHandle, claimedYearOfStudy }) {
    const client = await pool.connect(); // one dedicated connection: a transaction must stay on a single connection
    try {
      await client.query("BEGIN");
      const contest = (await client.query("SELECT * FROM contests WHERE slug = $1", [slug])).rows[0];
      if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      const status = registrationStatus(contest, now());
      if (status === "SOON") throw new HttpError(409, "REGISTRATION_NOT_OPEN", "Registration for this contest has not opened yet.");
      if (status === "CLOSED") throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this contest is closed.");

      // The saved profile is the source of truth for who is registering and for their Year of Study.
      const me = (await client.query("SELECT * FROM users WHERE id = $1", [userId])).rows[0];
      if (!me?.profile_completed_at) throw new HttpError(409, "PROFILE_INCOMPLETE", "Please complete your profile before registering.");

      // Year of Study is worked out from the enrollment number and today's date. Without a valid one we do not register.
      const { yearOfStudy, error } = userService.academicOf(me);
      if (!yearOfStudy) {
        throw new HttpError(409, "YEAR_OF_STUDY_UNAVAILABLE", error || `We couldn’t work out your Year of Study. Contact ${SUPPORT_EMAIL}.`);
      }
      // A client has no say in it: if one sends a different Year of Study, refuse instead of quietly ignoring it.
      if (claimedYearOfStudy !== undefined && !yearInputMatches(claimedYearOfStudy, yearOfStudy)) {
        throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", {
          yearOfStudy: "Year of Study comes from your profile and can’t be changed here.",
        });
      }

      const { rows } = await client.query(
        `INSERT INTO contest_registrations (contest_id, user_id, hackerrank_handle)
         VALUES ($1, $2, $3) RETURNING *`,
        [contest.id, userId, hackerrankHandle],
      );
      const user = await userService.setHackerrankHandle(userId, hackerrankHandle, client);
      await client.query("COMMIT");
      return { contest: toPublicContest(contest, now()), registration: toPublicRegistration(rows[0]), user };
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
