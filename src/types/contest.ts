// Shapes returned by the contests API (Backend/src/services/contestService.js).
export type ContestRegistration = {
  id: string;
  hackerrankHandle: string;
  createdAt: string;
};

// SOON = "Registrations Opening Soon" (not open yet), OPEN = people can register, CLOSED = too late / switched off.
// The server works this out (including the automatic close at registrationClosesAt), so the browser just displays it.
export type RegistrationStatus = "SOON" | "OPEN" | "CLOSED";

export type Contest = {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string | null; // null = not announced yet
  startsAt: string | null; // null = date not announced yet
  endsAt: string | null;
  registrationClosesAt: string | null; // null = no deadline set
  registrationStatus: RegistrationStatus;
  registrationOpen: boolean; // same as registrationStatus === "OPEN"
};

export type ContestSummary = Contest & { registration: ContestRegistration | null };
export type ContestDetail = { contest: Contest; registration: ContestRegistration | null };
