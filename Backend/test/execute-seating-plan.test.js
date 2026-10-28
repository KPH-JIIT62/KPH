const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { getSeatingPlan, PLACEHOLDER } = require("../src/utils/executeSeatingPlan");

test("seating plan uses the leader enrollment and reads replacements at runtime", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "execute-seats-"));
  const csvPath = path.join(dir, "seats.csv");
  try {
    fs.writeFileSync(csvPath, "team_leader_enrollment_number,team_name,hall_name,lab_number,system_number\n");
    assert.equal(getSeatingPlan("992601030011", "Team Alpha", csvPath).message, PLACEHOLDER);

    fs.writeFileSync(csvPath, 'team_leader_enrollment_number,team_name,hall_name,lab_number,system_number\n992601030011,"Team, Alpha",Hall A,Lab 2,18\n');
    assert.deepEqual(getSeatingPlan("992601030011", "Team Alpha", csvPath), {
      teamName: "Team, Alpha", hallName: "Hall A", labNumber: "Lab 2", systemNumber: "18", message: null,
    });

    fs.writeFileSync(csvPath, "team_leader_enrollment_number,team_name,hall_name,lab_number,system_number\n992601030011,Team Alpha,Hall B,Lab 3,21\n");
    assert.equal(getSeatingPlan("992601030011", "Team Alpha", csvPath).hallName, "Hall B");
    assert.equal(getSeatingPlan("992601030012", "Team Beta", csvPath).message, PLACEHOLDER);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
