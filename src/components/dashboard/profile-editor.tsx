"use client";

import { useState, type FormEvent } from "react";
import { Check, Save } from "lucide-react";
import { MemberAvatar, useProfile } from "@/components/profile-provider";
import { LockedField } from "@/components/ui/locked-field";
import type { MemberProfile } from "@/types";

function ProfileForm({
  profile,
  onSave,
}: {
  profile: MemberProfile;
  onSave: (profile: MemberProfile) => void;
}) {
  const [name, setName] = useState(profile.displayName);
  const [color, setColor] = useState(profile.avatarColor);
  const [error, setError] = useState("");
  const draft = { displayName: name.trim() || "Your name", avatarColor: color };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    onSave({ displayName: name.trim(), avatarColor: color });
  }

  return (
    <form onSubmit={submit}>
      <div className="profile-preview">
        <MemberAvatar profile={draft} large />
        <div>
          <strong>{draft.displayName}</strong>
          <p>{profile.email || "Your Google account profile"}</p>
        </div>
      </div>
      <LockedField id="display-name" label="Name" value={name} hint="Taken from your Google account." />
      <p id="name-error" className="form-error" role="alert">
        {error}
      </p>
      <fieldset className="profile-field">
        <legend>Avatar color</legend>
        <div className="avatar-colors">
          {(["sage", "blue", "rose"] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="avatarColor"
                value={value}
                checked={color === value}
                onChange={() => setColor(value)}
              />
              <span className={`color-choice avatar-${value}`} />
              <span className="sr-only">{value}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-footer">
        <button type="submit" className="button button-primary">
          <Save size={16} />
          Save changes
        </button>
      </div>
    </form>
  );
}

export function ProfileEditor() {
  const { profile, saveProfile } = useProfile();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <div className="section-page">
      <div className="profile-panel">
        <ProfileForm
          key={`${profile.displayName}:${profile.avatarColor}`}
          profile={profile}
          onSave={(next) => {
            const saved = saveProfile(next);
            setFailed(!saved);
            setMessage(
              saved
                ? "Your avatar preference has been updated."
                : "Your browser couldn’t save these changes. Please allow local storage and try again.",
            );
          }}
        />
        <div
          role="status"
          className={`form-footer form-message${failed ? " form-error" : ""}`}
        >
          {message && (
            <>
              {!failed && <Check size={16} />}
              {message}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
