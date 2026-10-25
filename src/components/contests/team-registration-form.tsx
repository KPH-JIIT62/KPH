"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, Users, Search, Check } from "lucide-react";
import { ApiError } from "@/lib/api";
import { LockedField } from "@/components/ui/locked-field";
import { PlatformIcon } from "@/components/platform-icon";
import { SUPPORT_EMAIL } from "@/config/batches";
import type { Account } from "@/types/account";
import type { Contest } from "@/types/contest";
import { useApi } from "@/lib/use-api";

type Member = {
  id: string;
  name: string;
  enrollmentNo: string;
  branch: string | null;
  batch: string | null;
  hackerrankHandle?: string | null;
};

type Props = {
  account: Account;
  contest: Contest;
  onSubmit: (values: { teamName: string; hackerrankHandle: string; memberIds: string[] }) => Promise<void>;
};

export function TeamRegistrationForm({ account, contest, onSubmit }: Props) {
  const api = useApi();
  const maxTeamSize = Math.max(1, Math.min(6, contest.maxTeamSize ?? 3));
  const minTeamSize = Math.max(1, Math.min(maxTeamSize, contest.minTeamSize ?? 1));
  const maxAdditionalMembers = maxTeamSize - 1; // Leader is 1
  const hackerrankRequired = contest.slug === "execute-26-4" || contest.hackerrankRequired;

  const [members, setMembers] = useState<(Member | null)[]>([]);
  const [lookups, setLookups] = useState<string[]>([]);
  const [lookupErrors, setLookupErrors] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState<boolean[]>([]);

  const [teamName, setTeamName] = useState("");
  const [hackerrankHandle, setHackerrankHandle] = useState(account.profile.hackerrankHandle ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const profile = account.profile;
  const ready = Boolean(
    account.displayName &&
    profile.enrollmentNo &&
    profile.branch &&
    profile.batch &&
    profile.academic.yearOfStudyLabel
  );

  function handleAddMemberSlot() {
    if (members.length >= maxAdditionalMembers) return;
    setMembers((prev) => [...prev, null]);
    setLookups((prev) => [...prev, ""]);
    setLookupErrors((prev) => [...prev, ""]);
    setIsSearching((prev) => [...prev, false]);
  }

  function handleRemoveMemberSlot(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setLookups((prev) => prev.filter((_, i) => i !== index));
    setLookupErrors((prev) => prev.filter((_, i) => i !== index));
    setIsSearching((prev) => prev.filter((_, i) => i !== index));
  }

  async function searchMember(index: number) {
    const enrollmentNo = lookups[index]?.trim();
    if (!enrollmentNo) return;

    const nextErrors = [...lookupErrors];
    nextErrors[index] = "";
    setLookupErrors(nextErrors);

    const nextSearching = [...isSearching];
    nextSearching[index] = true;
    setIsSearching(nextSearching);

    try {
      const result = await api<{ found: boolean; member?: Member }>(
        `/api/contests/${encodeURIComponent(contest.slug)}/member-search?enrollmentNo=${encodeURIComponent(enrollmentNo)}`
      );

      if (!result.found || !result.member) {
        nextErrors[index] = "No completed KPH student account found with this enrollment number. Ask them to sign in on the website first.";
        setLookupErrors([...nextErrors]);
        return;
      }

      if (
        result.member.id === account.id ||
        members.some((m, i) => i !== index && m?.id === result.member?.id)
      ) {
        nextErrors[index] = "This student is already added to the team or is the team leader.";
        setLookupErrors([...nextErrors]);
        return;
      }

      setMembers((prev) => prev.map((m, i) => (i === index ? result.member! : m)));
    } catch (err) {
      nextErrors[index] = err instanceof ApiError ? err.message : "Could not find member.";
      setLookupErrors([...nextErrors]);
    } finally {
      const resetSearching = [...isSearching];
      resetSearching[index] = false;
      setIsSearching(resetSearching);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");

    const activeMembers = members.filter(Boolean) as Member[];
    const totalTeamCount = 1 + activeMembers.length;

    if (totalTeamCount < minTeamSize) {
      setFormError(`This contest requires at least ${minTeamSize} member(s). Please add more teammates.`);
      setSubmitting(false);
      return;
    }

    const isTeamNameRequired = contest.teamNameRequired !== false;
    const finalTeamName = teamName.trim() || (isTeamNameRequired ? "" : `${account.displayName}'s Team`.slice(0, 80));

    if (isTeamNameRequired && !finalTeamName) {
      setErrors({ teamName: "Team name is required for this contest." });
      setSubmitting(false);
      return;
    }
    if (hackerrankRequired && !hackerrankHandle.trim()) {
      setErrors({ hackerrankHandle: "Team HackerRank ID is required." });
      setSubmitting(false);
      return;
    }

    try {
      await onSubmit({
        teamName: finalTeamName,
        hackerrankHandle: hackerrankHandle.trim(),
        memberIds: activeMembers.map((m) => m.id),
      });
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors(err.fields);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please check fields and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCount = 1 + members.filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Team Size Overview Banner */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-[var(--text)]">
          <Users size={16} className="text-[var(--accent)]" />
          <span>Minimum Team Size {minTeamSize} | Maximum Team Size {maxTeamSize}</span>
        </div>
      </div>

      {/* Team Leader (Current User) */}
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-[var(--text)]">1. Team Leader</h2>
        <p className="text-xs text-[var(--text-secondary)]">Your academic details are auto-filled from your verified college profile.</p>

        <LockedField id="team-leader-name" label="Team Leader Name" value={account.displayName} />
        <div className="grid gap-2 sm:grid-cols-2">
          <LockedField id="team-leader-enrollment" label="Enrollment Number" value={profile.enrollmentNo ?? ""} />
          <LockedField id="team-leader-branch" label="Branch" value={profile.branch ?? ""} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <LockedField id="team-leader-batch" label="Batch" value={profile.batch ?? ""} />
          <LockedField
            id="team-leader-year"
            label="Year of Study"
            value={profile.academic.yearOfStudyLabel ?? "Unavailable"}
            error={profile.academic.yearOfStudyLabel ? undefined : profile.academic.error ?? `Complete your profile or contact ${SUPPORT_EMAIL}.`}
          />
        </div>

        {!ready && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500" role="alert">
            Please complete your enrollment number, branch, and batch in your profile before registering a team.
          </p>
        )}
      </div>

      {/* Team Members Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[var(--text)]">2. Additional Team Members</h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Add up to {maxAdditionalMembers} additional members using their college enrollment number.
            </p>
          </div>

          {members.length < maxAdditionalMembers && (
            <button
              type="button"
              onClick={handleAddMemberSlot}
              className="button button-secondary text-xs"
            >
              <Plus size={14} />
              <span>Add Member ({members.length + 2}/{maxTeamSize})</span>
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
            No additional members added yet. {minTeamSize > 1 ? `(At least ${minTeamSize - 1} more required)` : "(You can compete solo or click Add Member above)"}
          </div>
        ) : (
          members.map((member, index) => (
            <div key={index} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text)]">Member {index + 2}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveMemberSlot(index)}
                  className="inline-flex items-center gap-1 text-xs text-rose-500 hover:underline"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              </div>

              {member ? (
                <div className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] p-3">
                  <div>
                    <div className="font-semibold text-[var(--text)]">{member.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      {member.enrollmentNo} · Batch {member.batch} · {member.branch}
                      {member.hackerrankHandle && ` · HackerRank: @${member.hackerrankHandle}`}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check size={12} /> Verified
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={lookups[index] || ""}
                      placeholder="Enter member's enrollment number (e.g. 2501030xxx)"
                      onChange={(e) => {
                        const val = e.target.value;
                        setLookups((prev) => prev.map((v, i) => (i === index ? val : v)));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void searchMember(index);
                        }
                      }}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                    />
                    <button
                      type="button"
                      disabled={isSearching[index] || !lookups[index]?.trim()}
                      onClick={() => void searchMember(index)}
                      className="button button-secondary shrink-0 text-xs"
                    >
                      <Search size={14} />
                      <span>{isSearching[index] ? "Checking..." : "Verify"}</span>
                    </button>
                  </div>
                  {lookupErrors[index] && (
                    <p className="text-xs text-rose-500" role="alert">
                      {lookupErrors[index]}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Team Info & HackerRank Handle */}
      <div className="space-y-3 pt-2">
        <h2 className="text-sm font-bold text-[var(--text)]">3. Team Identity</h2>

        <div className="profile-field">
          <label htmlFor="teamName" className="font-semibold text-xs text-[var(--text)]">
            Team Name {contest.teamNameRequired !== false ? "*" : <span className="font-normal text-[var(--muted)]">(optional)</span>}
          </label>
          <input
            id="teamName"
            value={teamName}
            maxLength={80}
            required={contest.teamNameRequired !== false}
            placeholder={
              contest.teamNameRequired !== false
                ? "e.g. AlgoWizards, CodeCrafters"
                : `e.g. AlgoWizards (or leave empty to default to ${account.displayName}'s Team)`
            }
            onChange={(e) => setTeamName(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
          />
          {errors.teamName && <p className="form-error text-xs text-rose-500">{errors.teamName}</p>}
        </div>

        <div className="profile-field">
          <label htmlFor="hackerrankHandle" className="flex items-center gap-1 font-semibold text-xs text-[var(--text)]">
            <PlatformIcon platform="hackerrank" size={14} />
            <span>Team / Leader HackerRank ID</span>
            {hackerrankRequired && <span className="text-rose-500">*</span>}
          </label>
          <input
            id="hackerrankHandle"
            value={hackerrankHandle}
            maxLength={40}
            required={hackerrankRequired}
            aria-invalid={Boolean(errors.hackerrankHandle)}
            placeholder="Type HackerRank username"
            onChange={(e) => setHackerrankHandle(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
          />
          {errors.hackerrankHandle && <p className="form-error text-xs text-rose-500">{errors.hackerrankHandle}</p>}
        </div>

        {errors.members && <p className="form-error text-xs text-rose-500">{errors.members}</p>}
      </div>

      {/* Form Submission */}
      <div className="form-footer border-t border-[var(--border)] pt-4">
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting || !ready || (contest.teamNameRequired !== false && !teamName.trim()) || (hackerrankRequired && !hackerrankHandle.trim())}
        >
          {submitting ? "Registering team…" : `Register Team (${selectedCount} members)`}
        </button>
        {formError && (
          <p className="form-error text-xs text-rose-500" role="alert">
            {formError}
          </p>
        )}
      </div>
    </form>
  );
}

