import type { FeaturedEvent, MemberProfile } from "@/types";

// SAMPLE DATA for the design preview. Real contests, teams and results will come from the backend API.

// Shown until the person signs in (profile-provider overrides name/email from the Google account).
export const previewProfile: MemberProfile = {
  displayName: "Preview Member",
  avatarColor: "sage",
};

export const featuredEvent: FeaturedEvent = {
  id: "sample-contest",
  series: "SAMPLE CONTEST SERIES",
  title: "Sample Team Contest",
  badge: "Sample",
  prizePool: "Certificates",
  dateTime: "Saturday, 8:00 PM IST",
  host: { name: "KPH Organizers", team: "Knuth Programming Hub" },
  platform: { name: "Codeforces", url: "https://codeforces.com" },
  summary: {
    lead: "A sample round to preview how a contest appears on your dashboard:",
    highlight: "teams of three",
    body: "solve problems on an external judge, and standings are published afterwards.",
    tail: "This text is placeholder content.",
  },
  stats: [
    { label: "Format", value: "Teams of 3", detail: "one laptop per team" },
    { label: "Duration", value: "2 hours", detail: "6 problems" },
    { label: "Platform", value: "External", detail: "Codeforces gym" },
  ],
  standings: [
    { rank: 1, team: "Team Alpha", members: "A. One, B. Two, C. Three", solved: 6, penalty: 312 },
    { rank: 2, team: "Team Beta", members: "D. Four, E. Five, F. Six", solved: 5, penalty: 268 },
    { rank: 3, team: "Team Gamma", members: "G. Seven, H. Eight, I. Nine", solved: 5, penalty: 341 },
    { rank: 4, team: "Team Delta", members: "J. Ten, K. Eleven, L. Twelve", solved: 4, penalty: 190 },
  ],
  problemCount: 6,
  problemsetUrl: "https://codeforces.com/problemset",
  // `id` must match a [data-scene] selector in globals.css: awards | lab | crowd.
  gallery: [
    { id: "awards", caption: "Certificate preview" },
    { id: "lab", caption: "Contest lab" },
    { id: "crowd", caption: "Participants" },
  ],
  extraPhotos: 0,
};
