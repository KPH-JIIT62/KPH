// ALL academic rules live in this one file, as DATA. No other file hard-codes a campus, batch or branch.
//
//   Add a campus / batch / branch later  -> edit the tables below, nothing else.
//   Change when the academic year rolls over -> edit ACADEMIC_YEAR_STARTS.
//
// The logic that reads these tables is in src/utils/academic.js.

const SUPPORT_EMAIL = "kph.jiit@gmail.com";

// The academic year starts on this date (month is 1-12), counted in this timezone.
// Before July 20 we are still in the PREVIOUS academic year.
const ACADEMIC_YEAR_STARTS = { month: 7, day: 20, timeZone: "Asia/Kolkata" };

// Programme length. A computed year outside 1..MAX_YEAR_OF_STUDY is treated as "not recognised".
const MAX_YEAR_OF_STUDY = 4;

// How to recognise a campus from an enrollment number. The (?<year>..) group is the 2-digit admission year.
//   Campus 62 : YY + 8 digits        e.g. 2501030069     (10 digits)
//   Campus 128: 99 + YY + 8 digits   e.g. 992501030069   (12 digits)
// The two shapes differ in length, so one number can never match both.
const CAMPUSES = {
  62: { label: "Campus 62", enrollmentPattern: /^(?<year>\d{2})\d{8}$/, example: "2501030069" },
  128: { label: "Campus 128", enrollmentPattern: /^99(?<year>\d{2})\d{8}$/, example: "992501030069" },
};

// Batch letter -> branch, PER CAMPUS (the same letter can mean different things on different campuses).
// Optional range per letter, in ADMISSION years (both ends inclusive):
//   fromAdmissionYear : the branch did not exist on this campus before this admission year
//   toAdmissionYear   : the branch stopped taking students after this admission year
const BATCH_BRANCHES = {
  62: {
    B: { branch: "CSE" },
    A: { branch: "ECE" },
    C: { branch: "BT" },
    D: { branch: "R&AI" },
    G: { branch: "M&C" },
    H: { branch: "IT", fromAdmissionYear: 2026 }, // IT started on campus 62 with the 2026 intake
  },
  128: {
    H: { branch: "IT" },
    F: { branch: "CSE" },
    E: { branch: "ECM" },
  },
};

module.exports = { SUPPORT_EMAIL, ACADEMIC_YEAR_STARTS, MAX_YEAR_OF_STUDY, CAMPUSES, BATCH_BRANCHES };
