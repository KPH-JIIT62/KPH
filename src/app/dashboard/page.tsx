"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="section-page">
      <section className="profile-panel contest-highlight" aria-live="polite">
        <h2>Encode 26.2</h2>
        <Link href="/dashboard/contests/encode-26-2" className="button button-primary contest-highlight-cta">
          Register Now
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
