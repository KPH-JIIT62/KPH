"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { LockedField } from "@/components/ui/locked-field";
import { SUPPORT_EMAIL } from "@/config/batches";
import type { Account } from "@/types/account";

// The session registration form has nothing to type: every field is read from the saved profile and shown locked.
// The server reads them from the profile too, so they cannot be changed (or faked) from here; the request has no body at all.
export function SessionRegistrationForm({ account, onSubmit }: { account: Account; onSubmit: () => Promise<void> }) {
  const { profile } = account;
  const { yearOfStudyLabel, error: yearError } = profile.academic;
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await onSubmit();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <LockedField id="session-enrollment" label="Enrollment number" value={profile.enrollmentNo ?? ""} hint="From your profile · auto-filled" />
      <LockedField id="session-name" label="Name" value={account.displayName} />
      <LockedField id="session-batch" label="Batch" value={profile.batch ?? ""} />
      <LockedField id="session-branch" label="Branch" value={profile.branch ?? ""} />
      <LockedField
        id="session-year"
        label="Year of Study"
        value={yearOfStudyLabel ?? "Unavailable"}
        hint="From your profile · auto-filled"
        error={yearOfStudyLabel ? undefined : yearError ?? `We couldn’t detect your Year of Study. Contact ${SUPPORT_EMAIL}.`}
      />
      <div className="profile-field">
        <p>
          Think your academic details are incorrect? Contact{" "}
          <a className="link-button" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>

      <div className="form-footer">
        <button type="submit" className="button button-primary" disabled={submitting || !yearOfStudyLabel}>
          {submitting ? "Registering…" : "Register"}
        </button>
        <div role="status" className={`form-message${formError ? " form-error" : ""}`}>
          {formError}
        </div>
      </div>
    </form>
  );
}
