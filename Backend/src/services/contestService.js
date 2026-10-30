// Contest rules + SQL. Registering is the interesting part: it touches TWO tables
// (the registration, and the HackerRank ID on the user's profile) inside ONE transaction,
// so either both changes happen or neither does.
// The person's Year of Study is read from their PROFILE here on the server; it is not stored on the registration.
const { HttpError } = require("../utils/HttpError");
const { registrationStatus, withdrawalDeadline, withdrawalOpen, WITHDRAWAL_CUTOFF_MINUTES, EXECUTE_WITHDRAWAL_CUTOFF } = require("../utils/contestStatus");
const { isExecuteMandatory } = require("../utils/executeEligibility");
const { getSeatingPlan } = require("../utils/executeSeatingPlan");
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
    participationType: row.participation_type || "SOLO", // "SOLO" | "TEAM"
    minTeamSize: Number(row.min_team_size) || 1,
    maxTeamSize: Number(row.max_team_size) || (row.participation_type === "TEAM" ? 3 : 1),
    teamNameRequired: row.team_name_required !== undefined ? Boolean(row.team_name_required) : true,
    hackerrankRequired: Boolean(row.hackerrank_required),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    registrationStartsAt: row.registration_starts_at,
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
         LEFT JOIN contest_teams t ON t.contest_id = c.id AND t.status = 'ACTIVE'
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
    const contestRow = rows[0];
    const isTeam = contestRow.participation_type === "TEAM" || slug === EXECUTE;
    let registration = null;
    if (isTeam) {
      const reg = await pool.query(`SELECT t.*, tm.role FROM contest_team_members tm JOIN contest_teams t ON t.id=tm.team_id WHERE t.contest_id=$1 AND tm.user_id=$2 AND tm.active AND t.status='ACTIVE'`, [contestRow.id, userId]);
      if (reg.rows[0]) {
        const team = reg.rows[0];
        registration = { ...toTeamRegistration(team), role: team.role, members: await teamMembers(team.id) };
        if (slug === EXECUTE) {
          const leader = (await pool.query("SELECT enrollment_no FROM users WHERE id=$1", [team.leader_user_id])).rows[0];
          registration.seatingPlan = getSeatingPlan(leader?.enrollment_no, team.team_name);
        }
      }
    } else {
      const reg = await pool.query("SELECT * FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [contestRow.id, userId]);
      registration = reg.rows[0] ? toPublicRegistration(reg.rows[0]) : null;
    }

    // Query published leaderboard if exists
    let leaderboard = null;
    try {
      const lbRes = await pool.query("SELECT data, total_participants, updated_at FROM contest_leaderboards WHERE contest_id = $1", [contestRow.id]);
      if (lbRes.rows[0]) {
        leaderboard = {
          contestSlug: slug,
          totalParticipants: lbRes.rows[0].total_participants,
          updatedAt: lbRes.rows[0].updated_at,
          ...lbRes.rows[0].data,
        };
      }
    } catch {
      // In case migration not applied yet
      leaderboard = null;
    }

    return {
      contest: {
        ...toPublicContest(contestRow, now()),
        ...(slug === EXECUTE ? await mandatoryFor(userId) : {}),
      },
      registration,
      leaderboard,
    };
  }

  async function getLeaderboard(slug) {
    const { rows: contestRows } = await pool.query("SELECT id, title, slug FROM contests WHERE slug = $1", [slug]);
    if (!contestRows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    try {
      const { rows } = await pool.query("SELECT data, total_participants, updated_at FROM contest_leaderboards WHERE contest_id = $1", [contestRows[0].id]);
      if (!rows[0]) return { exists: false, leaderboard: null };
      return {
        exists: true,
        leaderboard: {
          contestSlug: slug,
          totalParticipants: rows[0].total_participants,
          updatedAt: rows[0].updated_at,
          ...rows[0].data,
        },
      };
    } catch {
      return { exists: false, leaderboard: null };
    }
  }

  async function mandatoryFor(userId) {
    const row = (await pool.query("SELECT enrollment_no, campus, year_of_study, branch FROM users WHERE id=$1", [userId])).rows[0];
    return { mandatory: isExecuteMandatory(row, now()) };
  }
  const toTeamRegistration = (row) => ({ id: row.team_id ?? row.id, teamName: row.team_name, hackerrankHandle: row.team_hackerrank_handle ?? row.hackerrank_handle, createdAt: row.team_created_at ?? row.created_at, status: row.team_status ?? row.status });
  async function teamMembers(teamId) {
    const { rows } = await pool.query(`SELECT u.display_name, u.enrollment_no, u.branch, u.batch, u.hackerrank_handle, tm.role FROM contest_team_members tm JOIN users u ON u.id=tm.user_id WHERE tm.team_id=$1 AND tm.active ORDER BY CASE tm.role WHEN 'LEADER' THEN 0 ELSE 1 END, tm.created_at`, [teamId]);
    return rows.map((u) => ({ name: u.display_name, enrollmentNo: u.enrollment_no, branch: u.branch, batch: u.batch, hackerrankHandle: u.hackerrank_handle, role: u.role }));
  }

  async function searchMember(userId, slug, enrollmentNo) {
    const text = typeof enrollmentNo === "string" ? enrollmentNo.trim() : "";
    if (!/^\d{10,12}$/.test(text)) throw new HttpError(400, "INVALID_ENROLLMENT", "Enter a valid enrollment number.");
    const c = (await pool.query("SELECT id, registration_status, registration_closes_at FROM contests WHERE slug=$1", [slug])).rows[0];
    if (!c || registrationStatus(c, now()) !== "OPEN") throw new HttpError(409, "REGISTRATION_CLOSED", "Registration is not open for this contest.");
    const { rows } = await pool.query("SELECT id, display_name, enrollment_no, branch, batch, hackerrank_handle FROM users WHERE enrollment_no=$1 AND profile_completed_at IS NOT NULL AND id<>$2", [text, userId]);
    if (!rows[0]) return { found: false };
    const leader = (await pool.query("SELECT enrollment_no FROM users WHERE id=$1", [userId])).rows[0];
    const leaderYear = userService.academicOf(leader).yearOfStudy;
    const memberYear = userService.academicOf(rows[0]).yearOfStudy;
    if (!leaderYear || !memberYear) throw new HttpError(409, "YEAR_OF_STUDY_UNAVAILABLE", "A team member’s Year of Study could not be verified from their KPH profile.");
    if (leaderYear !== memberYear) throw new HttpError(409, "INTER_YEAR_TEAM", "All team members must be in the same Year of Study. Inter-year teams are not allowed.");
    return { found: true, member: { id: rows[0].id, name: rows[0].display_name, enrollmentNo: rows[0].enrollment_no, branch: rows[0].branch, batch: rows[0].batch } };
  }

  async function registerTeam(userId, slug, { teamName, hackerrankHandle, memberIds = [] }) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const contest = (await client.query("SELECT * FROM contests WHERE slug=$1 FOR UPDATE", [slug])).rows[0];
      if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      if (registrationStatus(contest, now()) !== "OPEN") throw new HttpError(409, "REGISTRATION_CLOSED", "Registration for this contest is closed.");

      const maxMembers = contest.max_team_size || 6;
      const minMembers = contest.min_team_size || 1;
      const totalMembers = 1 + memberIds.length;
      if (totalMembers > maxMembers) {
        throw new HttpError(400, "TOO_MANY_MEMBERS", `This contest allows a maximum of ${maxMembers} member(s) per team.`);
      }
      if (totalMembers < minMembers) {
        throw new HttpError(400, "NOT_ENOUGH_MEMBERS", `This contest requires a minimum of ${minMembers} member(s) per team.`);
      }

      if ((slug === EXECUTE || contest.hackerrank_required) && !hackerrankHandle) {
        throw new HttpError(400, "VALIDATION_ERROR", "Team HackerRank ID is required for this contest.", {
          hackerrankHandle: "Team HackerRank ID is required.",
        });
      }
      if (hackerrankHandle && !/^[A-Za-z0-9_.-]{1,40}$/.test(hackerrankHandle)) {
        throw new HttpError(400, "VALIDATION_ERROR", "Please enter a valid HackerRank ID (up to 40 letters, numbers, dots, underscores, or hyphens).", {
          hackerrankHandle: "HackerRank username should be letters, digits, _ . or - (up to 40 characters).",
        });
      }

      const me = (await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [userId])).rows[0];
      userService.assertProfileReadyToRegister(me);
      const required = [me.display_name, me.branch, me.batch, me.enrollment_no, userService.academicOf(me).yearOfStudy];
      if (required.some((v) => !v)) throw new HttpError(409, "PROFILE_INCOMPLETE", "Complete your name, enrollment number, branch, batch, and Year of Study in your profile before registering.");

      const isTeamNameRequired = contest.team_name_required !== undefined ? Boolean(contest.team_name_required) : true;
      let finalTeamName = typeof teamName === "string" ? teamName.trim() : "";
      if (isTeamNameRequired && !finalTeamName) {
        throw new HttpError(400, "VALIDATION_ERROR", "Team name is required for this contest.", {
          teamName: "Team name is required.",
        });
      }
      if (!finalTeamName) {
        const meName = me?.display_name || "Leader";
        finalTeamName = `${meName}'s Team`.slice(0, 80);
      }

      const ids = [userId, ...memberIds];
      if (new Set(ids).size !== ids.length) throw new HttpError(400, "DUPLICATE_MEMBER", "A person can only appear once on the team.");

      if (memberIds.length > 0) {
        const { rows: users } = await client.query("SELECT id, profile_completed_at FROM users WHERE id = ANY($1::uuid[]) FOR UPDATE", [ids]);
        if (users.length !== ids.length || users.some((u) => !u.profile_completed_at)) {
          throw new HttpError(400, "MEMBER_NOT_FOUND", "Every team member must have a completed KPH account.");
        }
      }

      const active = await client.query(
        "SELECT 1 FROM contest_team_members tm JOIN contest_teams t ON t.id=tm.team_id WHERE tm.user_id=ANY($1::uuid[]) AND tm.active AND t.contest_id=$2 AND t.status='ACTIVE'",
        [ids, contest.id]
      );
      if (active.rowCount) throw new HttpError(409, "MEMBER_ALREADY_REGISTERED", "One or more selected members are already registered for this contest.");

      const team = (await client.query(
        "INSERT INTO contest_teams(contest_id,team_name,hackerrank_handle,leader_user_id) VALUES($1,$2,$3,$4) RETURNING *",
        [contest.id, finalTeamName, hackerrankHandle || null, userId]
      )).rows[0];

      await client.query("INSERT INTO contest_team_members(team_id,user_id,role) VALUES($1,$2,'LEADER')", [team.id, userId]);
      for (const id of memberIds) {
        await client.query("INSERT INTO contest_team_members(team_id,user_id,role) VALUES($1,$2,'MEMBER')", [team.id, id]);
      }
      const updatedLeader = hackerrankHandle
        ? await userService.setHackerrankHandle(userId, hackerrankHandle, client)
        : null;
      await client.query("COMMIT");
      return {
        ...toTeamRegistration(team),
        members: await teamMembers(team.id),
        role: "LEADER",
        ...(updatedLeader ? { user: await userService.toPublic(updatedLeader) } : {}),
      };
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
      const c = (await client.query("SELECT * FROM contests WHERE slug=$1", [slug])).rows[0];
      if (!c) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
      const t = (await client.query("SELECT t.*, tm.role AS member_role FROM contest_teams t JOIN contest_team_members tm ON tm.team_id=t.id WHERE t.contest_id=$1 AND tm.user_id=$2 AND tm.active AND t.status='ACTIVE' FOR UPDATE", [c.id,userId])).rows[0];
      if (!t) throw new HttpError(404, "NOT_REGISTERED", "You are not registered for this contest.");
      if (slug === EXECUTE) {
        if (now() >= EXECUTE_WITHDRAWAL_CUTOFF) throw new HttpError(409, "WITHDRAWAL_CLOSED", "The Execute 26.4 withdrawal deadline was 31 October 2026 at 13:45 IST.");
      } else {
        if (!withdrawalOpen(c, now())) {
          throw new HttpError(409, "WITHDRAWAL_CLOSED", `Registrations can be withdrawn until ${WITHDRAWAL_CUTOFF_MINUTES} minutes before the contest starts, and that time has passed.`);
        }
      }
      await client.query("UPDATE contest_teams SET status='WITHDRAWN', withdrawn_at=now() WHERE id=$1", [t.id]);
      await client.query("UPDATE contest_team_members SET active=FALSE WHERE team_id=$1", [t.id]);
      await client.query("COMMIT");
    } catch (e) { await client.query("ROLLBACK"); throw e; }
    finally { client.release(); }
  }

  async function register(userId, slug, { hackerrankHandle, claimedYearOfStudy }) {
    const contest = (await pool.query("SELECT * FROM contests WHERE slug = $1", [slug])).rows[0];
    if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    if (contest.participation_type === "TEAM" || slug === EXECUTE) {
      throw new HttpError(400, "TEAM_REGISTRATION_REQUIRED", "Use the team registration form for this contest.");
    }
    const client = await pool.connect(); // one dedicated connection: a transaction must stay on a single connection
    try {
      await client.query("BEGIN");
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
    const contest = (await pool.query("SELECT * FROM contests WHERE slug = $1", [slug])).rows[0];
    if (!contest) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    if (contest.participation_type === "TEAM" || slug === EXECUTE) return withdrawTeam(userId, slug);
    const mine = (await pool.query("SELECT id FROM contest_registrations WHERE contest_id = $1 AND user_id = $2", [contest.id, userId])).rows[0];
    if (!mine) throw new HttpError(404, "NOT_REGISTERED", "You are not registered for this contest.");
    if (!withdrawalOpen(contest, now())) {
      throw new HttpError(409, "WITHDRAWAL_CLOSED", `Registrations can be withdrawn until ${WITHDRAWAL_CUTOFF_MINUTES} minutes before the contest starts, and that time has passed.`);
    }
    await pool.query("DELETE FROM contest_registrations WHERE id = $1", [mine.id]);
  }

  return { listForUser, getForUser, getLeaderboard, register, withdraw, searchMember, registerTeam };
}

module.exports = { createContestService };
