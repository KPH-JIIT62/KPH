export type MemberProfile = {
  displayName: string;
  email?: string;
  avatarColor: "sage" | "blue" | "rose";
};
export type Standing = {
  rank: number;
  team: string;
  members: string;
  solved: number;
  penalty: number;
};
export type FeaturedEvent = {
  id: string;
  series: string;
  title: string;
  badge: string;
  prizePool: string;
  dateTime: string;
  host: { name: string; team: string };
  platform: { name: string; url: string };
  summary: { lead: string; highlight: string; body: string; tail: string };
  stats: { label: string; value: string; detail: string }[];
  standings: Standing[];
  problemCount: number;
  problemsetUrl: string;
  // `image` is optional until real event photos are uploaded.
  gallery: { id: string; caption: string; image?: string }[];
  extraPhotos: number;
};
export type Resource = {
  name: string;
  description: string;
  url: string;
  mark: string;
  color: string;
  category: "practice" | "tools";
  tag: string;
  level?: string;
  cadence?: string;
  highlights?: string[];
};
