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
const DEFAULT_GMAIL_RELAY_URL = "https://script.google.com/macros/s/AKfycbx-kdqXE2wtyrVctf8bHshrWGIIZ7UhLew-nRrc-1zX6Sj5I5bclt2FbL1rsDFOFSqd/exec";

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

    const startsAt = data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : contest.starts_at;
    const endsAt = data.endsAt !== undefined ? (data.endsAt ? new Date(data.endsAt) : null) : contest.ends_at;
    const registrationStartsAt = data.registrationStartsAt !== undefined ? (data.registrationStartsAt ? new Date(data.registrationStartsAt) : null) : contest.registration_starts_at;
    const registrationClosesAt = data.registrationClosesAt !== undefined ? (data.registrationClosesAt ? new Date(data.registrationClosesAt) : null) : contest.registration_closes_at;

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

    const { rows: regs } = await pool.query("SELECT count(*)::int AS count FROM contest_registrations WHERE contest_id = $1", [contest.id]);
    if (regs[0].count > 0) {
      throw new HttpError(409, "CONTEST_HAS_REGISTRATIONS", `Cannot delete contest "${contest.title}" because it already has ${regs[0].count} registered participant(s). Set status to CLOSED instead.`);
    }

    await pool.query("DELETE FROM contests WHERE slug = $1", [slug]);
    return { ok: true, deletedSlug: slug };
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
      const name = String(item.name ?? item.Name ?? item.student_name ?? item.participantName ?? item.hacker ?? item.username ?? `Participant #${rank}`).trim();
      const score = item.score ?? item.Score ?? item.points ?? item.totalScore ?? 0;
      const email = String(item.email ?? item.Email ?? item.gmail ?? item.student_email ?? "").trim().toLowerCase();
      const enrollmentNo = String(item.enrollmentNo ?? item.enrollment_no ?? item.enrollment ?? "").trim();
      const college = String(item.college ?? item.college_name ?? "JIIT").trim();

      return {
        rank,
        name,
        email: email || (enrollmentNo ? `${enrollmentNo}@mail.jiit.ac.in` : ""),
        score: typeof score === "number" ? score : Number(score) || 0,
        enrollmentNo,
        college,
        raw: item,
      };
    }).sort((a, b) => a.rank - b.rank);
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
          RESEND_API_KEY: process.env.RESEND_API_KEY || "",
          RESEND_FROM: process.env.RESEND_FROM || "",
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

  function getCertificatePdfPath(filename) {
    const safeName = path.basename(filename);
    const filePath = path.join(CERT_OUTPUT_DIR, safeName);
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

  return {
    listContests,
    createContest,
    updateContest,
    deleteContest,
    previewLeaderboard,
    generateCertificates,
    sendCertificatesEmail,
    getCertificatePdfPath,
    listAdminAccess,
    addAdminAccess,
    removeAdminAccess,
  };
}

module.exports = { createAdminService };

