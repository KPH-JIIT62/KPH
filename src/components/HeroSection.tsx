"use client";

import React from "react";
import Image from "next/image";
import {
  CircleCheck,
  Gauge,
  SquareTerminal,
  Timer,
  UserPlus,
} from "lucide-react";
import "./HeroSection.css";

const HeroSection: React.FC = () => {
  return (
    <section className="hero-section">
      <div className="hero-gradient" />
      <div className="hero-glow hero-glow-right" />
      <div className="hero-glow hero-glow-left" />

      <div className="hero-container">
        <div className="hero-grid">
          {/* LEFT */}
          <div className="hero-content">
            <div className="hero-badge">
              <span className="pulse-dot" />
              <span>Algorithmic Excellence &amp; Contest Research</span>
            </div>

            <h1 className="hero-title">
              Knuth Programming Hub
              <span className="hero-title-gradient">
                Elevating Algorithmic Minds
              </span>
            </h1>

            <p className="hero-description">
              The nexus for high-octane competitive programmers, ICPC aspirants,
              and algorithm researchers. Master data structures, dominate global
              scoreboards, and train with elite batch mentors.
            </p>

            <div className="hero-actions">
              <a href="#practice-platforms" className="primary-button">
                <SquareTerminal size={18} aria-hidden="true" />
                <span>Start Practicing</span>
              </a>

              <a href="#cf-onboarding" className="secondary-button">
                <UserPlus size={18} aria-hidden="true" />
                <span>Join CF Group</span>
              </a>

              <div className="latest-status">
                <Timer size={16} aria-hidden="true" className="status-icon" />

                <span>
                  Latest: <strong>Execute 26.1</strong> in 03h 42m
                </span>
              </div>
            </div>

            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-value">500+</div>
                <div className="stat-label">Active Coders</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">120+</div>
                <div className="stat-label">Contests Hosted</div>
              </div>

              <div className="stat-card">
                <div className="stat-value">15k+</div>
                <div className="stat-label">Submissions</div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="runtime-wrapper">
            <div className="runtime-card">
              {/* <div className="runtime-header">
                <div className="runtime-title">
                  <span className="terminal-dot error" />
                  <span className="terminal-dot secondary" />
                  <span className="terminal-dot primary" />

                  <span className="runtime-name">kph-runtime // live-feed</span>
                </div>

                <span className="online-badge">ONLINE</span>
              </div> */}

              <div className="runtime-preview">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_dHjsbqOWtWTBKADMsCK0iU5IjC79rUQC-3BNHpz705CEbgjdt3kXurYuMJH5axa8eyW6rqJHv-fjKzuWpbWma8MSMfOmbOtYCp8sK2tPjiav4eJdWhSOVH9mYMgRjnhvMUO1ZzbXLdV-N8clSqj3mEvC369lKbeGRqm14Z7Py3fYruRVUf42Y9PGpX_SX8bBNY_jaEsQIufKfgnHsw_0IHgG57EriKZ2pg8agLxgv9MItA4ZcAk-"
                  alt="Competitive programming workstation"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                />

                <div className="preview-overlay" />

                <div className="event-info">
                  <div>
                    <span className="event-label">UPCOMING EVENT</span>

                    <span className="event-title">KPH AlgoForge Cup 2025</span>
                  </div>

                  <button className="register-button">Register</button>
                </div>
              </div>

              <div className="runtime-stats">
                <div className="runtime-row">
                  <span className="runtime-row-label">
                    <CircleCheck
                      size={14}
                      aria-hidden="true"
                      className="row-icon primary-icon"
                    />
                    Problem of the Day: Tree DP (1800)
                  </span>

                  <span className="solved">Solved (42)</span>
                </div>

                <div className="runtime-row">
                  <span className="runtime-row-label">
                    <Gauge
                      size={14}
                      aria-hidden="true"
                      className="row-icon secondary-icon"
                    />
                    Avg. Submission Verdict Time
                  </span>

                  <span className="verdict-time">248 ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
