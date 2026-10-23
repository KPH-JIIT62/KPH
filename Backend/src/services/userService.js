// The service layer holds the business rules and ALL the SQL for users.
// Controllers never write SQL and this file never touches req/res, so each can change independently.
const { HttpError } = require("../utils/HttpError");
const { enrollmentFromEmail } = require("../utils/enrollment");
const { describeAcademic, deriveAcademic, yearInputMatches } = require("../utils/academic");
const { SUPPORT_EMAIL } = require("../config/academic");
const { createCoreTeamService } = require("./coreTeamService");

// The only shape of a user the API ever returns (camelCase, no firebase_uid).
// `profile.academic` is DERIVED, never stored: campus, admission year and Year of Study come from the enrollment
// number and today's date (so Year of Study changes by itself on July 20), and `batchBranches` lists the batch
// letters this person may pick with the branch each one gives (the form uses it for instant feedback).
// `role` is the account role (everyone who signs in with an enrollment number is a STUDENT). `coreTeamRole` is
// separate and ADDITIONAL: "COORDINATOR" or "VOLUNTEER" if they are on the core team roster, otherwise null.
function toPublicUser(row, now = new Date(), coreTeamRole = null) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    coreTeamRole,
    profile: {
      enrollmentNo: row.enrollment_no,
      branch: row.branch,
      batch: row.batch,
      codeforcesHandle: row.codeforces_handle,
      leetcodeHandle: row.leetcode_handle,
      codechefHandle: row.codechef_handle,
      hackerrankHandle: row.hackerrank_handle,
      academic: describeAcademic(row.enrollment_no, now),
    },
    profileCompleted: row.profile_completed_at !== null,
    createdAt: row.created_at,
  };
}

// `now` is a function returning the current time. Tests pass a fixed one to check the July 20 rollover.
function createUserService(pool, { now = () => new Date(), coreTeam = createCoreTeamService(pool) } = {}) {
  async function findByFirebaseUid(uid) {
    const { rows } = await pool.query("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    return rows[0] ?? null;
  }

  const PERMANENT_ADMIN_IDENTIFIERS = [
    "2501030287@mail.jiit.ac.in",
    "2501030287",
  ];

  async function checkAdminStatus(email, enrollmentNo) {
    if (
      (email && PERMANENT_ADMIN_IDENTIFIERS.includes(email.toLowerCase())) ||
      (enrollmentNo && PERMANENT_ADMIN_IDENTIFIERS.includes(enrollmentNo))
    ) {
      return true;
    }
    try {
      const { rows } = await pool.query(
        "SELECT 1 FROM admin_access WHERE lower(identifier) = lower($1) OR identifier = $2 LIMIT 1",
        [email, enrollmentNo || ""],
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }

  // First login creates the row; every later login just reads it.
  async function findOrCreateFromFirebase({ uid, email, displayName, photoUrl }) {
    const existing = await findByFirebaseUid(uid);
    if (existing) {
      const isAdmin = await checkAdminStatus(email, existing.enrollment_no);
      const targetRole = isAdmin ? "ADMIN" : existing.role;
      if (existing.role !== targetRole || existing.display_name !== displayName || existing.photo_url !== photoUrl) {
        const { rows } = await pool.query(
          "UPDATE users SET display_name = $2, photo_url = $3, role = $4, updated_at = now() WHERE id = $1 RETURNING *",
          [existing.id, displayName, photoUrl, targetRole],
        );
        return rows[0];
      }
      return existing;
    }
    try {
      const enrollmentNo = enrollmentFromEmail(email);
      const isAdmin = await checkAdminStatus(email, enrollmentNo);
      const initialRole = isAdmin ? "ADMIN" : "STUDENT";
      // ON CONFLICT DO NOTHING makes this safe if two requests from a brand-new user arrive at once:
      // the database lets exactly one INSERT win, so no duplicate users.
      const { rows } = await pool.query(
        `INSERT INTO users (firebase_uid, email, display_name, photo_url, enrollment_no, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (firebase_uid) DO NOTHING
         RETURNING *`,
        [uid, email, displayName, photoUrl, enrollmentNo, initialRole],
      );
      return rows[0] ?? (await findByFirebaseUid(uid)); // we lost the race: read the winner's row
    } catch (error) {
      if (error.code === "23505") {
        // Same email already stored under a different Firebase uid.
        throw new HttpError(409, "ACCOUNT_CONFLICT", "An account with this email already exists. Please contact a club organizer.");
      }
      throw error;
    }
  }

  // Column names come from THIS map, never from the request, so the SQL below cannot be tampered with.
  const PROFILE_COLUMNS = {
    branch: "branch",
    batch: "batch",
    codeforcesHandle: "codeforces_handle",
    leetcodeHandle: "leetcode_handle",
    codechefHandle: "codechef_handle",
    hackerrankHandle: "hackerrank_handle",
  };

  // Runs `work` as one all-or-nothing database transaction. If `db` is already a checked-out client, the caller
  // owns the transaction (for example contest registration) and we simply join it.
  async function inTransaction(db, work) {
    if (typeof db.release === "function") return work(db);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // A person has ONE HackerRank ID. When it changes, every contest registration that has not started yet is updated to
  // match, so organizers always see the ID the person uses now. Contests that already started (or finished) keep the ID
  // the person registered with, because that is what really happened. A contest with no start date yet counts as upcoming.
  async function syncUpcomingRegistrations(userId, handle, db) {
    const at = now();
    if (handle === null) {
      // A registration cannot exist without an ID, so the ID cannot be cleared while an upcoming registration needs it.
      const { rows } = await db.query(
        `SELECT c.title FROM contest_registrations r JOIN contests c ON c.id = r.contest_id
          WHERE r.user_id = $1 AND (c.starts_at IS NULL OR c.starts_at > $2) ORDER BY c.starts_at NULLS LAST`,
        [userId, at],
      );
      if (rows.length) {
        const message = `You’re registered for ${rows.map((r) => r.title).join(" and ")}, which needs a HackerRank ID. Change it instead of clearing it, or withdraw your registration first.`;
        throw new HttpError(409, "HACKERRANK_ID_IN_USE", message, { hackerrankHandle: message });
      }
      return;
    }
    await db.query(
      `UPDATE contest_registrations r SET hackerrank_handle = $2
         FROM contests c
        WHERE c.id = r.contest_id AND r.user_id = $1
          AND (c.starts_at IS NULL OR c.starts_at > $3)
          AND r.hackerrank_handle IS DISTINCT FROM $2`,
      [userId, handle, at],
    );
  }

  // Updates only the fields present in `profile` (undefined = leave as it is, null = clear).
  // `db` can be a transaction client, so other services can run this inside their own transaction.
  async function updateProfile(userId, profile, db = pool) {
    return inTransaction(db, async (tx) => {
      const params = [userId, profile.enrollmentNo ?? null];
      const sets = ["enrollment_no = COALESCE(enrollment_no, $2)"]; // once known, the enrollment number never changes
      for (const [key, column] of Object.entries(PROFILE_COLUMNS)) {
        if (profile[key] === undefined) continue;
        params.push(profile[key]);
        sets.push(`${column} = $${params.length}`);
      }
      sets.push("profile_completed_at = COALESCE(profile_completed_at, now())", "updated_at = now()");
      let row;
      try {
        row = (await tx.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params)).rows[0];
      } catch (error) {
        if (error.code === "23505" && error.constraint === "users_enrollment_no_key") {
          throw new HttpError(409, "ENROLLMENT_TAKEN", "This enrollment number is already linked to another account.", {
            enrollmentNo: "Already linked to another account.",
          });
        }
        throw error;
      }
      // Same transaction: either the profile AND the registrations change, or neither does.
      if (profile.hackerrankHandle !== undefined) await syncUpcomingRegistrations(userId, row.hackerrank_handle, tx);
      return row;
    });
  }

  // Branch is NEVER taken from the client. This turns the validated form values into what may actually be saved:
  //  - first-time onboarding, or a changed batch: the enrollment number + batch are checked against the campus rules
  //    (utils/academic.js) and the branch is DERIVED from them; anything unknown or incompatible is a 400.
  //  - an unchanged batch on an already-completed profile: nothing academic is touched, so existing users keep
  //    their stored values (even older free-text ones) when they only add a coding handle.
  function prepareProfileUpdate(user, value) {
    const next = { ...value };
    const onboarding = !user.profile_completed_at;
    const batchChanged = value.batch !== undefined && value.batch !== user.batch;
    if (onboarding || batchChanged) {
      const enrollmentNo = user.enrollment_no ?? value.enrollmentNo;
      const result = deriveAcademic({ enrollmentNo, batch: value.batch, now: now() });
      if (!result.ok) throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", { [result.field]: result.message });
      next.batch = result.batch;
      next.branch = result.branch;
    } else {
      delete next.batch;
    }
    return next;
  }

  // What we know about a person's campus / Year of Study right now (used by contest registration).
  const academicOf = (row) => describeAcademic(row.enrollment_no, now());
  // The rule EVERY registration (contests, sessions...) applies to the person registering, in one place.
  // `me` is their saved user row. Registration is only for people with a finished profile and a valid Year of Study,
  // and a client may not claim a different Year of Study than the profile's: it is refused, not quietly ignored.
  function assertProfileReadyToRegister(me, claimedYearOfStudy) {
    if (!me?.profile_completed_at) throw new HttpError(409, "PROFILE_INCOMPLETE", "Please complete your profile before registering.");
    const { yearOfStudy, error } = academicOf(me);
    if (!yearOfStudy) {
      throw new HttpError(409, "YEAR_OF_STUDY_UNAVAILABLE", error || `We couldn’t work out your Year of Study. Contact ${SUPPORT_EMAIL}.`);
    }
    if (claimedYearOfStudy !== undefined && !yearInputMatches(claimedYearOfStudy, yearOfStudy)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Please fix the highlighted fields.", {
        yearOfStudy: "Year of Study comes from your profile and can’t be changed here.",
      });
    }
  }

  // Core team membership is looked up by the enrollment number in the person's VERIFIED login email, never by the
  // enrollment number stored on the profile: that one can be typed by users whose email has no number, so it proves nothing.
  const coreTeamRoleOf = (row) => coreTeam.roleFor(enrollmentFromEmail(row.email));
  const toPublic = async (row) => toPublicUser(row, now(), await coreTeamRoleOf(row));

  // Used when someone registers for a contest: their HackerRank ID is also saved to their profile.
  async function setHackerrankHandle(userId, handle, db = pool) {
    return inTransaction(db, async (tx) => {
      const { rows } = await tx.query(
        "UPDATE users SET hackerrank_handle = $2, updated_at = now() WHERE id = $1 RETURNING *",
        [userId, handle],
      );
      await syncUpcomingRegistrations(userId, handle, tx); // registering with a new ID updates the other upcoming registrations too
      return rows[0];
    });
  }

  return { findOrCreateFromFirebase, prepareProfileUpdate, updateProfile, setHackerrankHandle, academicOf, assertProfileReadyToRegister, coreTeamRoleOf, toPublic };
}

module.exports = { createUserService, toPublicUser };
