"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { ApiError } from "@/lib/api";
import { SUPPORT_EMAIL, detectBranch } from "@/config/batches";
import { LockedField } from "@/components/ui/locked-field";
import { PlatformIcon, type Platform } from "@/components/platform-icon";
import type { ProfileDetails, ProfileInput } from "@/types/account";

// One form, used twice: first-time onboarding and later edits on the profile page.
// The backend is the single source of truth for the rules; this form just shows its error messages.
// The person types only their BATCH. Campus, branch and Year of Study are detected by the server from the enrollment
// number (+ batch) and shown read-only: there is no way to edit them here, and the request never contains them.
const HANDLE_FIELDS: { name: keyof ProfileInput; platform: Platform; label: string; placeholder: string }[] = [
  { name: "codeforcesHandle", platform: "codeforces", label: "Codeforces handle", placeholder: "your_codeforces_handle" },
  { name: "leetcodeHandle", platform: "leetcode", label: "LeetCode username", placeholder: "your_leetcode_username" },
  { name: "codechefHandle", platform: "codechef", label: "CodeChef username", placeholder: "your_codechef_username" },
  { name: "hackerrankHandle", platform: "hackerrank", label: "HackerRank username", placeholder: "your_hackerrank_username" },
];

export function ProfileDetailsForm({
  initial,
  submitLabel,
  onSubmit,
  mode = "profile",
}: {
  initial: ProfileDetails;
  submitLabel: string;
  onSubmit: (values: ProfileInput) => Promise<void>;
  // "onboarding" = first login: only the batch. "profile" = everything, including the coding handles.
  mode?: "onboarding" | "profile";
}) {
  const [values, setValues] = useState<Required<ProfileInput>>({
    enrollmentNo: initial.enrollmentNo ?? "",
    batch: initial.batch ?? "",
    codeforcesHandle: initial.codeforcesHandle ?? "",
    leetcodeHandle: initial.leetcodeHandle ?? "",
    codechefHandle: initial.codechefHandle ?? "",
    hackerrankHandle: initial.hackerrankHandle ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Known from the college email (or saved earlier): shown, but cannot be edited.
  const enrollmentLocked = Boolean(initial.enrollmentNo);

  // Detected by the server (see AcademicInfo). Shown read-only; only the batch is typed.
  const { academic } = initial;
  const batchCheck = detectBranch(values.batch, academic.batchBranches);
  const batchUnchanged = values.batch.trim().toUpperCase() === (initial.batch ?? "");
  // Someone who already finished onboarding keeps the branch saved on their profile until they change their batch.
  const shownBranch = batchUnchanged && initial.branch ? initial.branch : batchCheck.status === "ok" ? batchCheck.branch : "";
  const batchProblem = errors.batch || (batchCheck.status === "invalid" ? batchCheck.message : "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    setSaved(false);
    // Instant feedback only: the server re-checks all of this and is the one that decides.
    if (mode === "onboarding" && enrollmentLocked) {
      if (academic.yearOfStudy === null) {
        setFormError(academic.error ?? `We couldn’t detect your Year of Study. Contact ${SUPPORT_EMAIL}.`);
        return;
      }
      if (!shownBranch) {
        setErrors({ batch: batchCheck.status === "invalid" ? batchCheck.message : "Enter your batch letter and number, e.g. B11." });
        return;
      }
    }
    setSubmitting(true);
    try {
      // No branch and no Year of Study are ever sent: the server works them out.
      // In onboarding no handle keys are sent at all, so the server leaves any saved handles untouched.
      await onSubmit(mode === "onboarding" ? { enrollmentNo: values.enrollmentNo, batch: values.batch } : values);
      setSaved(true);
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) setErrors(cause.fields);
      else setFormError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function field(
    name: keyof ProfileInput,
    label: ReactNode,
    placeholder: string,
    extra: { hint?: string; error?: string; onChange?: (value: string) => void } = {},
  ) {
    const errorId = `${name}-error`;
    const hintId = `${name}-hint`;
    return (
      <div className="profile-field" key={name}>
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          value={values[name]}
          placeholder={placeholder}
          autoComplete="off"
          maxLength={40}
          onChange={(event) => (extra.onChange ? extra.onChange(event.target.value) : setValues({ ...values, [name]: event.target.value }))}
          aria-invalid={Boolean(extra.error ?? errors[name])}
          aria-describedby={[extra.hint ? hintId : "", extra.error ?? errors[name] ? errorId : ""].filter(Boolean).join(" ") || undefined}
        />
        {extra.hint && <p id={hintId}>{extra.hint}</p>}
        {(extra.error ?? errors[name]) && (
          <p id={errorId} className="form-error" role="alert">
            {extra.error ?? errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {enrollmentLocked ? (
        <LockedField
          id="enrollmentNo"
          label="Enrollment number"
          value={initial.enrollmentNo as string}
          hint="Taken from your college email."
          error={errors.enrollmentNo || academic.error || undefined}
        />
      ) : (
        field("enrollmentNo", "Enrollment number", "e.g. 2501030069", {
          hint: "We couldn’t read this from your email, so please type it once. Your campus, branch and year are detected from it.",
        })
      )}
      <LockedField id="campus" label="Campus" value={academic.campusLabel ?? "—"} hint="Auto-detected from your enrollment number." />
      {field("batch", "Batch", "e.g. B11", {
        onChange: (batch) => {
          setValues((v) => ({ ...v, batch }));
          setErrors((e) => ({ ...e, batch: "" })); // an old server message no longer applies to what is being typed
        },
        hint: `Enter your batch letter and number${Object.keys(academic.batchBranches).length ? ` (batch letters: ${Object.keys(academic.batchBranches).join(", ")})` : ""}.`,
        error: batchProblem || undefined,
      })}
      <LockedField id="branch" label="Branch" value={shownBranch || "—"} hint="Auto-detected from your campus and batch." />
      <LockedField id="yearOfStudy" label="Year of Study" value={academic.yearOfStudyLabel ?? "—"} hint="Auto-detected from your enrollment number." />
      <div className="profile-field">
        <p>
          Think your academic details are incorrect? Contact{" "}
          <a className="link-button" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
      {mode === "profile" && (
        <>
      <fieldset className="profile-field">
        <legend>Coding profiles</legend>
        <p>Optional. Enter just the username, not the profile link.</p>
        {errors.handles && (
          <p className="form-error" role="alert">
            {errors.handles}
          </p>
        )}
      </fieldset>
      {HANDLE_FIELDS.map((f) =>
        field(
          f.name,
          <span className="label-with-icon">
            <PlatformIcon platform={f.platform} size={15} />
            {f.label}
          </span>,
          f.placeholder,
        ),
      )}
        </>
      )}
      <div className="form-footer">
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        <div role="status" className={`form-message${formError ? " form-error" : ""}`}>
          {formError}
          {saved && !formError && (
            <>
              <Check size={16} /> Saved.
            </>
          )}
        </div>
      </div>
    </form>
  );
}
