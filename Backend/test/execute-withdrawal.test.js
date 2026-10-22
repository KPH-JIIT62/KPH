const test = require("node:test");
const assert = require("node:assert/strict");
const { EXECUTE_WITHDRAWAL_CUTOFF } = require("../src/utils/contestStatus");

test("Execute withdrawal closes at 13:45 IST on 31 October 2026", () => {
  assert.equal(EXECUTE_WITHDRAWAL_CUTOFF.toISOString(), "2026-10-31T08:15:00.000Z");
});
