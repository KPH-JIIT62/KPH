const test = require("node:test");
const assert = require("node:assert/strict");
const { isExecuteMandatory } = require("../src/utils/executeEligibility");

const now = new Date("2026-10-22T10:00:00+05:30");

test("Execute mandatory designation requires Sector 62, 2025 intake, eligible branch, and second year", () => {
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", branch: "CSE" }, now), true);
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", branch: "M&C" }, now), true);
  assert.equal(isExecuteMandatory({ enrollment_no: "992501030069", branch: "CSE" }, now), false);
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", branch: "ECE" }, now), false);
  assert.equal(isExecuteMandatory({ enrollment_no: "2401030069", branch: "CSE" }, now), false);
});
