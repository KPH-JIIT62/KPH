import { LayoutDashboard, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Shows a "Coming soon" dot in the sidebar.
  upcoming?: boolean;
};
export type NavGroup = { label: string; items: NavItem[] };

// A group with a single item is rendered without a heading (see dashboard-shell.tsx).
export const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
];
