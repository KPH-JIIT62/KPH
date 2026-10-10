// Shapes returned by the sessions API (Backend/src/services/sessionService.js).
import type { RegistrationStatus } from "@/types/contest";

// Nothing about the person is stored on a registration: their details are read from their profile.
export type SessionRegistration = {
  id: string;
  createdAt: string;
};

export type Session = {
  id: string;
  slug: string;
  title: string;
  description: string;
  venue: string | null; // null = not announced yet
  startsAt: string | null; // null = date not announced yet
  endsAt: string | null;
  registrationClosesAt: string | null; // only an explicit deadline; null = open until the session ends
  registrationStatus: RegistrationStatus; // worked out by the server
  registrationOpen: boolean; // same as registrationStatus === "OPEN"
};

export type SessionSummary = Session & { registration: SessionRegistration | null };
export type SessionDetail = { session: Session; registration: SessionRegistration | null };
