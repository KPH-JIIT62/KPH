"use client";

import { useState, type FormEvent } from "react";
import { ApiError } from "@/lib/api";
import { LockedField } from "@/components/ui/locked-field";
import { SUPPORT_EMAIL } from "@/config/batches";
import type { Account } from "@/types/account";
import { useApi } from "@/lib/use-api";

type Member = { id: string; name: string; enrollmentNo: string; branch: string | null; batch: string | null };
type Props = { account: Account; onSubmit: (values: { teamName: string; hackerrankHandle: string; memberIds: string[] }) => Promise<void> };

export function ExecuteTeamRegistrationForm({ account, onSubmit }: Props) {
  const api = useApi();
  const [lookup, setLookup] = useState(["", ""]);
  const [selected, setSelected] = useState<(Member | null)[]>([null, null]);
  const [lookupError, setLookupError] = useState(["", ""]);
  const [teamName, setTeamName] = useState("");
  const [hackerrankHandle, setHackerrankHandle] = useState(account.profile.hackerrankHandle ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const profile = account.profile;
  const ready = Boolean(account.displayName && profile.enrollmentNo && profile.branch && profile.batch && profile.academic.yearOfStudyLabel);

  async function search(index: number) {
    const enrollmentNo = lookup[index].trim();
    const nextErrors = [...lookupError]; nextErrors[index] = ""; setLookupError(nextErrors);
    setSelected((prev) => prev.map((m, i) => i === index ? null : m));
    try {
      const result = await api<{ found: boolean; member?: Member }>(`/api/contests/execute-26-4/member-search?enrollmentNo=${encodeURIComponent(enrollmentNo)}`);
      if (!result.found || !result.member) { nextErrors[index] = "No completed KPH account found. Ask them to sign up on the KPH website first."; setLookupError([...nextErrors]); return; }
      if (result.member.id === account.id || selected.some((m, i) => i !== index && m?.id === result.member?.id)) {
        nextErrors[index] = "This person is already selected or is the team leader."; setLookupError([...nextErrors]); return;
      }
      setSelected((prev) => prev.map((m, i) => i === index ? result.member! : m));
    } catch (error) { nextErrors[index] = error instanceof ApiError ? error.message : "Could not search for this member."; setLookupError([...nextErrors]); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setErrors({}); setFormError("");
    try { await onSubmit({ teamName: teamName.trim(), hackerrankHandle: hackerrankHandle.trim(), memberIds: selected.flatMap((m) => m ? [m.id] : []) }); }
    catch (error) { if (error instanceof ApiError && error.fields) setErrors(error.fields); else setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  }

  return <form onSubmit={submit} noValidate>
    <h2>Team leader</h2>
    <p className="panel-help">Your academic details are read from your saved KPH profile.</p>
    <LockedField id="execute-leader-name" label="Team Leader Name" value={account.displayName} />
    <LockedField id="execute-leader-branch" label="Team Leader Branch" value={profile.branch ?? ""} />
    <LockedField id="execute-leader-enrollment" label="Team Leader Enrollment Number" value={profile.enrollmentNo ?? ""} />
    <LockedField id="execute-leader-batch" label="Team Leader Batch" value={profile.batch ?? ""} />
    <LockedField id="execute-leader-year" label="Team Leader Year of Study" value={profile.academic.yearOfStudyLabel ?? "Unavailable"} error={profile.academic.yearOfStudyLabel ? undefined : profile.academic.error ?? `Complete your profile or contact ${SUPPORT_EMAIL}.`} />
    {!ready && <p className="form-error" role="alert">Complete your name, enrollment number, branch, batch, and Year of Study in your profile before registering.</p>}
    <h2>Team members</h2>
    {[0, 1].map((index) => <div className="profile-field" key={index}>
      <label htmlFor={`execute-member-${index}`}>Team Member {index + 2} <span>(optional)</span></label>
      {selected[index] ? <div className="profile-panel"><strong>{selected[index]?.name}</strong><p>{selected[index]?.enrollmentNo} · {selected[index]?.batch} · {selected[index]?.branch}</p><button type="button" className="button button-secondary" onClick={() => setSelected((prev) => prev.map((m, i) => i === index ? null : m))}>Remove</button></div> : <div className="member-search"><input id={`execute-member-${index}`} value={lookup[index]} inputMode="numeric" placeholder="Enrollment number" onChange={(e) => setLookup((prev) => prev.map((v, i) => i === index ? e.target.value : v))} /><button type="button" className="button button-secondary" onClick={() => void search(index)}>Search</button></div>}
      {lookupError[index] && <p className="form-error" role="alert">{lookupError[index]}</p>}
    </div>)}
    <div className="profile-field"><label htmlFor="execute-team-name">Team Name</label><input id="execute-team-name" value={teamName} maxLength={80} onChange={(e) => setTeamName(e.target.value)} />{errors.teamName && <p className="form-error">{errors.teamName}</p>}</div>
    <div className="profile-field"><label htmlFor="execute-hackerrank">Team HackerRank ID</label><input id="execute-hackerrank" value={hackerrankHandle} maxLength={80} onChange={(e) => setHackerrankHandle(e.target.value)} />{errors.hackerrankHandle && <p className="form-error">{errors.hackerrankHandle}</p>}</div>
    {errors.members && <p className="form-error">{errors.members}</p>}
    <div className="form-footer"><button type="submit" className="button button-primary" disabled={submitting || !ready}>{submitting ? "Registering team…" : "Register Team"}</button><p className="form-message form-error" role="status">{formError}</p></div>
  </form>;
}
