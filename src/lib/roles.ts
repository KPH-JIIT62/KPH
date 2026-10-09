import type { Account } from "@/types/account";

// The roles to show for a person, in this order: their account role (Student for everyone who signs in with an enrollment
// number), then, only for core team members, "Core Team" and whether they are a Coordinator or a Volunteer.
// All of it comes from the server's response; the browser never decides who has which role.
export type RoleKey = "student" | "organizer" | "admin" | "core-team" | "coordinator" | "volunteer";
export type RoleChip = { key: RoleKey; label: string };

const ACCOUNT_ROLE: Record<Account["role"], RoleChip> = {
  STUDENT: { key: "student", label: "Student" },
  ORGANIZER: { key: "organizer", label: "Organizer" },
  ADMIN: { key: "admin", label: "Admin" },
};
const CORE_TEAM_ROLE: Record<NonNullable<Account["coreTeamRole"]>, RoleChip> = {
  COORDINATOR: { key: "coordinator", label: "Coordinator" },
  VOLUNTEER: { key: "volunteer", label: "Volunteer" },
};

export function rolesOf(account: Pick<Account, "role" | "coreTeamRole">): RoleChip[] {
  const roles = [ACCOUNT_ROLE[account.role]];
  if (account.coreTeamRole) roles.push({ key: "core-team", label: "Core Team" }, CORE_TEAM_ROLE[account.coreTeamRole]);
  return roles;
}
