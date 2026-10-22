// Contest rules + SQL. Registering is the interesting part: it touches TWO tables
// (the registration, and the HackerRank ID on the user's profile) inside ONE transaction,
// so either both changes happen or neither does.
// The person's Year of Study is read from their PROFILE here on the server; it is not stored on the registration.
const { HttpError } = require("../utils/HttpError");
const { registrationStatus, withdrawalDeadline, withdrawalOpen, WITHDRAWAL_CUTOFF_MINUTES, EXECUTE_WITHDRAWAL_CUTOFF } = require("../utils/contestStatus");
const { isExecuteMandatory } = require("../utils/executeEligibility");
const EXECUTE = "execute-26-4";

// `at` is "now". The status is worked out here, on the server, so the browser can never get it wrong.
const toPublicContest = (row, at) => {
  const status = registrationStatus(row, at);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    venue: row.venue, // null = not announced
    prizePool: row.prize_pool, // e.g. "Prize Pool of ₹6K"; null = none
    goodies: row.goodies, // e.g. "Exciting Goodies"; null = none
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationClosesAt: row.registration_closes_at,
    registrationStatus: status, // "SOON" | "OPEN" | "CLOSED"
    registrationOpen: status === "OPEN",
    withdrawalClosesAt: withdrawalDeadline(row), // 15 minutes before it starts; null while there is no start time
    withdrawalOpen: withdrawalOpen(row, at), // can a registered person still withdraw right now?
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
      `SELECT c.*, r.id AS reg_id, r.hackerrank_handle, r.created_at AS reg_created_at,
              t.id AS team_id, t.team_name, t.status AS team_status, t.created_at AS team_created_at,
              t.hackerrank_handle AS team_hackerrank_handle
         FROM contests c
         LEFT JOIN contest_registrations r ON r.contest_id = c.id AND r.user_id = $1
         LEFT JOIN contest_teams t ON c.slug = '${EXECUTE}' AND t.contest_id = c.id AND t.status = 'ACTIVE'
           AND EXISTS (SELECT 1 FROM contest_team_members tm WHERE tm.team_id = t.id AND tm.user_id = $1 AND tm.active)
        ORDER BY c.starts_at NULLS LAST, c.created_at`,
      [userId],
    );
    return Promise.all(rows.map(async (row) => ({
      ...toPublicContest(row, now()),
      ...(row.slug === EXECUTE ? await mandatoryFor(userId) : { mandatory: false }),
      registration: row.team_id ? toTeamRegistration(row) : row.reg_id
        ? toPublicRegistration({ id: row.reg_id, hackerrank_handle: row.hackerrank_handle, created_at: row.reg_created_at })
        : null,
    })));
  }

  async function getForUser(slug, userId) {
    const { rows } = await pool.query("SELECT * FROM contests WHERE slug = $1", [slug]);
    if (!rows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    if (slug === EXECUTE) {
      const reg = await pool.query(`SELECT t.*, tm.role FROM contest_team_members tm JOIN contest_teams t ON t.id=tm.team_id WHERE t.contest_id=$1 AND tm.user_id=$2 AND tm.active AND t.status='ACTIVE'`, [rows[0].id, userId]);
      const registration = reg.rows[0] ? { ...toTeamRegistration(reg.rows[0]), role: reg.rows[0].role, members: await teamMembers(reg.rows[0].id) } : null;
      return { contest: { ...toPublicContest(rows[0], now()), ...(await mandatoryFor(userId)) }, registration };
    }
    const reg = await pool.query("SELECT * FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [rows[0].id, userId]);
    return { contest: toPublicContest(rows[0], now()), registration: reg.rows[0] ? toPublicRegistration(reg.rows[0]) : null };
  }

  async function mandatoryFor(userId) {
    const row = (await pool.query("SELECT enrollment_no, branch FROM users WHERE id=$1", [userId])).rows[0];
    return { mandatory: isExecuteMandatory(row, now()) };
  }
  const toTeamRegistration = (row) => ({ id: row.team_id ?? row.id, teamName: row.team_name, hackerrankHandle: row.team_hackerrank_handle ?? row.hackerrank_handle, createdAt: row.team_created_at ?? row.created_at, status: row.team_status ?? row.status });
  async function teamMembers(teamId) {
    const { rows } = await pool.query(`SELECT u.display_name, u.enrollment_no, u.branch, u.batch, tm.role FROM contest_team_members tm JOIN users u ON u.id=tm.user_id WHERE tm.team_id=$1 AND tm.active ORDER BY CASE tm.role WHEN 'LEADER' THEN 0 ELSE 1 END, tm.created_at`, [teamId]);
    return rows.map((u) => ({ name: u.display_name, enrollmentNo: u.enrollment_no, branch: u.branch, batch: u.batch, role: u.role }));
  }

  async function searchMember(userId, enrollmentNo) {
    const text = typeof enrollmentNo === "string" ? enrollmentNo.trim() : "";
    if (!/^\d{10,12}$/.test(text)) throw new HttpError(400, "INVALID_ENROLLMENT", "Enter a valid enrollment number.");
    const c = (await pool.query("SELECT id, registration_status, registration_closes_at FROM contests WHERE slug=$1", [EXECUTE])).rows[0];
    if (!c || registrationStatus(c, now()) !== "OPEN") throw new HttpError(409, "REGISTRATION_CLOSED", "Execute 26.4 registration is not open.");
    const { rows } = await pool.query("SELECT id, display_name, enrollment_no, branch, batch FROM users WHERE enrollment_no=$1 AND profile_completed_at IS NOT NULL AND id<>$2", [text, userId]);
    if (!rows[0]) return { found: false };
    return { found: true, member: { id: rows[0].id, name: rows[0].display_name, enrollmentNo: rows[0].enrollment_no, branch: rows[0].branch, batch: rows[0].batch } };
  }

  async function registerTeam(userId, slug, { teamName, hackerrankHandle, memberIds }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contest = (await client.query("SELECT * FROM contests WHERE slug=$1 FOR UPDATE", [slug])).rows[0];
      if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      if (registrationStatus(contest, now()) !== "OPEN") throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this contest is closed.");
      const me = (await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId])).rows[0];
      userService.assertProfileReadyToRegister(me);
      const required = [me.display_name, me.branch, me.batch, me.enrollment_no, userService.academicOf(me).yearOfStudy];
      if (required.some((v) => !v)) throw new HttpError(409, "PROFILE_INCOMPLETE", "Complete your name, enrollment number, branch, batch, and Year of Study in your profile before registering.");
      const ids = [userId, ...memberIds];
      if (new Set(ids).size !== ids.length) throw new HttpError(400, "DUPLICATE_MEMBER", "A person can only appear once on the team.");
      const { rows: users } = await client.query("SELECT id, profile_completed_at FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE", [ids]);
      if (users.length !== ids.length || users.some((u) => !u.profile_completed_at)) throw new HttpError(400, "MEMBER_NOT_FOUND", "Every team member must have a completed KPH account.");
      const active = await client.query("SELECT 1 FROM contest_team_members tm JOIN contest_teams t ON t.id=tm.team_id WHERE tm.user_id=ANY($1::uuid[]) AND tm.active AND t.contest_id=$2 AND t.status='ACTIVE'", [ids, contest.id]);
      if (active.rowCount) throw new HttpError(409, "MEMBER_ALREADY_REGISTERED", "One or more selected members are already registered for Execute 26.4.");
      const team = (await client.query("INSERT INTO contest_teams(contest_id,team_name,hackerrank_handle,leader_user_id) VALUES($1,$2,$3,$4) RETURNING *", [contest.id, teamName, hackerrankHandle, userId])).rows[0];
      await client.query("INSERT INTO contest_team_members(team_id,user_id,role) VALUES($1,$2,'LEADER')", [team.id,userId]);
      for (const id of memberIds) await client.query("INSERT INTO contest_team_members(team_id,user_id,role) VALUES($1,$2,'MEMBER')", [team.id,id]);
      await client.query("COMMIT");
      return { ...toTeamRegistration(team), members: await teamMembers(team.id), role: "LEADER" };
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") throw new HttpError(409, "TEAM_CONFLICT", "A team member or this team identity is already registered. Refresh and try again.");
      throw error;
    } finally { client.release(); }
  }

  async function withdrawTeam(userId, slug) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const c = (await client.query("SELECT id FROM contests WHERE slug=$1", [slug])).rows[0];
      if (!c) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      const t = (await client.query("SELECT t.* FROM contest_teams t JOIN contest_team_members tm ON tm.team_id=t.id WHERE t.contest_id=$1 AND tm.user_id=$2 AND tm.active AND t.status='ACTIVE' FOR UPDATE", [c.id,userId])).rows[0];
      if (!t) throw new HttpError(404, "NOT_REGISTERED", "You are not registered for this contest.");
      if (now() >= EXECUTE_WITHDRAWAL_CUTOFF) throw new HttpError(409, "WITHDRAWAL_CLOSED", "The Execute 26.4 withdrawal deadline was 31 October 2026 at 13:45 IST.");
      await client.query("UPDATE contest_teams SET status='WITHDRAWN', withdrawn_at=now() WHERE id=$1", [t.id]);
      await client.query("UPDATE contest_team_members SET active=FALSE WHERE team_id=$1", [t.id]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  }

  async function register(userId, slug, { hackerrankHandle, claimedYearOfStudy }) {
    if (slug === EXECUTE) throw new HttpError(400, "TEAM_REGISTRATION_REQUIRED", "Use the Execute 26.4 team registration form.");
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
      userService.assertProfileReadyToRegister(me, claimedYearOfStudy);

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

  // Takes the signed-in person OUT of a contest. The registration row is deleted, so they can register again later
  // (while registration is still open). Their HackerRank ID stays on their profile.
  async function withdraw(userId, slug) {
    if (slug === EXECUTE) return withdrawTeam(userId, slug);
    const contest = (await pool.query("SELECT * FROM contests WHERE slug = $1", [slug])).rows[0];
    if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    const mine = (await pool.query("SELECT id FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [contest.id, userId])).rows[0];
    if (!mine) throw new HttpError(404, "NOT_REGISTERED", "You are not registered for this contest.");
    if (!withdrawalOpen(contest, now())) {
      throw new HttpError(409, "WITHDRAWAL_CLOSED", `Registrations can be withdrawn until ${WITHDRAWAL_CUTOFF_MINUTES} minutes before the contest starts, and that time has passed.`);
    }
    await pool.query("DELETE FROM contest_registrations WHERE id = $1", [mine.id]);
  }

  return { listForUser, getForUser, register, withdraw, searchMember, registerTeam };
}

module.exports = { createContestService };
