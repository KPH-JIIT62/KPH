// The shape of the user returned by the KPH backend (GET /api/users/me). Mirrors Backend/src/services/userService.js.
export type ProfileDetails = {
  enrollmentNo: string | null;
  branch: string | null;
  batch: string | null;
  codeforcesHandle: string | null;
  leetcodeHandle: string | null;
  codechefHandle: string | null;
  hackerrankHandle: string | null;
};

export type Account = {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: "STUDENT" | "ORGANIZER" | "ADMIN";
  profile: ProfileDetails;
  profileCompleted: boolean;
  createdAt: string;
};

// What the form sends: plain strings, empty when left blank.
// Handles are optional: a handle that is NOT sent is left unchanged on the server, one sent as "" is cleared.
export type ProfileInput = {
  enrollmentNo: string;
  branch: string;
  batch: string;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  codechefHandle?: string;
  hackerrankHandle?: string;
};
