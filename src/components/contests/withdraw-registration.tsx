"use client";

import { useState } from "react";
import { ApiError } from "@/lib/api";
import { formatWithdrawalDeadline } from "@/lib/contest-format";
import type { Contest } from "@/types/contest";

// "Withdraw registration": asks for confirmation first, because it cannot be undone from here.
// Whether withdrawing is still possible is decided by the server (contest.withdrawalOpen), so a wrong clock
// on the visitor's phone cannot show a button that would then be refused.
export function WithdrawRegistration({ contest, onWithdraw }: { contest: Contest; onWithdraw: () => Promise<void> }) {
  const [step, setStep] = useState<"idle" | "confirming" | "working">("idle");
  const [error, setError] = useState("");

  // How long before the contest starts withdrawing stops: worked out from the two times the server sent.
  const cutoffMinutes =
    contest.startsAt && contest.withdrawalClosesAt ? Math.round((Date.parse(contest.startsAt) - Date.parse(contest.withdrawalClosesAt)) / 60000) : null;

  if (!contest.withdrawalOpen) {
    return (
      <div className="withdraw-box">
        <p className="panel-help">
          Withdrawing is no longer possible{cutoffMinutes ? `: it closes ${cutoffMinutes} minutes before the contest starts` : ""}.
        </p>
      </div>
    );
  }

  async function confirm() {
    setStep("working");
    setError("");
    try {
      await onWithdraw(); // on success the page swaps this panel for the registration form
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Something went wrong. Please try again.");
      setStep("confirming");
    }
  }

  return (
    <div className="withdraw-box">
      {step === "idle" ? (
        <>
          <div>
            <button type="button" className="button button-secondary" onClick={() => setStep("confirming")}>
              Withdraw registration
            </button>
          </div>
          {contest.withdrawalClosesAt && <p className="panel-help withdraw-note">{formatWithdrawalDeadline(contest.withdrawalClosesAt)}.</p>}
        </>
      ) : (
        <div role="alertdialog" aria-label="Confirm withdrawal">
          <p className="withdraw-question">
            Withdraw from {contest.title}? Your registration will be removed.{" "}
            {contest.registrationStatus === "OPEN"
              ? "You can register again until registration closes."
              : "Registration is no longer open, so you won’t be able to register again."}
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="withdraw-actions">
            <button type="button" className="button button-danger" onClick={confirm} disabled={step === "working"}>
              {step === "working" ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setStep("idle")} disabled={step === "working"}>
              Keep my registration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
