const test = require("node:test");
const assert = require("node:assert/strict");
const { isExecuteMandatory } = require("../src/utils/executeEligibility");

test("Execute mandatory designation requires Sector 62, 2025 CSE intake, and second year", () => {
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", campus: "Campus 62", branch: "CSE", year_of_study: 2 }), true);
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", campus: "Campus 62", branch: "M&C", year_of_study: 2 }), false);
  assert.equal(isExecuteMandatory({ enrollment_no: "992501030069", campus: "Campus 128", branch: "CSE", year_of_study: 2 }), false);
  assert.equal(isExecuteMandatory({ enrollment_no: "2501030069", campus: "Campus 62", branch: "ECE", year_of_study: 2 }), false);
  assert.equal(isExecuteMandatory({ enrollment_no: "2401030069", campus: "Campus 62", branch: "CSE", year_of_study: 3 }), false);
});
