"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { PlatformIcon } from "@/components/platform-icon";
import { LockedField } from "@/components/ui/locked-field";
import { SUPPORT_EMAIL } from "@/config/batches";
import type { Account } from "@/types/account";

// Only the HackerRank ID is sent. Year of Study is read from the saved profile by the server; it is never part of the request.
export type RegistrationValues = { hackerrankHandle: string };

// The registration form. Name, enrollment number, batch, branch and Year of Study come from the saved profile and are shown locked:
// the server reads them from the profile too, so they cannot be changed (or faked) here.
export function ContestRegistrationForm({
  account,
  onSubmit,
}: {
  account: Account;
  onSubmit: (values: RegistrationValues) => Promise<void>;
}) {
  const { profile } = account;
  const { yearOfStudyLabel, error: yearError } = profile.academic;
  const savedHandle = profile.hackerrankHandle ?? "";
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
      await onSubmit({ hackerrankHandle });
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
      <LockedField
        id="reg-year"
        label="Year of Study"
        value={yearOfStudyLabel ?? "Unavailable"}
        hint="From your profile · auto-filled"
        error={yearOfStudyLabel ? undefined : yearError ?? `We couldn’t detect your Year of Study. Contact ${SUPPORT_EMAIL}.`}
      />
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
          placeholder="Type your HackerRank Username"
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

      <div className="form-footer">
        <button type="submit" className="button button-primary" disabled={submitting || !yearOfStudyLabel}>
          {submitting ? "Registering…" : "Register team"}
        </button>
        <div role="status" className={`form-message${formError ? " form-error" : ""}`}>
          {formError}
        </div>
      </div>
    </form>
  );
}
