"use client";

import { createContext, useContext, type ReactNode } from "react";
import { previewProfile } from "@/fixtures/dashboard";
import { useLocalPreference } from "@/lib/local-preferences";
import { useAuth } from "@/components/auth-provider";
import type { MemberProfile } from "@/types";

const ProfileContext = createContext<{
  profile: MemberProfile;
  saveProfile: (profile: MemberProfile) => boolean;
} | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stored, setStored] = useLocalPreference("kph-preview-profile");
  let profile = previewProfile;
  try {
    const parsed = stored ? JSON.parse(stored) : null;
    if (
      parsed &&
      typeof parsed.displayName === "string" &&
      parsed.displayName.trim() &&
      parsed.displayName.length <= 60 &&
      ["sage", "blue", "rose"].includes(parsed.avatarColor)
    )
      profile = { ...parsed, displayName: user?.displayName || parsed.displayName, email: user?.email || undefined };
  } catch {
    /* Invalid local preview data uses the default member. */
  }
  if (user) profile = { ...profile, displayName: user.displayName || user.email?.split("@")[0] || "Member", email: user.email || undefined };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        saveProfile: (next) => setStored(JSON.stringify({ ...next, displayName: user?.displayName || next.displayName })),
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context)
    throw new Error("useProfile must be used within ProfileProvider");
  return context;
}

export function MemberAvatar({
  profile,
  large = false,
}: {
  profile: MemberProfile;
  large?: boolean;
}) {
  const initials = profile.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`member-avatar avatar-${profile.avatarColor}${large ? " avatar-large" : ""}`}
    >
      {initials}
    </span>
  );
}
