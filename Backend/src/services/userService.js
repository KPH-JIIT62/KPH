// The service layer holds the business rules and ALL the SQL for users.
// Controllers never write SQL and this file never touches req/res, so each can change independently.
const { HttpError } = require("../utils/HttpError");
const { enrollmentFromEmail } = require("../utils/enrollment");

// The only shape of a user the API ever returns (camelCase, no firebase_uid).
function toPublicUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    photoUrl: row.photo_url,
    role: row.role,
    profile: {
      enrollmentNo: row.enrollment_no,
      branch: row.branch,
      batch: row.batch,
      codeforcesHandle: row.codeforces_handle,
      leetcodeHandle: row.leetcode_handle,
      codechefHandle: row.codechef_handle,
      hackerrankHandle: row.hackerrank_handle,
    },
    profileCompleted: row.profile_completed_at !== null,
    createdAt: row.created_at,
  };
}

function createUserService(pool) {
  async function findByFirebaseUid(uid) {
    const { rows } = await pool.query("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    return rows[0] ?? null;
  }

  // First login creates the row; every later login just reads it.
  async function findOrCreateFromFirebase({ uid, email, displayName, photoUrl }) {
    const existing = await findByFirebaseUid(uid);
    if (existing) {
      // Keeps the stored name in step with the (cleaned) Google name. No write unless something changed.
      if (existing.display_name === displayName && existing.photo_url === photoUrl) return existing;
      const { rows } = await pool.query(
        "UPDATE users SET display_name = $2, photo_url = $3, updated_at = now() WHERE id = $1 RETURNING *",
        [existing.id, displayName, photoUrl],
      );
      return rows[0];
    }
    try {
      // ON CONFLICT DO NOTHING makes this safe if two requests from a brand-new user arrive at once:
      // the database lets exactly one INSERT win, so no duplicate users.
      const { rows } = await pool.query(
        `INSERT INTO users (firebase_uid, email, display_name, photo_url, enrollment_no)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (firebase_uid) DO NOTHING
         RETURNING *`,
        [uid, email, displayName, photoUrl, enrollmentFromEmail(email)],
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

  // Updates only the fields present in `profile` (undefined = leave as it is, null = clear).
  // `db` can be a transaction client, so other services can run this inside their own transaction.
  async function updateProfile(userId, profile, db = pool) {
    const params = [userId, profile.enrollmentNo ?? null];
    const sets = ["enrollment_no = COALESCE(enrollment_no, $2)"]; // once known, the enrollment number never changes
    for (const [key, column] of Object.entries(PROFILE_COLUMNS)) {
      if (profile[key] === undefined) continue;
      params.push(profile[key]);
      sets.push(`${column} = $${params.length}`);
    }
    sets.push("profile_completed_at = COALESCE(profile_completed_at, now())", "updated_at = now()");
    try {
      const { rows } = await db.query(`UPDATE users SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params);
      return rows[0];
    } catch (error) {
      if (error.code === "23505" && error.constraint === "users_enrollment_no_key") {
        throw new HttpError(409, "ENROLLMENT_TAKEN", "This enrollment number is already linked to another account.", {
          enrollmentNo: "Already linked to another account.",
        });
      }
      throw error;
    }
  }

  // Used when someone registers for a contest: their HackerRank ID is also saved to their profile.
  async function setHackerrankHandle(userId, handle, db = pool) {
    const { rows } = await db.query(
      "UPDATE users SET hackerrank_handle = $2, updated_at = now() WHERE id = $1 RETURNING *",
      [userId, handle],
    );
    return rows[0];
  }

  return { findOrCreateFromFirebase, updateProfile, setHackerrankHandle };
}

module.exports = { createUserService, toPublicUser };
