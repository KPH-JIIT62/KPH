// Academic-detail detection: enrollment number -> campus, admission year, Year of Study;
// campus + batch (+ admission year) -> branch.
//
// Everything here is a PURE function: the current time is always passed in as `now`, so the July 20
// rollover can be tested for any date. The rules themselves are data in src/config/academic.js.
//
// Year of Study is never stored: it is recomputed from the enrollment number every time it is shown,
// so it can never go stale when a new academic year begins.
const { SUPPORT_EMAIL, ACADEMIC_YEAR_STARTS, MAX_YEAR_OF_STUDY, CAMPUSES, BATCH_BRANCHES } = require("../config/academic");

const CONTACT = `Contact ${SUPPORT_EMAIL}.`;

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
const WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
const yearLabel = (year) => (Number.isInteger(year) && year >= 1 && year <= ORDINALS.length ? `${ORDINALS[year - 1]} Year` : null);

// ---- academic year -------------------------------------------------------------------------------

// The calendar date in the academic timezone (the server may run in UTC; July 20 starts at midnight IST).
function datePartsIn(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Before July 20 -> the academic year that began LAST calendar year. On/after July 20 -> this calendar year.
function currentAcademicYear(now, rule = ACADEMIC_YEAR_STARTS) {
  const { year, month, day } = datePartsIn(now, rule.timeZone);
  const started = month > rule.month || (month === rule.month && day >= rule.day);
  return started ? year : year - 1;
}

// ---- enrollment number ---------------------------------------------------------------------------

function enrollmentFormatHelp() {
  const shapes = Object.values(CAMPUSES).map((c) => `${c.label}: ${c.example}`);
  return `Enrollment numbers look like ${shapes.join(" or ")}.`;
}

// "992501030069" -> { ok: true, campus: "128", campusLabel: "Campus 128", admissionYear: 2025 }
function parseEnrollment(enrollmentNo) {
  const text = typeof enrollmentNo === "string" ? enrollmentNo.trim() : "";
  for (const [campus, def] of Object.entries(CAMPUSES)) {
    const match = def.enrollmentPattern.exec(text);
    if (match) return { ok: true, campus, campusLabel: def.label, admissionYear: 2000 + Number(match.groups.year) };
  }
  return { ok: false, code: "ENROLLMENT_UNRECOGNISED", message: `We couldn’t recognise this enrollment number. ${enrollmentFormatHelp()} ${CONTACT}` };
}

// Year of Study for someone admitted in `admissionYear`, as of `now`. Rolls over every July 20.
function yearOfStudyFor(admissionYear, now) {
  const year = currentAcademicYear(now) - admissionYear + 1;
  // More than one intake ahead is not a real admission year (e.g. an old 10-digit "99…" number read as 2099).
  if (year < 0) return { ok: false, code: "ENROLLMENT_UNRECOGNISED", message: `We couldn’t recognise this enrollment number. ${enrollmentFormatHelp()} ${CONTACT}` };
  if (year < 1) return { ok: false, code: "ADMISSION_IN_FUTURE", message: `The admission year in this enrollment number (${admissionYear}) hasn’t started yet. ${CONTACT}` };
  if (year > MAX_YEAR_OF_STUDY) {
    return { ok: false, code: "OUTSIDE_PROGRAMME", message: `This enrollment number (admitted ${admissionYear}) is outside the ${MAX_YEAR_OF_STUDY}-year programme. ${CONTACT}` };
  }
  return { ok: true, yearOfStudy: year, yearOfStudyLabel: yearLabel(year) };
}

// ---- batch -> branch -----------------------------------------------------------------------------

// "b11" -> { letter: "B", batch: "B11" }. A batch is one letter, optionally followed by a 1-2 digit number.
function parseBatch(input) {
  const text = typeof input === "string" ? input.replace(/\s+/g, "").toUpperCase() : "";
  const match = /^([A-Z])(\d{1,2})?$/.exec(text);
  if (!match) return { ok: false, message: "Enter your batch letter and number, e.g. B11." };
  return { ok: true, letter: match[1], batch: text };
}

// The batch letters usable by someone from this campus admitted in this year, e.g. { B: "CSE", A: "ECE", ... }.
function batchOptionsFor(campus, admissionYear) {
  const out = {};
  for (const [letter, rule] of Object.entries(BATCH_BRANCHES[campus] ?? {})) {
    if (rule.fromAdmissionYear !== undefined && admissionYear < rule.fromAdmissionYear) continue;
    if (rule.toAdmissionYear !== undefined && admissionYear > rule.toAdmissionYear) continue;
    out[letter] = rule.branch;
  }
  return out;
}

function branchFor({ campus, admissionYear, batch }) {
  const parsed = parseBatch(batch);
  if (!parsed.ok) return { ok: false, code: "BATCH_FORMAT", message: parsed.message };
  const options = batchOptionsFor(campus, admissionYear);
  const branch = options[parsed.letter];
  if (!branch) {
    const known = Object.keys(options).join(", ");
    const label = CAMPUSES[campus].label;
    const inOtherYear = BATCH_BRANCHES[campus]?.[parsed.letter];
    const why = inOtherYear
      ? `Batch ${parsed.letter} isn’t available for students admitted in ${admissionYear}.`
      : `Batch ${parsed.letter} doesn’t exist on ${label}.`;
    return { ok: false, code: "BATCH_NOT_AVAILABLE", message: `${why} Valid batch letters: ${known}. If you think this is wrong, ${CONTACT.toLowerCase()}` };
  }
  return { ok: true, batch: parsed.batch, branch };
}

// ---- combined ------------------------------------------------------------------------------------

// Everything we can say about a person from the enrollment number alone (no batch needed).
// This is what the API sends to the browser, so the form can show campus / year and suggest the branch instantly.
function describeAcademic(enrollmentNo, now) {
  const empty = { campus: null, campusLabel: null, admissionYear: null, yearOfStudy: null, yearOfStudyLabel: null, batchBranches: {}, error: null };
  if (!enrollmentNo) return empty;
  const enrollment = parseEnrollment(enrollmentNo);
  if (!enrollment.ok) return { ...empty, error: enrollment.message };
  const base = { ...empty, campus: enrollment.campus, campusLabel: enrollment.campusLabel, admissionYear: enrollment.admissionYear };
  const year = yearOfStudyFor(enrollment.admissionYear, now);
  if (!year.ok) return { ...base, error: year.message };
  return {
    ...base,
    yearOfStudy: year.yearOfStudy,
    yearOfStudyLabel: year.yearOfStudyLabel,
    batchBranches: batchOptionsFor(enrollment.campus, enrollment.admissionYear),
  };
}

// The full check used when SAVING: enrollment number + batch must both be valid and compatible.
function deriveAcademic({ enrollmentNo, batch, now }) {
  const enrollment = parseEnrollment(enrollmentNo);
  if (!enrollment.ok) return { ok: false, field: "enrollmentNo", ...enrollment };
  const year = yearOfStudyFor(enrollment.admissionYear, now);
  if (!year.ok) return { ok: false, field: "enrollmentNo", ...year };
  const branch = branchFor({ campus: enrollment.campus, admissionYear: enrollment.admissionYear, batch });
  if (!branch.ok) return { ok: false, field: "batch", ...branch };
  return { ok: true, campus: enrollment.campus, admissionYear: enrollment.admissionYear, yearOfStudy: year.yearOfStudy, batch: branch.batch, branch: branch.branch };
}

// Does a client-supplied "Year of Study" (2, "2", "2nd Year", "Second year") name this year? Used to REJECT mismatches.
function yearInputMatches(input, year) {
  if (typeof input === "number") return input === year;
  if (typeof input !== "string") return false;
  const text = input.trim().toLowerCase().replace(/\s*year$/, "").trim();
  return [String(year), ORDINALS[year - 1], WORDS[year - 1]].includes(text);
}

module.exports = {
  currentAcademicYear,
  parseEnrollment,
  yearOfStudyFor,
  parseBatch,
  batchOptionsFor,
  branchFor,
  describeAcademic,
  deriveAcademic,
  yearInputMatches,
  yearLabel,
};
