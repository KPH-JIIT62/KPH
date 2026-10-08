import { Lock } from "lucide-react";

// A value the person can see but not change (name from Google, enrollment number from the college email,
// branch and Year of Study detected by the server).
// It is read-only rather than disabled, so the text can still be selected and read by screen readers.
export function LockedField({ id, label, value, hint, error }: { id: string; label: string; value: string; hint?: string; error?: string }) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      <div className="locked-field">
        <input id={id} value={value} readOnly aria-readonly="true" aria-describedby={describedBy} />
        <Lock size={16} aria-hidden="true" />
      </div>
      {hint && <p id={`${id}-hint`}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
