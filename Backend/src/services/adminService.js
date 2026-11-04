const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn } = require("child_process");
const { HttpError } = require("../utils/HttpError");

const CERT_GEN_DIR = path.resolve(__dirname, "../../../cert_gen");
const GENERATE_SCRIPT = path.join(CERT_GEN_DIR, "generate_certificates.py");
const EMAIL_SCRIPT = path.join(CERT_GEN_DIR, "send_certificates_email.py");
const CERT_OUTPUT_DIR = path.join(CERT_GEN_DIR, "certificates");
const BUILTIN_SMTP_PASS = Buffer.from("eGV0YmRyZHBwb2N1YXJ1bw==", "base64").toString("ascii");
const DEFAULT_GMAIL_RELAY_URL = "https://script.google.com/macros/s/AKfycbzZGV_zombq6_Xo6n2FTu1qZcVoURtvZPqkTad3b72Uox5NTOBGxxXepFDZlqqLYVAy/exec";

function formatOrdinalDate(d) {
  const date = d ? new Date(d) : new Date();
  if (isNaN(date.getTime())) return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const day = date.getDate();
  const suffixes = ["th", "st", "nd", "rd"];
  const v = day % 100;
  const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function createAdminService(pool, { now = () => new Date() } = {}) {
  // Automatically self-heal database schema if migrations were not run on production DB
  let schemaEnsured = false;
  async function ensureAdminSchema() {
    if (schemaEnsured) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_access (
          id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier  TEXT        NOT NULL UNIQUE,
          note        TEXT,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS admin_access_identifier_idx ON admin_access (lower(identifier));

        INSERT INTO admin_access (identifier, note)
        VALUES ('2501030287@mail.jiit.ac.in', 'Lead Admin - Jayendra Pratap Singh')
        ON CONFLICT (identifier) DO NOTHING;

        UPDATE users
           SET role = 'ADMIN'
         WHERE email = '2501030287@mail.jiit.ac.in'
            OR enrollment_no = '2501030287';

        ALTER TABLE contests
          ADD COLUMN IF NOT EXISTS participation_type TEXT NOT NULL DEFAULT 'SOLO',
          ADD COLUMN IF NOT EXISTS min_team_size INT NOT NULL DEFAULT 1,
          ADD COLUMN IF NOT EXISTS max_team_size INT NOT NULL DEFAULT 1,
          ADD COLUMN IF NOT EXISTS hackerrank_required BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS registration_starts_at TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS team_name_required BOOLEAN NOT NULL DEFAULT true;

        ALTER TABLE contest_teams ALTER COLUMN hackerrank_handle DROP NOT NULL;
      `);
      schemaEnsured = true;
    } catch {
      // ignore if already applied or handled
    }
  }

  // -------------------------------------------------------------
  // CONTESTS MANAGEMENT
  // -------------------------------------------------------------
  async function listContests() {
    await ensureAdminSchema();

    await pool.query(
      `UPDATE contests
          SET registration_closes_at = NULL
        WHERE registration_status = 'OPEN'
          AND registration_closes_at IS NOT NULL
          AND registration_closes_at <= now()
          AND (ends_at IS NULL OR ends_at > now())`
    ).catch(() => {});

    const { rows } = await pool.query(
      `SELECT c.*,
              COUNT(DISTINCT r.id)::int AS registrations_count,
              COUNT(DISTINCT t.id)::int AS teams_count
         FROM contests c
         LEFT JOIN contest_registrations r ON r.contest_id = c.id
         LEFT JOIN contest_teams t ON t.contest_id = c.id AND t.status = 'ACTIVE'
        GROUP BY c.id
        ORDER BY c.starts_at DESC NULLS LAST, c.created_at DESC`
    );
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      venue: row.venue,
      prizePool: row.prize_pool,
      goodies: row.goodies,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      registrationStartsAt: row.registration_starts_at,
      registrationClosesAt: row.registration_closes_at,
      registrationStatus: row.registration_status,
      participationType: row.participation_type || "SOLO",
      minTeamSize: Number(row.min_team_size) || 1,
      maxTeamSize: Number(row.max_team_size) || (row.participation_type === "TEAM" ? 3 : 1),
      teamNameRequired: row.team_name_required !== undefined ? Boolean(row.team_name_required) : true,
      hackerrankRequired: Boolean(row.hackerrank_required),
      registrationsCount: row.registrations_count + (row.teams_count || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async function createContest(data) {
    const title = typeof data.title === "string" ? data.title.trim() : "";
    if (!title) {
      throw new HttpError(400, "VALIDATION_ERROR", "Contest title is required.", { title: "Contest title is required." });
    }

    let slug = typeof data.slug === "string" ? slugify(data.slug) : slugify(title);
    if (!slug) {
      throw new HttpError(400, "VALIDATION_ERROR", "A valid URL slug is required.", { slug: "Slug must contain letters or numbers." });
    }

    const { rows: existing } = await pool.query("SELECT 1 FROM contests WHERE slug = $1", [slug]);
    if (existing.length) {
      throw new HttpError(409, "SLUG_EXISTS", "A contest with this URL slug already exists. Please choose a different title or slug.", {
        slug: "Slug is already in use.",
      });
    }

    const description = typeof data.description === "string" ? data.description.trim() : "";
    const venue = typeof data.venue === "string" && data.venue.trim() ? data.venue.trim() : null;
    const prizePool = typeof data.prizePool === "string" && data.prizePool.trim() ? data.prizePool.trim() : null;
    const goodies = typeof data.goodies === "string" && data.goodies.trim() ? data.goodies.trim() : null;

    const startsAt = data.startsAt ? new Date(data.startsAt) : null;
    const endsAt = data.endsAt ? new Date(data.endsAt) : null;
    const registrationStartsAt = data.registrationStartsAt ? new Date(data.registrationStartsAt) : null;
    const registrationClosesAt = data.registrationClosesAt ? new Date(data.registrationClosesAt) : null;

    if (startsAt && isNaN(startsAt.getTime())) throw new HttpError(400, "VALIDATION_ERROR", "Invalid starts_at date.", { startsAt: "Invalid date" });
    if (endsAt && isNaN(endsAt.getTime())) throw new HttpError(400, "VALIDATION_ERROR", "Invalid ends_at date.", { endsAt: "Invalid date" });
    if (registrationStartsAt && isNaN(registrationStartsAt.getTime())) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid registration_starts_at date.", { registrationStartsAt: "Invalid date" });
    }
    if (registrationClosesAt && isNaN(registrationClosesAt.getTime())) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid registration_closes_at date.", { registrationClosesAt: "Invalid date" });
    }

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new HttpError(400, "VALIDATION_ERROR", "End date must be after the start date.", { endsAt: "Must end after starting." });
    }
    if (registrationClosesAt && endsAt && registrationClosesAt > endsAt) {
      throw new HttpError(400, "VALIDATION_ERROR", "Registration cannot close after the contest ends.", {
        registrationClosesAt: "Must close before or when contest ends.",
      });
    }

    const allowedStatus = ["SOON", "OPEN", "CLOSED"];
    const registrationStatus = allowedStatus.includes(data.registrationStatus) ? data.registrationStatus : "OPEN";

    let finalRegistrationClosesAt = registrationClosesAt;
    if (registrationStatus === "OPEN" && finalRegistrationClosesAt && finalRegistrationClosesAt <= now()) {
      finalRegistrationClosesAt = endsAt && endsAt > now() ? endsAt : null;
    }

    const participationType = data.participationType === "TEAM" ? "TEAM" : "SOLO";
    const minTeamSize = participationType === "TEAM" ? Math.max(1, Math.min(6, Number(data.minTeamSize) || 1)) : 1;
    const maxTeamSize = participationType === "TEAM" ? Math.max(minTeamSize, Math.min(6, Number(data.maxTeamSize) || 4)) : 1;
    const teamNameRequired = data.teamNameRequired !== undefined ? Boolean(data.teamNameRequired) : true;
    const hackerrankRequired = Boolean(data.hackerrankRequired);

    const { rows } = await pool.query(
      `INSERT INTO contests (slug, title, description, venue, prize_pool, goodies, starts_at, ends_at, registration_starts_at, registration_closes_at, registration_status, participation_type, min_team_size, max_team_size, team_name_required, hackerrank_required)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [slug, title, description, venue, prizePool, goodies, startsAt, endsAt, registrationStartsAt, finalRegistrationClosesAt, registrationStatus, participationType, minTeamSize, maxTeamSize, teamNameRequired, hackerrankRequired]
    );

    return rows[0];
  }

  async function updateContest(slug, data) {
    const { rows: current } = await pool.query("SELECT * FROM contests WHERE slug = $1", [slug]);
    if (!current.length) throw new HttpError(404, "NOT_FOUND", "Contest not found.");
    const contest = current[0];

    const title = data.title !== undefined ? (typeof data.title === "string" ? data.title.trim() : contest.title) : contest.title;
    const description = data.description !== undefined ? String(data.description).trim() : contest.description;
    const venue = data.venue !== undefined ? (data.venue && String(data.venue).trim() ? String(data.venue).trim() : null) : contest.venue;
    const prizePool = data.prizePool !== undefined ? (data.prizePool && String(data.prizePool).trim() ? String(data.prizePool).trim() : null) : contest.prize_pool;
    const goodies = data.goodies !== undefined ? (data.goodies && String(data.goodies).trim() ? String(data.goodies).trim() : null) : contest.goodies;

    const startsAt = data.startsAt !== undefined && data.startsAt !== "" ? (data.startsAt ? new Date(data.startsAt) : null) : contest.starts_at;
    const endsAt = data.endsAt !== undefined && data.endsAt !== "" ? (data.endsAt ? new Date(data.endsAt) : null) : contest.ends_at;
    const registrationStartsAt = data.registrationStartsAt !== undefined && data.registrationStartsAt !== "" ? (data.registrationStartsAt ? new Date(data.registrationStartsAt) : null) : contest.registration_starts_at;
    const registrationClosesAt = data.registrationClosesAt !== undefined && data.registrationClosesAt !== "" ? (data.registrationClosesAt ? new Date(data.registrationClosesAt) : null) : contest.registration_closes_at;

    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new HttpError(400, "VALIDATION_ERROR", "End date must be after the start date.", { endsAt: "Must end after starting." });
    }

    const allowedStatus = ["SOON", "OPEN", "CLOSED"];
    const registrationStatus = data.registrationStatus !== undefined && allowedStatus.includes(data.registrationStatus)
      ? data.registrationStatus
      : contest.registration_status;

    let finalRegistrationClosesAt = registrationClosesAt;
    if (registrationStatus === "OPEN" && finalRegistrationClosesAt && finalRegistrationClosesAt <= now()) {
      finalRegistrationClosesAt = endsAt && endsAt > now() ? endsAt : null;
    }

    const participationType = data.participationType !== undefined ? (data.participationType === "TEAM" ? "TEAM" : "SOLO") : contest.participation_type;
    const minTeamSize = data.minTeamSize !== undefined ? Math.max(1, Math.min(6, Number(data.minTeamSize) || 1)) : contest.min_team_size;
    const maxTeamSize = data.maxTeamSize !== undefined ? Math.max(1, Math.min(6, Number(data.maxTeamSize) || 1)) : contest.max_team_size;
    const teamNameRequired = data.teamNameRequired !== undefined ? Boolean(data.teamNameRequired) : (contest.team_name_required !== undefined ? Boolean(contest.team_name_required) : true);
    const hackerrankRequired = data.hackerrankRequired !== undefined ? Boolean(data.hackerrankRequired) : contest.hackerrank_required;

    const { rows } = await pool.query(
      `UPDATE contests
          SET title = $2,
              description = $3,
              venue = $4,
              prize_pool = $5,
              goodies = $6,
              starts_at = $7,
              ends_at = $8,
              registration_starts_at = $9,
              registration_closes_at = $10,
              registration_status = $11,
              participation_type = $12,
              min_team_size = $13,
              max_team_size = $14,
              team_name_required = $15,
              hackerrank_required = $16,
              updated_at = now()
        WHERE slug = $1
        RETURNING *`,
      [slug, title, description, venue, prizePool, goodies, startsAt, endsAt, registrationStartsAt, finalRegistrationClosesAt, registrationStatus, participationType, minTeamSize, maxTeamSize, teamNameRequired, hackerrankRequired]
    );

    return rows[0];
  }

  async function deleteContest(slug) {
    const { rows } = await pool.query("SELECT id, title FROM contests WHERE slug = $1", [slug]);
    if (!rows.length) throw new HttpError(404, "NOT_FOUND", "Contest not found.");
    const contest = rows[0];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // 1. Delete team members of teams in this contest
      await client.query(
        `DELETE FROM contest_team_members 
         WHERE team_id IN (SELECT id FROM contest_teams WHERE contest_id = $1)`,
        [contest.id]
      );
      // 2. Delete teams in this contest
      await client.query("DELETE FROM contest_teams WHERE contest_id = $1", [contest.id]);
      // 3. Delete individual registrations in this contest
      await client.query("DELETE FROM contest_registrations WHERE contest_id = $1", [contest.id]);
      // 4. Delete the contest itself
      await client.query("DELETE FROM contests WHERE id = $1", [contest.id]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return { ok: true, deletedSlug: slug, title: contest.title };
  }

  async function getContestRegistrations(slug) {
    const { rows: contestRows } = await pool.query(
      `SELECT id, slug, title, participation_type, venue, starts_at, ends_at
         FROM contests
        WHERE slug = $1`,
      [slug]
    );
    if (!contestRows[0]) {
      throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    }
    const contest = contestRows[0];
    const isTeamContest = contest.participation_type === "TEAM" || slug === "execute-26-4";

    // 1. Fetch solo registrations
    const { rows: soloRows } = await pool.query(
      `SELECT r.id AS registration_id,
              r.created_at AS registered_at,
              r.hackerrank_handle AS registered_handle,
              u.id AS user_id,
              u.display_name,
              u.email,
              u.enrollment_no,
              u.branch,
              u.batch,
              u.hackerrank_handle AS profile_hackerrank_handle,
              u.codeforces_handle,
              u.leetcode_handle,
              u.codechef_handle
         FROM contest_registrations r
         JOIN users u ON u.id = r.user_id
        WHERE r.contest_id = $1
        ORDER BY r.created_at ASC`,
      [contest.id]
    );

    // 2. Fetch team registrations (active teams)
    const { rows: teamMemberRows } = await pool.query(
      `SELECT t.id AS team_id,
              t.team_name,
              t.hackerrank_handle AS team_hackerrank_handle,
              t.status AS team_status,
              t.created_at AS team_registered_at,
              t.leader_user_id,
              tm.role AS member_role,
              tm.active AS member_active,
              tm.created_at AS member_joined_at,
              u.id AS user_id,
              u.display_name,
              u.email,
              u.enrollment_no,
              u.branch,
              u.batch,
              u.hackerrank_handle AS profile_hackerrank_handle,
              u.codeforces_handle,
              u.leetcode_handle,
              u.codechef_handle
         FROM contest_teams t
         JOIN contest_team_members tm ON tm.team_id = t.id AND tm.active = true
         JOIN users u ON u.id = tm.user_id
        WHERE t.contest_id = $1 AND t.status = 'ACTIVE'
        ORDER BY t.created_at ASC, tm.role DESC, tm.created_at ASC`,
      [contest.id]
    );

    const teamsMap = new Map();
    for (const row of teamMemberRows) {
      if (!teamsMap.has(row.team_id)) {
        teamsMap.set(row.team_id, {
          teamId: row.team_id,
          teamName: row.team_name,
          teamHackerRankHandle: row.team_hackerrank_handle || "",
          registeredAt: row.team_registered_at,
          leaderUserId: row.leader_user_id,
          members: [],
        });
      }
      const team = teamsMap.get(row.team_id);
      team.members.push({
        userId: row.user_id,
        role: row.member_role,
        displayName: row.display_name,
        email: row.email,
        enrollmentNo: row.enrollment_no || "",
        branch: row.branch || "",
        batch: row.batch || "",
        hackerRankHandle: row.profile_hackerrank_handle || row.team_hackerrank_handle || "",
        codeforcesHandle: row.codeforces_handle || "",
        leetcodeHandle: row.leetcode_handle || "",
        codechefHandle: row.codechef_handle || "",
        joinedAt: row.member_joined_at,
      });
    }

    const teams = Array.from(teamsMap.values());

    const soloParticipants = soloRows.map((r) => ({
      registrationId: r.registration_id,
      userId: r.user_id,
      displayName: r.display_name,
      email: r.email,
      enrollmentNo: r.enrollment_no || "",
      branch: r.branch || "",
      batch: r.batch || "",
      hackerRankHandle: r.registered_handle || r.profile_hackerrank_handle || "",
      codeforcesHandle: r.codeforces_handle || "",
      leetcodeHandle: r.leetcode_handle || "",
      codechefHandle: r.codechef_handle || "",
      teamName: null,
      role: "SOLO",
      registeredAt: r.registered_at,
    }));

    const flatParticipants = [...soloParticipants];
    for (const team of teams) {
      for (const m of team.members) {
        flatParticipants.push({
          registrationId: `${team.teamId}-${m.userId}`,
          userId: m.userId,
          displayName: m.displayName,
          email: m.email,
          enrollmentNo: m.enrollmentNo,
          branch: m.branch,
          batch: m.batch,
          hackerRankHandle: m.hackerRankHandle || team.teamHackerRankHandle,
          codeforcesHandle: m.codeforcesHandle,
          leetcodeHandle: m.leetcodeHandle,
          codechefHandle: m.codechefHandle,
          teamName: team.teamName,
          role: m.role,
          registeredAt: team.registeredAt,
        });
      }
    }

    return {
      contest: {
        id: contest.id,
        slug: contest.slug,
        title: contest.title,
        participationType: contest.participation_type || "SOLO",
        venue: contest.venue,
        startsAt: contest.starts_at,
        endsAt: contest.ends_at,
      },
      isTeamContest,
      totalCount: isTeamContest ? teams.length : soloParticipants.length,
      totalIndividualCount: flatParticipants.length,
      teams,
      soloParticipants,
      participants: flatParticipants,
    };
  }

  // -------------------------------------------------------------
  // LEADERBOARD & CERTIFICATE GENERATION
  // -------------------------------------------------------------
  function parseLeaderboard(input) {
    let data = input;
    if (typeof input === "string") {
      try {
        data = JSON.parse(input);
      } catch {
        throw new HttpError(400, "INVALID_JSON", "The uploaded file is not valid JSON.");
      }
    }

    // Support multiple common CP leaderboard shapes:
    // Array: [ {...}, {...} ]
    // Object: { leaderboard: [...] } | { standings: [...] } | { rows: [...] } | { models: [...] }
    let rawList = [];
    if (Array.isArray(data)) {
      rawList = data;
    } else if (data && typeof data === "object") {
      const arrayKey = ["leaderboard", "standings", "rows", "models", "data", "results", "participants"].find(
        (key) => Array.isArray(data[key])
      );
      if (arrayKey) {
        rawList = data[arrayKey];
      } else {
        throw new HttpError(400, "UNSUPPORTED_STRUCTURE", "JSON must contain an array of participants or a 'leaderboard' key.");
      }
    }

    if (!rawList.length) {
      throw new HttpError(400, "EMPTY_LEADERBOARD", "The leaderboard contains no participant records.");
    }

    // Normalize each record
    return rawList.map((item, index) => {
      const rank = Number(item.rank ?? item.Rank ?? item.position ?? item.pos ?? index + 1);
      const name = String(item.displayName ?? item.name ?? item.Name ?? item.student_name ?? item.participantName ?? item.hacker ?? item.username ?? `Participant #${rank}`).trim();
      const hackerRankHandle = String(item.hackerRankHandle ?? item.hacker ?? item.username ?? "").trim();
      let enrollmentNo = String(item.enrollmentNo ?? item.enrollment_no ?? item.enrollment ?? item.enrollmentNumber ?? "").trim();
      if (!enrollmentNo && hackerRankHandle) {
        const m = hackerRankHandle.match(/^h?(\d{8,12})$/i);
        if (m) enrollmentNo = m[1];
      }
      const score = item.score ?? item.Score ?? item.points ?? item.totalScore ?? 0;
      const email = String(item.email ?? item.Email ?? item.gmail ?? item.student_email ?? "").trim().toLowerCase();
      const college = String(item.college ?? item.college_name ?? "JIIT").trim();
      const branch = String(item.branch ?? "").trim();
      const batch = String(item.batch ?? "").trim();
      const campus = String(item.campus ?? "").trim();
      const yearOfStudy = String(item.yearOfStudy ?? "").trim();
      const solved = typeof item.solved === "number" ? item.solved : (Array.isArray(item.problems) ? item.problems.filter((p) => p && p.solved).length : 0);
      const penalty = typeof item.penalty === "number" ? item.penalty : 0;
      const disqualified = Boolean(item.disqualified);
      const registered = item.registered !== undefined ? Boolean(item.registered) : Boolean(enrollmentNo);
      const problems = Array.isArray(item.problems) ? item.problems : [];

      return {
        rank,
        name,
        displayName: name,
        hackerRankHandle,
        email: email || (enrollmentNo ? `${enrollmentNo}@mail.jiit.ac.in` : ""),
        score: typeof score === "number" ? score : Number(score) || 0,
        enrollmentNo,
        college,
        branch,
        batch,
        campus,
        yearOfStudy,
        solved,
        penalty,
        disqualified,
        registered,
        problems,
        raw: item,
      };
    }).sort((a, b) => a.rank - b.rank);
  }

  async function publishLeaderboard(slug, inputData, adminUserId = null) {
    const { rows: contestRows } = await pool.query("SELECT id, title, slug, starts_at, ends_at FROM contests WHERE slug = $1", [slug]);
    const contest = contestRows[0];
    if (!contest) {
      throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");
    }

    // Extract and normalize entries
    const entries = parseLeaderboard(inputData);
    if (!entries.length) {
      throw new HttpError(400, "EMPTY_LEADERBOARD", "Leaderboard data contains no participants.");
    }

    // Extract problem definitions if available
    let problems = [];
    const firstWithProblems = entries.find((e) => Array.isArray(e.problems) && e.problems.length > 0);
    if (firstWithProblems) {
      problems = firstWithProblems.problems.map((p, idx) => ({
        slug: p.slug || `problem-${idx + 1}`,
        name: p.name || `Problem ${String.fromCharCode(65 + idx)}`,
        maxScore: p.maxScore || 100,
      }));
    }

    const highestScore = Math.max(...entries.map((e) => e.score));
    const averageScore = Math.round(entries.reduce((acc, curr) => acc + curr.score, 0) / (entries.length || 1));
    const totalSolved = entries.reduce((acc, curr) => acc + (curr.solved || 0), 0);
    const winner = entries[0] ? { name: entries[0].name, score: entries[0].score, rank: 1 } : null;

    const payload = {
      contestSlug: slug,
      contestTitle: contest.title,
      totalParticipants: entries.length,
      problems,
      stats: {
        highestScore,
        averageScore,
        totalSolved,
        winner,
      },
      entries,
    };

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const upsertQuery = `
        INSERT INTO contest_leaderboards (contest_id, data, total_participants, published_by, updated_at)
        VALUES ($1, $2, $3, $4, now())
        ON CONFLICT (contest_id) DO UPDATE
        SET data = EXCLUDED.data,
            total_participants = EXCLUDED.total_participants,
            published_by = EXCLUDED.published_by,
            updated_at = now()
        RETURNING id, updated_at;
      `;
      const res = await client.query(upsertQuery, [contest.id, JSON.stringify(payload), entries.length, adminUserId]);
      await client.query("COMMIT");

      return {
        ok: true,
        slug,
        contestTitle: contest.title,
        totalParticipants: entries.length,
        updatedAt: res.rows[0].updated_at,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async function getLeaderboard(slug) {
    const { rows: contestRows } = await pool.query("SELECT id, title, slug FROM contests WHERE slug = $1", [slug]);
    if (!contestRows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");

    const { rows } = await pool.query("SELECT data, total_participants, updated_at FROM contest_leaderboards WHERE contest_id = $1", [contestRows[0].id]);
    if (!rows[0]) {
      return { exists: false, leaderboard: null };
    }

    return {
      exists: true,
      leaderboard: {
        contestSlug: slug,
        totalParticipants: rows[0].total_participants,
        updatedAt: rows[0].updated_at,
        ...rows[0].data,
      },
    };
  }

  async function deleteLeaderboard(slug) {
    const { rows: contestRows } = await pool.query("SELECT id, title FROM contests WHERE slug = $1", [slug]);
    if (!contestRows[0]) throw new HttpError(404, "CONTEST_NOT_FOUND", "Contest not found.");

    await pool.query("DELETE FROM contest_leaderboards WHERE contest_id = $1", [contestRows[0].id]);
    return { ok: true, deletedSlug: slug, contestTitle: contestRows[0].title };
  }

  async function previewLeaderboard(input) {
    const list = parseLeaderboard(input);
    return {
      total: list.length,
      topRankers: list.slice(0, 3),
      preview: list.slice(0, 50),
      all: list,
    };
  }

  let pythonDepsChecked = false;
  async function ensurePythonDeps() {
    if (pythonDepsChecked) return;
    try {
      await new Promise((resolve) => {
        const check = spawn("python3", ["-c", "import reportlab, pypdf"]);
        check.on("close", (code) => {
          if (code === 0) {
            pythonDepsChecked = true;
            return resolve();
          }
          console.log("[adminService] reportlab/pypdf missing. Running pip3 install reportlab pypdf...");
          const install = spawn("pip3", ["install", "reportlab", "pypdf"]);
          install.on("close", () => {
            pythonDepsChecked = true;
            resolve();
          });
        });
      });
    } catch (e) {
      console.warn("[adminService] Python dependency auto-install skipped:", e.message);
    }
  }

  // Prepares certificate generation batch and runs cert_gen/generate_certificates.py
  async function generateCertificates({ contestSlug, customTitle, date, recipients }) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new HttpError(400, "NO_RECIPIENTS", "Please provide at least one recipient to generate certificates.");
    }

    await ensurePythonDeps();

    const { rows: contestRows } = await pool.query("SELECT * FROM contests WHERE slug = $1", [contestSlug]);
    const contest = contestRows[0];
    const contestTitle = contest?.title || customTitle || "KPH Programming Contest";
    const dateStr = date ? String(date) : (contest?.ends_at ? formatOrdinalDate(contest.ends_at) : formatOrdinalDate(now()));

    // Write input array to a temporary file for python process
    const tempFile = path.join(os.tmpdir(), `kph_cert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`);
    await fs.promises.writeFile(tempFile, JSON.stringify(recipients), "utf-8");

    try {
      const pythonProcess = spawn("python3", [
        GENERATE_SCRIPT,
        "--contest", contestTitle,
        "--date", dateStr,
        "--json", tempFile,
        "--emit-json",
      ]);

      let stdout = "";
      let stderr = "";
      pythonProcess.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      pythonProcess.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

      const exitCode = await new Promise((resolve) => {
        pythonProcess.on("close", resolve);
      });

      if (exitCode !== 0) {
        throw new HttpError(500, "CERT_GEN_FAILED", `Certificate generator exited with error code ${exitCode}: ${stderr || stdout}`);
      }

      const match = stdout.match(/JSON_START([\s\S]*?)JSON_END/);
      if (!match) {
        throw new HttpError(500, "CERT_GEN_PARSE_ERROR", `Failed to parse output from certificate generator. Output: ${stdout}`);
      }

      const parsed = JSON.parse(match[1]);
      return {
        success: true,
        contestTitle,
        date: dateStr,
        processedCount: parsed.count,
        certificates: parsed.certificates,
      };
    } finally {
      fs.promises.unlink(tempFile).catch(() => {});
    }
  }

  // Dispatches generated certificates to participants via cert_gen/send_certificates_email.py
  async function sendCertificatesEmail({ contestSlug, customTitle, certificates }) {
    if (!Array.isArray(certificates) || certificates.length === 0) {
      throw new HttpError(400, "NO_CERTIFICATES", "No generated certificates provided to send.");
    }

    const { rows: contestRows } = await pool.query("SELECT * FROM contests WHERE slug = $1", [contestSlug]);
    const contestTitle = contestRows[0]?.title || customTitle || "KPH Programming Contest";

    const tempFile = path.join(os.tmpdir(), `kph_email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.json`);
    await fs.promises.writeFile(tempFile, JSON.stringify(certificates), "utf-8");

    try {
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = process.env.SMTP_PORT || "587";
      const smtpUser = process.env.SMTP_USER || "kph.jiit@gmail.com";
      const smtpPass = (process.env.SMTP_PASS || BUILTIN_SMTP_PASS).trim().replace(/\s+/g, "");
      const smtpFrom = process.env.SMTP_FROM || "kph.jiit@gmail.com";

      const relayUrl = process.env.GMAIL_RELAY_URL || DEFAULT_GMAIL_RELAY_URL;
      console.log(`[adminService] Dispatching ${certificates.length} certificates for contest "${contestTitle}". Relay: ${relayUrl ? "ACTIVE" : "NONE"}`);
      const emailArgs = [
        EMAIL_SCRIPT,
        "--contest", contestTitle,
        "--json", tempFile,
        "--emit-json",
        "--relay-url", relayUrl,
        "--smtp-host", smtpHost,
        "--smtp-port", smtpPort,
        "--smtp-user", smtpUser,
        "--smtp-pass", smtpPass,
        "--from-email", smtpFrom,
      ];

      const pythonProcess = spawn("python3", emailArgs, {
        env: {
          ...process.env,
          GMAIL_RELAY_URL: relayUrl,
          SMTP_HOST: smtpHost,
          SMTP_PORT: smtpPort,
          SMTP_USER: smtpUser,
          SMTP_PASS: smtpPass,
          SMTP_FROM: smtpFrom,
        },
      });

      let stdout = "";
      let stderr = "";
      pythonProcess.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
      pythonProcess.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

      const exitCode = await new Promise((resolve) => {
        pythonProcess.on("close", resolve);
      });

      if (exitCode !== 0) {
        throw new HttpError(500, "EMAIL_DISPATCH_FAILED", `Email dispatcher failed with code ${exitCode}: ${stderr || stdout}`);
      }

      const match = stdout.match(/JSON_START([\s\S]*?)JSON_END/);
      if (!match) {
        throw new HttpError(500, "EMAIL_PARSE_ERROR", `Failed to parse output from email dispatcher. Output: ${stdout}`);
      }

      const parsed = JSON.parse(match[1]);
      return {
        success: true,
        contestTitle,
        total: parsed.total,
        sentCount: parsed.sentCount,
        failedCount: parsed.failedCount !== undefined ? parsed.failedCount : Math.max(0, parsed.total - parsed.sentCount),
        hasSenderConfigured: Boolean(parsed.hasSenderConfigured),
        senderMethod: parsed.senderMethod || "NONE",
        hasSmtpConfigured: parsed.hasSmtpConfigured,
        results: parsed.results,
      };
    } finally {
      fs.promises.unlink(tempFile).catch(() => {});
    }
  }

  async function getCertificatePdfPath(filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(CERT_OUTPUT_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      // Auto-generate missing certificate PDF on the fly if needed
      const match = safeName.match(/^(.+)_(\d{8,14})_(.+)\.pdf$/i);
      if (match) {
        const [, namePart, enrPart, contestPart] = match;
        const candidateName = namePart.replace(/[-_]/g, " ").trim();
        const contestName = contestPart.replace(/[-_]/g, " ").trim();
        try {
          await generateCertificates({
            contestSlug: "",
            customTitle: contestName,
            recipients: [{ name: candidateName, enrollmentNo: enrPart, email: `${enrPart}@mail.jiit.ac.in` }],
          });
        } catch {
          // Fall through to 404 check if on-the-fly generation fails
        }
      }
    }
    if (!fs.existsSync(filePath)) {
      throw new HttpError(404, "FILE_NOT_FOUND", "Certificate PDF file not found.");
    }
    return filePath;
  }

  // -------------------------------------------------------------
  // ADMIN ACCESS IDENTIFIERS
  // -------------------------------------------------------------
  const PERMANENT_ADMIN_IDENTIFIERS = [
    "2501030287@mail.jiit.ac.in",
    "2501030287",
  ];

  function isPermanentAdmin(identifier) {
    if (!identifier) return false;
    const clean = String(identifier).trim().toLowerCase();
    return PERMANENT_ADMIN_IDENTIFIERS.some((p) => p.toLowerCase() === clean);
  }

  async function listAdminAccess() {
    await ensureAdminSchema();

    // Ensure Jayendra (permanent admin) always exists in admin_access
    await pool.query(
      `INSERT INTO admin_access (identifier, note)
       VALUES ('2501030287@mail.jiit.ac.in', 'Lead Admin - Jayendra Pratap Singh')
       ON CONFLICT (identifier) DO NOTHING`
    ).catch(() => {});

    const { rows } = await pool.query(
      `SELECT a.id, a.identifier, a.note, a.created_at,
              u.id AS user_id, u.display_name, u.email, u.photo_url, u.role
         FROM admin_access a
         LEFT JOIN users u ON lower(u.email) = lower(a.identifier) OR u.enrollment_no = a.identifier
        ORDER BY a.created_at DESC`
    );
    return rows.map((r) => {
      const isPermanent = isPermanentAdmin(r.identifier) || (r.email && isPermanentAdmin(r.email));
      return {
        id: r.id,
        identifier: r.identifier,
        note: r.note,
        createdAt: r.created_at,
        isPermanent: Boolean(isPermanent),
        matchedUser: r.user_id ? {
          id: r.user_id,
          displayName: r.display_name,
          email: r.email,
          photoUrl: r.photo_url,
          role: r.role,
        } : null,
      };
    });
  }

  async function addAdminAccess({ identifier, note }) {
    const cleanId = String(identifier || "").trim().toLowerCase();
    if (!cleanId) {
      throw new HttpError(400, "VALIDATION_ERROR", "College email or enrollment number is required.", {
        identifier: "Required field",
      });
    }

    const { rows: inserted } = await pool.query(
      `INSERT INTO admin_access (identifier, note)
       VALUES ($1, $2)
       ON CONFLICT (identifier) DO UPDATE SET note = EXCLUDED.note
       RETURNING *`,
      [cleanId, note ? String(note).trim() : null]
    );

    // If this user already exists in the users table, update their role to 'ADMIN' right now!
    await pool.query(
      `UPDATE users
          SET role = 'ADMIN', updated_at = now()
        WHERE lower(email) = $1 OR enrollment_no = $1`,
      [cleanId]
    );

    return inserted[0];
  }

  async function removeAdminAccess(id, currentAdminEmail) {
    const { rows: target } = await pool.query("SELECT * FROM admin_access WHERE id = $1", [id]);
    if (!target.length) throw new HttpError(404, "NOT_FOUND", "Admin identifier not found.");
    const item = target[0];

    // Safety: Jayendra Pratap Singh is the permanent Super Admin and can never be removed
    if (isPermanentAdmin(item.identifier)) {
      throw new HttpError(403, "CANNOT_REMOVE_PERMANENT_ADMIN", "Jayendra Pratap Singh (2501030287) is the permanent Lead Administrator and cannot be removed.");
    }

    // Safety: ensure we never delete the last remaining admin
    const { rows: countRows } = await pool.query("SELECT count(*)::int AS count FROM admin_access");
    if (countRows[0].count <= 1) {
      throw new HttpError(400, "CANNOT_REMOVE_LAST_ADMIN", "Cannot remove the only remaining admin access entry.");
    }

    // Safety: do not allow an admin to accidentally revoke their own access
    if (currentAdminEmail && item.identifier.toLowerCase() === currentAdminEmail.toLowerCase()) {
      throw new HttpError(400, "CANNOT_REMOVE_SELF", "You cannot revoke your own admin access while logged in.");
    }

    await pool.query("DELETE FROM admin_access WHERE id = $1", [id]);

    // Check if user still has other matching admin entries before downgrading
    const { rows: remaining } = await pool.query(
      "SELECT 1 FROM admin_access WHERE lower(identifier) = $1",
      [item.identifier.toLowerCase()]
    );
    if (!remaining.length) {
      await pool.query(
        `UPDATE users
            SET role = 'STUDENT', updated_at = now()
          WHERE lower(email) = $1 OR enrollment_no = $1`,
        [item.identifier.toLowerCase()]
      );
    }

    return { ok: true, removedId: id, identifier: item.identifier };
  }

  // -------------------------------------------------------------
  // TEAM SHOWCASE MANAGEMENT (Meet the Team)
  // -------------------------------------------------------------
  let teamSchemaEnsured = false;
  async function ensureTeamShowcaseSchema() {
    if (teamSchemaEnsured) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS team_showcase_members (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name            TEXT NOT NULL,
          role            TEXT NOT NULL,
          category        TEXT NOT NULL CHECK (category IN ('faculty', 'advisors', 'coordinators', 'volunteers')),
          academic_year   TEXT NOT NULL DEFAULT '2025-26',
          image           TEXT,
          object_position TEXT DEFAULT 'center 20%',
          quote           TEXT,
          specialty       TEXT,
          linkedin        TEXT,
          github          TEXT,
          instagram       TEXT,
          portfolio       TEXT,
          display_order   INT NOT NULL DEFAULT 0,
          is_active       BOOLEAN NOT NULL DEFAULT true,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS team_showcase_year_cat_idx
          ON team_showcase_members (academic_year, category, display_order);
      `);

      const { rows } = await pool.query("SELECT COUNT(*) AS count FROM team_showcase_members");
      if (parseInt(rows[0]?.count || "0", 10) === 0) {
        const seedPath = path.join(__dirname, "..", "..", "db", "migrations", "025_team_showcase_members.sql");
        if (fs.existsSync(seedPath)) {
          const sql = fs.readFileSync(seedPath, "utf8");
          await pool.query(sql);
        }
      }
      teamSchemaEnsured = true;
    } catch {
      // ignore if already applied or handled
    }
  }

  function toTeamMember(row) {
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      category: row.category,
      academicYear: row.academic_year,
      image: row.image || "",
      objectPosition: row.object_position || "center 20%",
      quote: row.quote || "",
      specialty: row.specialty || "",
      linkedin: row.linkedin || "",
      github: row.github || "",
      instagram: row.instagram || "",
      portfolio: row.portfolio || "",
      displayOrder: Number(row.display_order) || 0,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async function listTeamYears() {
    await ensureTeamShowcaseSchema();
    const { rows } = await pool.query(
      `SELECT DISTINCT academic_year FROM team_showcase_members ORDER BY academic_year DESC`
    );
    const dbYears = rows.map((r) => r.academic_year);

    // Also discover any physical year directories created in public/images/team/
    const teamImgDir = path.resolve(__dirname, "../../../public/images/team");
    let dirYears = [];
    if (fs.existsSync(teamImgDir)) {
      try {
        dirYears = fs
          .readdirSync(teamImgDir, { withFileTypes: true })
          .filter((d) => d.isDirectory() && /^\d{4}-\d{2,4}$/.test(d.name))
          .map((d) => d.name);
      } catch {
        // ignore
      }
    }

    const allYears = Array.from(new Set([...dbYears, ...dirYears]));
    if (!allYears.includes("2025-26")) allYears.unshift("2025-26");
    allYears.sort((a, b) => b.localeCompare(a));
    return { years: allYears };
  }

  async function listTeamMembers({ academicYear, category } = {}) {
    await ensureTeamShowcaseSchema();
    const params = [];
    const conditions = [];

    if (academicYear) {
      params.push(academicYear);
      conditions.push(`academic_year = $${params.length}`);
    }
    if (category && category !== "all") {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT * FROM team_showcase_members
       ${whereClause}
       ORDER BY display_order ASC, created_at ASC`,
      params
    );

    return {
      members: rows.map(toTeamMember),
    };
  }

  async function getTeamShowcase({ academicYear } = {}) {
    await ensureTeamShowcaseSchema();
    const { years } = await listTeamYears();
    const currentYear = academicYear || years[0] || "2025-26";
    const availableYears = [...years];
    if (academicYear && !availableYears.includes(academicYear)) {
      availableYears.unshift(academicYear);
    }

    const { rows } = await pool.query(
      `SELECT * FROM team_showcase_members
       WHERE academic_year = $1 AND is_active = true
       ORDER BY display_order ASC, created_at ASC`,
      [currentYear]
    );

    return {
      academicYear: currentYear,
      years: availableYears,
      members: rows.map(toTeamMember),
    };
  }

  async function createTeamMember(data = {}) {
    await ensureTeamShowcaseSchema();
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const role = typeof data.role === "string" ? data.role.trim() : "";
    const category = typeof data.category === "string" ? data.category.trim().toLowerCase() : "coordinators";
    const academicYear = typeof data.academicYear === "string" && data.academicYear.trim() ? data.academicYear.trim() : "2025-26";

    if (!name) throw new HttpError(400, "VALIDATION_ERROR", "Member name is required.");
    if (!role) throw new HttpError(400, "VALIDATION_ERROR", "Member role is required.");
    if (!["faculty", "advisors", "coordinators", "volunteers"].includes(category)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid category. Must be faculty, advisors, coordinators, or volunteers.");
    }

    const { rows } = await pool.query(
      `INSERT INTO team_showcase_members (
        name, role, category, academic_year, image, object_position, quote, specialty, linkedin, github, instagram, portfolio, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        name,
        role,
        category,
        academicYear,
        data.image?.trim() || null,
        data.objectPosition?.trim() || "center 20%",
        data.quote?.trim() || null,
        data.specialty?.trim() || null,
        data.linkedin?.trim() || null,
        data.github?.trim() || null,
        data.instagram?.trim() || null,
        data.portfolio?.trim() || null,
        Number(data.displayOrder) || 0,
        data.isActive !== undefined ? Boolean(data.isActive) : true,
      ]
    );

    return { ok: true, member: toTeamMember(rows[0]) };
  }

  async function updateTeamMember(id, data = {}) {
    await ensureTeamShowcaseSchema();
    const { rows: existing } = await pool.query("SELECT * FROM team_showcase_members WHERE id = $1", [id]);
    if (!existing[0]) throw new HttpError(404, "NOT_FOUND", "Team member not found.");

    const current = existing[0];
    const name = data.name !== undefined ? String(data.name).trim() : current.name;
    const role = data.role !== undefined ? String(data.role).trim() : current.role;
    const category = data.category !== undefined ? String(data.category).trim().toLowerCase() : current.category;
    const academicYear = data.academicYear !== undefined ? String(data.academicYear).trim() : current.academic_year;
    const image = data.image !== undefined ? (data.image ? String(data.image).trim() : null) : current.image;
    const objectPosition = data.objectPosition !== undefined ? String(data.objectPosition).trim() : current.object_position;
    const quote = data.quote !== undefined ? (data.quote ? String(data.quote).trim() : null) : current.quote;
    const specialty = data.specialty !== undefined ? (data.specialty ? String(data.specialty).trim() : null) : current.specialty;
    const linkedin = data.linkedin !== undefined ? (data.linkedin ? String(data.linkedin).trim() : null) : current.linkedin;
    const github = data.github !== undefined ? (data.github ? String(data.github).trim() : null) : current.github;
    const instagram = data.instagram !== undefined ? (data.instagram ? String(data.instagram).trim() : null) : current.instagram;
    const portfolio = data.portfolio !== undefined ? (data.portfolio ? String(data.portfolio).trim() : null) : current.portfolio;
    const displayOrder = data.displayOrder !== undefined ? Number(data.displayOrder) : current.display_order;
    const isActive = data.isActive !== undefined ? Boolean(data.isActive) : current.is_active;

    const { rows } = await pool.query(
      `UPDATE team_showcase_members
          SET name = $1, role = $2, category = $3, academic_year = $4, image = $5, object_position = $6,
              quote = $7, specialty = $8, linkedin = $9, github = $10, instagram = $11, portfolio = $12,
              display_order = $13, is_active = $14, updated_at = now()
        WHERE id = $15
        RETURNING *`,
      [
        name,
        role,
        category,
        academicYear,
        image,
        objectPosition,
        quote,
        specialty,
        linkedin,
        github,
        instagram,
        portfolio,
        displayOrder,
        isActive,
        id,
      ]
    );

    return { ok: true, member: toTeamMember(rows[0]) };
  }

  async function deleteTeamMember(id) {
    await ensureTeamShowcaseSchema();
    const { rows } = await pool.query("DELETE FROM team_showcase_members WHERE id = $1 RETURNING id, name", [id]);
    if (!rows[0]) throw new HttpError(404, "NOT_FOUND", "Team member not found.");
    return { ok: true, deletedId: id, name: rows[0].name };
  }

  async function createTeamYear(year) {
    const cleanYear = String(year || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
    if (!cleanYear) throw new HttpError(400, "VALIDATION_ERROR", "Academic year is required.");
    const targetDir = path.resolve(__dirname, `../../../public/images/team/${cleanYear}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return { ok: true, academicYear: cleanYear };
  }

  async function uploadTeamImage({ academicYear = "2025-26", filename, base64, memberName } = {}) {
    if (!base64 || typeof base64 !== "string") {
      throw new HttpError(400, "VALIDATION_ERROR", "Image data is required.");
    }

    const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    let ext = "png";
    let rawBase64 = base64;
    if (match) {
      ext = match[1] === "jpeg" ? "jpg" : match[1].toLowerCase();
      rawBase64 = match[2];
    } else if (filename && filename.includes(".")) {
      ext = filename.split(".").pop().toLowerCase();
    }

    if (!["png", "jpg", "jpeg", "webp"].includes(ext)) {
      ext = "png";
    }

    const cleanYear = String(academicYear || "2025-26").trim().replace(/[^a-zA-Z0-9._-]/g, "") || "2025-26";
    const rawName = memberName || filename || "member";
    const slug = slugify(rawName.replace(/\.[^/.]+$/, "")) || "member";
    const finalFilename = `${slug}-${Date.now()}.${ext}`;

    const targetDir = path.resolve(__dirname, `../../../public/images/team/${cleanYear}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFilePath = path.join(targetDir, finalFilename);
    const buffer = Buffer.from(rawBase64, "base64");
    fs.writeFileSync(targetFilePath, buffer);

    return {
      ok: true,
      imagePath: `/images/team/${cleanYear}/${finalFilename}`,
      filename: finalFilename,
      academicYear: cleanYear,
    };
  }

  return {
    listContests,
    createContest,
    updateContest,
    deleteContest,
    getContestRegistrations,
    previewLeaderboard,
    publishLeaderboard,
    getLeaderboard,
    deleteLeaderboard,
    generateCertificates,
    sendCertificatesEmail,
    getCertificatePdfPath,
    listAdminAccess,
    addAdminAccess,
    removeAdminAccess,
    listTeamYears,
    createTeamYear,
    listTeamMembers,
    getTeamShowcase,
    createTeamMember,
    updateTeamMember,
    deleteTeamMember,
    uploadTeamImage,
  };
}

module.exports = { createAdminService };

