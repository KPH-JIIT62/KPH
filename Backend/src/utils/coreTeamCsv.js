// Reads the core team CSV:
//
//   # lines starting with # are comments
//   enrollment_no,role
//   2401030289,COORDINATOR
//   2501030069,VOLUNTEER
//
// Pure function (text in, result out) so it is easy to test. It reports EVERY problem it finds with its line number,
// so a mistake is fixed in one go instead of one error per run. Nothing is imported unless the whole file is clean.
const { CORE_TEAM_ROLES } = require("../config/coreTeam");
const { parseEnrollment, enrollmentFormatHelp } = require("./academic");

const unquote = (cell) => cell.trim().replace(/^"(.*)"$/, "$1").trim();

// A number is accepted if it has a real campus format AND a believable admission year (not in the far future, which is
// how an old 10-digit "99..." number would look). Graduated members are fine: the programme length is not checked here.
function validEnrollment(enrollmentNo, now) {
  const parsed = parseEnrollment(enrollmentNo);
  return parsed.ok && parsed.admissionYear <= now.getFullYear() + 1;
}

function parseCoreTeamCsv(text, { now = new Date() } = {}) {
  const entries = [];
  const errors = [];
  const seen = new Map(); // enrollment number -> first line it appeared on
  let sawHeader = false;

  const lines = String(text).replace(/^\uFEFF/, "").split(/\r?\n/); // tolerate a BOM and Windows line endings
  lines.forEach((raw, index) => {
    const line = index + 1;
    const content = raw.trim();
    if (!content || content.startsWith("#")) return;

    const cells = content.split(",").map(unquote);
    while (cells.length > 2 && cells[cells.length - 1] === "") cells.pop(); // trailing commas added by spreadsheets

    if (!sawHeader) {
      sawHeader = true;
      if (cells.length !== 2 || cells[0].toLowerCase() !== "enrollment_no" || cells[1].toLowerCase() !== "role") {
        errors.push({ line, message: 'The first row must be the header "enrollment_no,role".' });
      }
      return;
    }
    if (cells.length !== 2) {
      errors.push({ line, message: `Expected exactly 2 columns (enrollment_no,role) but found ${cells.length}.` });
      return;
    }

    const [enrollmentNo, roleText] = cells;
    const role = roleText.toUpperCase();
    let ok = true;
    if (!validEnrollment(enrollmentNo, now)) {
      const excel = /e\+/i.test(enrollmentNo) ? " A spreadsheet may have turned the number into scientific notation: format the column as Text." : "";
      errors.push({ line, message: `"${enrollmentNo}" is not a valid enrollment number. ${enrollmentFormatHelp()}${excel}` });
      ok = false;
    }
    if (!CORE_TEAM_ROLES.includes(role)) {
      errors.push({ line, message: `"${roleText}" is not a valid role. Use one of: ${CORE_TEAM_ROLES.join(", ")}.` });
      ok = false;
    }
    if (ok && seen.has(enrollmentNo)) {
      errors.push({ line, message: `${enrollmentNo} is already listed on line ${seen.get(enrollmentNo)}. Each enrollment number may appear once.` });
      ok = false;
    }
    if (ok) {
      seen.set(enrollmentNo, line);
      entries.push({ enrollmentNo, role });
    }
  });

  if (!sawHeader) errors.push({ line: 1, message: 'The file is empty. It needs the header "enrollment_no,role".' });
  return { entries, errors };
}

module.exports = { parseCoreTeamCsv };
