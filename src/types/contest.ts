// Shapes returned by the contests API (Backend/src/services/contestService.js).
export type ContestRegistration = {
  id: string;
  teamName: string;
  hackerrankHandle: string;
  createdAt: string;
};

export type Contest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  startsAt: string | null; // null = date not announced yet
  registrationOpen: boolean;
};

export type ContestSummary = Contest & { registration: ContestRegistration | null };
export type ContestDetail = { contest: Contest; registration: ContestRegistration | null };
