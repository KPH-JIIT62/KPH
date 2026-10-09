"use client";

import { useState } from "react";
import { useAccount } from "@/components/account-provider";
import { hasOwnPunctuation, pickGreeting } from "@/lib/greeting";

// "Good evening, Shreyansh." / "Still up, Shreyansh?" ... a different one on each visit.
// The random number and the time are fixed when the page opens, so the text does not change while you use it.
export function DashboardGreeting() {
  const { account } = useAccount();
  const [seed] = useState(() => Math.random());
  const [openedAt] = useState(() => new Date());
  const greeting = pickGreeting(account?.displayName, openedAt, seed);

  return (
    <section className="page-heading">
      <div>
        <span className="eyebrow">DASHBOARD</span>
        <h1>
          {greeting}
          {!hasOwnPunctuation(greeting) && <span className="greeting-dot">.</span>}
        </h1>
        <p>Here’s what’s coming up at KPH.</p>
      </div>
    </section>
  );
}
