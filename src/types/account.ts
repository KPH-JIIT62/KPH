// Worked out by the SERVER from the enrollment number and today's date (never stored, never sent by the browser).
// Mirrors describeAcademic() in Backend/src/utils/academic.js.
export type AcademicInfo = {
  campus: string | null; // "62" | "128"
  campusLabel: string | null; // "Campus 62"
  admissionYear: number | null;
  yearOfStudy: number | null; // 1-4; changes by itself every July 20
  yearOfStudyLabel: string | null; // "2nd Year"
  // The batch letters this person may use and the branch each gives, e.g. { B: "CSE", A: "ECE" }. Comes from the backend rules.
  batchBranches: Record<string, string>;
  // Why detection failed (unrecognised enrollment number, outside the programme...), or null.
  error: string | null;
};

// The shape of the user returned by the KPH backend (GET /api/users/me). Mirrors Backend/src/services/userService.js.
export type ProfileDetails = {
  enrollmentNo: string | null;
  branch: string | null;
  batch: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
  codechefHandle: string | null;
  hackerrankHandle: string | null;
  academic: AcademicInfo;
};

export type Account = {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: "STUDENT" | "ORGANIZER" | "ADMIN";
  // ADDITIONAL to role: set from the core team list on the server (never by the browser), otherwise null.
  coreTeamRole: "COORDINATOR" | "VOLUNTEER" | null;
  profile: ProfileDetails;
  profileCompleted: boolean;
  createdAt: string;
};

// What the form sends: plain strings, empty when left blank.
// There is deliberately no branch or year of study here: the server detects both from the enrollment number + batch.
// Handles are optional: a handle that is NOT sent is left unchanged on the server, one sent as "" is cleared.
export type ProfileInput = {
  enrollmentNo: string;
  batch: string;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  codechefHandle?: string;
  hackerrankHandle?: string;
};
