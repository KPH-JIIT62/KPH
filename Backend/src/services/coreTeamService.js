// The core team roster: who is a COORDINATOR or VOLUNTEER. All SQL for the core_team_members table lives here.

function createCoreTeamService(pool) {
  // "Is this enrollment number on the roster?" -> "COORDINATOR" | "VOLUNTEER" | null.
  // One primary-key lookup, run on each request that returns a user, so roster changes apply immediately.
  async function roleFor(enrollmentNo) {
    if (!enrollmentNo) return null;
    const { rows } = await pool.query("SELECT role FROM core_team_members WHERE enrollment_no = $1", [enrollmentNo]);
    return rows[0]?.role ?? null;
  }

  // Makes the roster EXACTLY match `entries` ([{ enrollmentNo, role }]), all in one transaction:
  //   listed and new -> added | listed with a different role -> changed | not listed any more -> removed.
  // With { dryRun: true } nothing is written; the result only describes what would happen.
  async function sync(entries, { dryRun = false } = {}) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT enrollment_no, role FROM core_team_members FOR UPDATE");
      const current = new Map(rows.map((r) => [r.enrollment_no, r.role]));
      const wanted = new Map(entries.map((e) => [e.enrollmentNo, e.role]));

      const added = [];
      const changed = [];
      let unchanged = 0;
      for (const [enrollmentNo, role] of wanted) {
        if (!current.has(enrollmentNo)) added.push({ enrollmentNo, role });
        else if (current.get(enrollmentNo) !== role) changed.push({ enrollmentNo, from: current.get(enrollmentNo), to: role });
        else unchanged += 1;
      }
      const removed = [...current].filter(([enrollmentNo]) => !wanted.has(enrollmentNo)).map(([enrollmentNo, role]) => ({ enrollmentNo, role }));

      if (!dryRun) {
        if (removed.length) await client.query("DELETE FROM core_team_members WHERE enrollment_no = ANY($1)", [removed.map((r) => r.enrollmentNo)]);
        for (const { enrollmentNo, role } of [...added, ...changed.map((c) => ({ enrollmentNo: c.enrollmentNo, role: c.to }))]) {
          await client.query(
            `INSERT INTO core_team_members (enrollment_no, role) VALUES ($1, $2)
             ON CONFLICT (enrollment_no) DO UPDATE SET role = EXCLUDED.role, updated_at = now()`,
            [enrollmentNo, role],
          );
        }
      }
      await client.query(dryRun ? "ROLLBACK" : "COMMIT");
      return { added, changed, removed, unchanged, total: wanted.size };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return { roleFor, sync };
}

module.exports = { createCoreTeamService };
