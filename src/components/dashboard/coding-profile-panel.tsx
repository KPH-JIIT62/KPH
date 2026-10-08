"use client";

import { useAccount } from "@/components/account-provider";
import { ProfileDetailsForm } from "@/components/onboarding/profile-details-form";
import { PlatformIcon, platformName, type Platform } from "@/components/platform-icon";
import type { Account, ProfileDetails } from "@/types/account";

const PLATFORMS: { platform: Platform; key: keyof ProfileDetails; url: (handle: string) => string }[] = [
  { platform: "codeforces", key: "codeforcesHandle", url: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}` },
  { platform: "leetcode", key: "leetcodeHandle", url: (h) => `https://leetcode.com/u/${encodeURIComponent(h)}/` },
  { platform: "codechef", key: "codechefHandle", url: (h) => `https://www.codechef.com/users/${encodeURIComponent(h)}` },
  { platform: "hackerrank", key: "hackerrankHandle", url: (h) => `https://www.hackerrank.com/profile/${encodeURIComponent(h)}` },
];
const ROLE_LABEL = { STUDENT: "Student", ORGANIZER: "Organizer", ADMIN: "Admin" } as const;

// Read-only list of what the hub knows about the person (pure display: data in, markup out).
export function ProfileSummary({ account }: { account: Account }) {
  const { profile } = account;
  const links = PLATFORMS.filter((p) => profile[p.key]);
  return (
    <dl className="summary-list">
      <dt>Enrollment number</dt>
      <dd>{profile.enrollmentNo ?? "—"}</dd>
      <dt>Campus</dt>
      <dd>{profile.academic.campusLabel ?? "—"}</dd>
      <dt>Branch</dt>
      <dd>{profile.branch ?? "—"}</dd>
      {profile.batch && (
        <>
          <dt>Batch</dt>
          <dd>{profile.batch}</dd>
        </>
      )}
      <dt>Year of Study</dt>
      <dd>{profile.academic.yearOfStudyLabel ?? "—"}</dd>
      <dt>Role</dt>
      <dd>{ROLE_LABEL[account.role]}</dd>
      <dt>Member since</dt>
      <dd>{new Date(account.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</dd>
      <dt>Coding profiles</dt>
      <dd>
        {links.length ? (
          <span className="summary-links">
            {links.map((p) => {
              const handle = profile[p.key] as string;
              return (
                <a
                  key={p.key}
                  className="platform-link"
                  href={p.url(handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${platformName(p.platform)} profile: ${handle}`}
                  title={`Open ${platformName(p.platform)} profile`}
                >
                  <PlatformIcon platform={p.platform} size={16} />
                  <span>{handle}</span>
                </a>
              );
            })}
          </span>
        ) : (
          "—"
        )}
      </dd>
    </dl>
  );
}

// The summary, then the form to change the details.
export function CodingProfilePanel() {
  const { account, saveProfile } = useAccount();
  if (!account) return null;
  return (
    <div className="section-page">
      <div className="profile-panel">
        <ProfileSummary account={account} />
        <hr className="panel-divider" />
        <ProfileDetailsForm initial={account.profile} submitLabel="Save details" onSubmit={saveProfile} />
      </div>
    </div>
  );
}
