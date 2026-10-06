"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { PlatformIcon } from "@/components/platform-icon";
import { LockedField } from "@/components/ui/locked-field";
import type { Account } from "@/types/account";

export type RegistrationValues = { teamName: string; hackerrankHandle: string };

// The registration form. Name, enrollment number, batch and branch come from the saved profile and are shown locked:
// the server reads them from the profile too, so they cannot be changed (or faked) here.
export function ContestRegistrationForm({
  account,
  onSubmit,
}: {
  account: Account;
  onSubmit: (values: RegistrationValues) => Promise<void>;
}) {
  const { profile } = account;
  const savedHandle = profile.hackerrankHandle ?? "";
  const [teamName, setTeamName] = useState("");
  const [hackerrankHandle, setHackerrankHandle] = useState(savedHandle);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      await onSubmit({ teamName, hackerrankHandle });
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) setErrors(cause.fields);
      else setFormError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <LockedField id="reg-enrollment" label="Enrollment number" value={profile.enrollmentNo ?? ""} />
      <LockedField id="reg-name" label="Name" value={account.displayName} />
      <LockedField id="reg-batch" label="Batch" value={profile.batch ?? ""} />
      <LockedField id="reg-branch" label="Branch" value={profile.branch ?? ""} />
      <div className="profile-field">
        <label htmlFor="hackerrankHandle">
          <span className="label-with-icon">
            <PlatformIcon platform="hackerrank" size={15} />
            HackerRank ID
          </span>
        </label>
        <input
          id="hackerrankHandle"
          name="hackerrankHandle"
          value={hackerrankHandle}
          placeholder="your_hackerrank_username"
          autoComplete="off"
          maxLength={40}
          onChange={(event) => setHackerrankHandle(event.target.value)}
          aria-invalid={Boolean(errors.hackerrankHandle)}
        />
        {errors.hackerrankHandle && (
          <p id="hackerrankHandle-error" className="form-error" role="alert">
            {errors.hackerrankHandle}
          </p>
        )}
      </div>

      <div className="profile-field">
        <label htmlFor="teamName">Team name</label>
        <input
          id="teamName"
          name="teamName"
          value={teamName}
          placeholder="e.g. Byte Me"
          autoComplete="off"
          maxLength={40}
          onChange={(event) => setTeamName(event.target.value)}
          aria-invalid={Boolean(errors.teamName)}
          aria-describedby={errors.teamName ? "teamName-error" : undefined}
        />
        {errors.teamName && (
          <p id="teamName-error" className="form-error" role="alert">
            {errors.teamName}
          </p>
        )}
      </div>

      <div className="form-footer">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "Registering…" : "Register team"}
        </button>
        <div role="status" className={`form-message${formError ? " form-error" : ""}`}>
          {formError}
        </div>
      </div>
    </form>
  );
}
