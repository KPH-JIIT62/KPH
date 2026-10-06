import { Lock } from "lucide-react";

// A value the person can see but not change (name from Google, enrollment number from the college email).
// It is read-only rather than disabled, so the text can still be selected and read by screen readers.
export function LockedField({ id, label, value, hint }: { id: string; label: string; value: string; hint?: string }) {
  return (
    <div className="profile-field">
      <label htmlFor={id}>{label}</label>
      <div className="locked-field">
        <input id={id} value={value} readOnly aria-readonly="true" aria-describedby={hint ? `${id}-hint` : undefined} />
        <Lock size={16} aria-hidden="true" />
      </div>
      {hint && <p id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}
