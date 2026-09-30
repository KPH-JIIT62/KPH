"use client";

import { useProfile } from "@/components/profile-provider";
import { EventShowcase } from "@/components/dashboard/event-showcase";
import { featuredEvent } from "@/fixtures/dashboard";

export default function DashboardPage() {
  const { profile } = useProfile();
  const firstName = profile.displayName.trim().split(/\s+/)[0];
  return (
    <div className="section-page">
      <section className="page-heading">
        <div>
          <span className="eyebrow">WELCOME BACK</span>
          <h1>
            Hello, {firstName}
            <span className="greeting-dot">.</span>
          </h1>
          <p>Here is what is happening at the hub.</p>
        </div>
      </section>
      <EventShowcase event={featuredEvent} />
    </div>
  );
}
