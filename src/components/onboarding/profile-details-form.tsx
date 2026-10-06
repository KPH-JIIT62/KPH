"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Check } from "lucide-react";
import { ApiError } from "@/lib/api";
import { branchFromBatch } from "@/config/batches";
import { LockedField } from "@/components/ui/locked-field";
import { PlatformIcon, type Platform } from "@/components/platform-icon";
import type { ProfileDetails, ProfileInput } from "@/types/account";

// One form, used twice: first-time onboarding and later edits on the profile page.
// The backend is the single source of truth for the rules; this form just shows its error messages.
// Suggestions only: people can still type another branch. Edit this list to change the suggestions.
const BRANCH_SUGGESTIONS = ["CSE", "IT", "ECE", "R&AI", "Biotechnology", "Mathematics and Computing"];
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
  // "onboarding" = first login: only batch/branch. "profile" = everything, including the coding handles.
  mode?: "onboarding" | "profile";
}) {
  const [values, setValues] = useState<Required<ProfileInput>>({
    enrollmentNo: initial.enrollmentNo ?? "",
    batch: initial.batch ?? "",
    branch: initial.branch ?? "",
    codeforcesHandle: initial.codeforcesHandle ?? "",
    leetcodeHandle: initial.leetcodeHandle ?? "",
    codechefHandle: initial.codechefHandle ?? "",
    hackerrankHandle: initial.hackerrankHandle ?? "",
  });
  // Once the person has typed their own branch (or one was saved earlier), we stop suggesting one from the batch.
  const [branchEdited, setBranchEdited] = useState(Boolean(initial.branch));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Known from the college email (or saved earlier): shown, but cannot be edited.
  const enrollmentLocked = Boolean(initial.enrollmentNo);
  const suggestedBranch = branchFromBatch(values.batch);

  function changeBatch(batch: string) {
    const suggestion = branchFromBatch(batch);
    setValues((v) => ({ ...v, batch, branch: !branchEdited && suggestion ? suggestion : v.branch }));
  }
  function changeBranch(branch: string) {
    setBranchEdited(true);
    setValues((v) => ({ ...v, branch }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    setSaved(false);
    try {
      // In onboarding no handle keys are sent at all, so the server leaves any saved handles untouched.
      await onSubmit(mode === "onboarding" ? { enrollmentNo: values.enrollmentNo, batch: values.batch, branch: values.branch } : values);
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
    extra: { hint?: string; list?: string; onChange?: (value: string) => void } = {},
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
          list={extra.list}
          onChange={(event) => (extra.onChange ? extra.onChange(event.target.value) : setValues({ ...values, [name]: event.target.value }))}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={[extra.hint ? hintId : "", errors[name] ? errorId : ""].filter(Boolean).join(" ") || undefined}
        />
        {extra.hint && <p id={hintId}>{extra.hint}</p>}
        {errors[name] && (
          <p id={errorId} className="form-error" role="alert">
            {errors[name]}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* Batch comes first: the branch is suggested from it. */}
      {field("batch", "Batch", "e.g. B11", { onChange: changeBatch, hint: "Your batch letter and number." })}
      {field("branch", "Branch", "e.g. CSE", {
        list: "branch-options",
        onChange: changeBranch,
        hint: !branchEdited && suggestedBranch && values.branch === suggestedBranch ? "Filled in from your batch. Change it if it’s wrong." : undefined,
      })}
      <datalist id="branch-options">
        {BRANCH_SUGGESTIONS.map((branch) => (
          <option key={branch} value={branch} />
        ))}
      </datalist>
      {enrollmentLocked ? (
        <LockedField
          id="enrollmentNo"
          label="Enrollment number"
          value={initial.enrollmentNo as string}
          hint="Taken from your college email. Ask an organizer if it is wrong."
        />
      ) : (
        field("enrollmentNo", "Enrollment number", "e.g. 9921103001", { hint: "We couldn’t read this from your email, so please type it once." })
      )}
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
