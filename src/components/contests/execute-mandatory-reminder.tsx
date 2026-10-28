"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useApi } from "@/lib/use-api";
import { useAccount } from "@/components/account-provider";
import type { ContestDetail } from "@/types/contest";

const REGISTRATION_REMINDER_END = new Date("2026-10-31T14:00:00+05:30").getTime();

export function ExecuteMandatoryReminder() {
  const api = useApi();
  const { account } = useAccount();
  const [open, setOpen] = useState(false);
  const lastRegistered = useRef<boolean | null>(null);
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    if (Date.now() >= REGISTRATION_REMINDER_END) {
      setOpen(false);
      return;
    }
    try {
      const detail = await api<ContestDetail>("/api/contests/execute-26-4");
      if (sequence !== refreshSequence.current) return;
      if (Date.now() >= REGISTRATION_REMINDER_END || !detail.contest.mandatory) {
        setOpen(false);
        return;
      }
      const registered = Boolean(detail.registration);
      if (registered) setOpen(false);
      else if (lastRegistered.current === null || lastRegistered.current) setOpen(true);
      lastRegistered.current = registered;
    } catch {
      // A temporary API failure should not block the dashboard or show an unverified reminder.
    }
  }, [api]);

  useEffect(() => {
    lastRegistered.current = null;
    void refresh();
    const poll = window.setInterval(() => void refresh(), 15_000);
    const onFocus = () => void refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    const onRegistrationChange = () => void refresh();
    const untilDeadline = window.setTimeout(() => setOpen(false), Math.max(0, REGISTRATION_REMINDER_END - Date.now()));
    window.addEventListener("focus", onFocus);
    window.addEventListener("execute-registration-changed", onRegistrationChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(untilDeadline);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("execute-registration-changed", onRegistrationChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [account?.id, refresh]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content execute-reminder-dialog">
          <Dialog.Close className="icon-button dialog-close" aria-label="Close reminder">
            <X size={17} aria-hidden="true" />
          </Dialog.Close>
          <span className="status-pill is-mandatory">MANDATORY</span>
          <Dialog.Title>Register for Execute 26.4</Dialog.Title>
          <Dialog.Description className="execute-reminder-description">
            Execute 26.4 registration is mandatory for you. Please register before 14:00 IST on 31 October 2026.
          </Dialog.Description>
          <div className="execute-reminder-actions">
            <Dialog.Close asChild>
              <Link href="/dashboard/contests/execute-26-4" className="button button-primary">
                View Contest Page
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button type="button" className="button button-secondary">Remind me later</button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
