export type AdminContest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string | null;
  prizePool: string | null;
  goodies: string | null;
  participationType: "SOLO" | "TEAM";
  minTeamSize: number;
  maxTeamSize: number;
  teamNameRequired?: boolean;
  hackerrankRequired: boolean;
  startsAt: string | null;
  endsAt: string | null;
  registrationStartsAt: string | null;
  registrationClosesAt: string | null;
  registrationStatus: "SOON" | "OPEN" | "CLOSED";
  registrationsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type LeaderboardParticipant = {
  rank: number;
  name: string;
  displayName?: string;
  hackerRankHandle?: string;
  email: string;
  score: number | string;
  enrollmentNo?: string;
  college?: string;
  branch?: string;
  batch?: string;
  campus?: string;
  yearOfStudy?: string;
  solved?: number;
  penalty?: number;
  disqualified?: boolean;
  registered?: boolean;
  problems?: Array<{
    slug?: string;
    name?: string;
    maxScore?: number;
    bestScore?: number;
    solved?: boolean;
    attempts?: number;
    wrongAttempts?: number;
    solveTimeMinutes?: number;
  }>;
  raw?: Record<string, unknown>;
};

export type AdminAccessRecord = {
  id: string;
  identifier: string;
  note: string | null;
  createdAt: string;
  isPermanent?: boolean;
  matchedUser: {
    id: string;
    displayName: string;
    email: string;
    photoUrl: string | null;
    role: string;
  } | null;
};

export type GeneratedCertificate = {
  name: string;
  enrollmentNo: string;
  email: string;
  rank: number;
  score: number | string;
  contest: string;
  date: string;
  certificateType: "Participation";
  filename: string;
  path: string;
  url: string;
  status: string;
};

export type RegisteredCandidate = {
  registrationId: string;
  userId: string;
  displayName: string;
  email: string;
  enrollmentNo: string;
  branch: string;
  batch: string;
  hackerRankHandle: string;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  codechefHandle?: string;
  teamName?: string | null;
  role: string;
  registeredAt: string;
};

export type RegisteredTeamMember = {
  userId: string;
  role: string;
  displayName: string;
  email: string;
  enrollmentNo: string;
  branch: string;
  batch: string;
  hackerRankHandle: string;
  codeforcesHandle?: string;
  leetcodeHandle?: string;
  codechefHandle?: string;
  joinedAt: string;
};

export type RegisteredTeam = {
  teamId: string;
  teamName: string;
  teamHackerRankHandle: string;
  registeredAt: string;
  leaderUserId?: string;
  members: RegisteredTeamMember[];
};

export type ContestRegistrationsResponse = {
  contest: {
    id: string;
    slug: string;
    title: string;
    participationType: "SOLO" | "TEAM";
    venue?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
  };
  isTeamContest: boolean;
  totalCount: number;
  totalIndividualCount: number;
  teams: RegisteredTeam[];
  soloParticipants: RegisteredCandidate[];
  participants: RegisteredCandidate[];
};

