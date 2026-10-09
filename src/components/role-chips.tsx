import { GraduationCap, HandHelping, ShieldCheck, User, Users, type LucideIcon } from "lucide-react";
import { rolesOf, type RoleKey } from "@/lib/roles";
import type { Account } from "@/types/account";

const ICON: Record<RoleKey, LucideIcon> = {
  student: GraduationCap,
  organizer: User,
  admin: ShieldCheck,
  "core-team": Users,
  coordinator: ShieldCheck,
  volunteer: HandHelping,
};

// The person's roles as small rounded tags, the same look as the coding-profile chips on the Profile page.
export function RoleChips({ account }: { account: Pick<Account, "role" | "coreTeamRole"> }) {
  return (
    <ul className="role-chips" aria-label="Your roles">
      {rolesOf(account).map((role) => {
        const Icon = ICON[role.key];
        return (
          <li key={role.key} className={`role-chip is-${role.key}`}>
            <Icon size={13} aria-hidden="true" />
            {role.label}
          </li>
        );
      })}
    </ul>
  );
}
