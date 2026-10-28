// Shapes returned by the contests API (Backend/src/services/contestService.js).
export type ContestRegistration = {
  id: string;
  hackerrankHandle: string;
  createdAt: string;
  teamName?: string;
  status?: "ACTIVE" | "WITHDRAWN";
  role?: "LEADER" | "MEMBER";
  members?: Array<{ name: string; enrollmentNo: string; branch: string | null; batch: string | null; role: string }>;
  seatingPlan?: { teamName: string | null; hallName: string | null; labNumber: string | null; systemNumber: string | null; message: string | null };
};

// SOON = "Registrations Opening Soon" (not open yet), OPEN = people can register, CLOSED = too late / switched off.
// The server works this out (including the automatic close at registrationClosesAt), so the browser just displays it.
export type RegistrationStatus = "SOON" | "OPEN" | "CLOSED";
export type ParticipationType = "SOLO" | "TEAM";

export type Contest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string | null; // null = not announced yet
  prizePool: string | null; // e.g. "Prize Pool of ₹6K"; null = none, so no badge is shown
  goodies: string | null; // e.g. "Exciting Goodies"; null = none, so no badge is shown
  participationType?: ParticipationType; // "SOLO" | "TEAM"
  minTeamSize?: number; // 1 - 6
  maxTeamSize?: number; // 1 - 6
  teamNameRequired?: boolean;
  hackerrankRequired?: boolean;
  startsAt: string | null; // null = date not announced yet
  endsAt: string | null;
  registrationStartsAt?: string | null;
  registrationClosesAt: string | null; // null = no deadline set
  registrationStatus: RegistrationStatus;
  registrationOpen: boolean; // same as registrationStatus === "OPEN"
  withdrawalClosesAt: string | null; // 15 minutes before it starts; null while there is no start time
  withdrawalOpen: boolean; // can a registered person still withdraw right now? (decided by the server)
  mandatory?: boolean;
};

export type LeaderboardProblem = {
  slug?: string;
  name?: string;
  maxScore?: number;
  bestScore?: number;
  solved?: boolean;
  attempts?: number;
  wrongAttempts?: number;
  solveTimeMinutes?: number;
};

export type LeaderboardEntry = {
  rank: number;
  displayName: string;
  hackerRankHandle?: string;
  registered?: boolean;
  enrollmentNo?: string;
  branch?: string;
  batch?: string;
  campus?: string;
  yearOfStudy?: string;
  score: number;
  solved?: number;
  penalty?: number;
  disqualified?: boolean;
  email?: string;
  problems?: LeaderboardProblem[];
};

export type ContestLeaderboard = {
  contestSlug: string;
  contestTitle?: string;
  updatedAt?: string;
  totalParticipants: number;
  problems?: Array<{ slug: string; name: string; maxScore: number }>;
  stats?: {
    highestScore?: number;
    averageScore?: number;
    totalSolved?: number;
    winner?: { name: string; score: number; rank: number } | null;
  };
  entries: LeaderboardEntry[];
};

export type ContestSummary = Contest & { registration: ContestRegistration | null };
export type ContestDetail = {
  contest: Contest;
  registration: ContestRegistration | null;
  leaderboard?: ContestLeaderboard | null;
};
