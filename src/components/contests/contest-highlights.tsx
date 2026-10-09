import { Gift, Trophy } from "lucide-react";
import type { Contest } from "@/types/contest";

// The contest's prize pool and goodies as their own visible badges (not hidden inside the description).
// Renders nothing when the contest has neither.
export function ContestHighlights({ contest, compact = false }: { contest: Pick<Contest, "prizePool" | "goodies">; compact?: boolean }) {
  if (!contest.prizePool && !contest.goodies) return null;
  return (
    <ul className={`contest-perks${compact ? " is-compact" : ""}`} aria-label="Contest rewards">
      {contest.prizePool && (
        <li className="contest-perk is-prize">
          <Trophy size={compact ? 14 : 18} aria-hidden="true" /> {contest.prizePool}
        </li>
      )}
      {contest.goodies && (
        <li className="contest-perk is-goodies">
          <Gift size={compact ? 14 : 18} aria-hidden="true" /> {contest.goodies}
        </li>
      )}
    </ul>
  );
}
