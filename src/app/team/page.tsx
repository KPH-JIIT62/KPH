"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Globe,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { useTheme } from "@/components/theme-provider";
import "./team.css";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24" />
    </svg>
  );
}

function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

type RoleCategory = "faculty" | "advisors" | "coordinators" | "volunteers";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  category: "faculty" | "advisors" | "coordinators" | "volunteers";
  image?: string;
  objectPosition?: string;
  quote?: string;
  nameGradient: string;
  specialty?: string;
  roleBadgeColor?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  portfolio?: string;
}

const THEME_NAME_GRADIENT =
  "linear-gradient(135deg, #34d399 0%, #4ade80 50%, #bef264 100%)";

const teamMembers: TeamMember[] = [
  // Faculty Coordinators
  {
    id: "manish-kumar-thakur",
    name: "Manish Kumar Thakur",
    role: "Associate Professor",
    category: "faculty",
    image: "/images/team/manish-kumar-thakur.png",
    objectPosition: "center 22%",
    quote: "Fostering competitive programming culture and research excellence",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Competitive Programming & Mentorship",
    linkedin: "https://www.linkedin.com/in/dr-manish-k-thakur-3a38813b/",
  },
  {
    id: "dr-amitesh",
    name: "Dr. Amitesh",
    role: "Assistant Professor (Grade – II)",
    category: "faculty",
    image: "/images/team/dr-amitesh.png",
    objectPosition: "center 20%",
    quote: "Guiding algorithmic problem solving & technical innovation at JIIT",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Algorithm Design & Research",
    linkedin: "https://www.linkedin.com/in/theamitesh/",
  },
  {
    id: "pratik-srivastava",
    name: "Pratik Srivastava",
    role: "Faculty Coordinator",
    category: "faculty",
    quote: "Department of Computer Science & IT mentorship council",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Systems & Algorithm Guidance",
  },
  {
    id: "ankita-wadhwa",
    name: "Ankita Wadhwa",
    role: "Faculty Coordinator",
    category: "faculty",
    quote: "Guiding competitive programming community initiatives",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Community & Student Initiatives",
  },

  // Senior Advisors
  {
    id: "vaibhav-raj-singh",
    name: "Vaibhav Raj Singh",
    role: "Senior Advisor",
    category: "advisors",
    image: "/images/team/vaibhav-raj-singh.png",
    objectPosition: "center 20%",
    quote: "Code to grow - Live to inspire",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "ICPC & Contest Architecture",
    linkedin: "https://www.linkedin.com/in/vaibhav-raj-singh-/",
  },

  // Coordinators
  {
    id: "priyanshu-gumber",
    name: "Priyanshu Gumber",
    role: "Coordinator (Admin)",
    category: "coordinators",
    image: "/images/team/priyanshu.png",
    objectPosition: "center 15%",
    quote: "Competitive programmer & core lead at Knuth Programming Hub",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Algorithms & Core Lead",
    linkedin: "https://www.linkedin.com/in/priyanshug27/",
  },
  {
    id: "lavanya-rastogi",
    name: "Lavanya Rastogi",
    role: "Coordinator (Management)",
    category: "coordinators",
    image: "/images/team/lavanya-rastogi.png",
    objectPosition: "center 18%",
    quote: "Chill out!",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Operations & Hackathon Strategy",
    linkedin: "https://www.linkedin.com/in/lavanya-rastogi-a39b10320/",
  },
  {
    id: "gaurang-garg",
    name: "Gaurang Garg",
    role: "Coordinator (Problem Setter)",
    category: "coordinators",
    image: "/images/team/gaurang-garg.png",
    objectPosition: "center 15%",
    quote: "Every edge case is a question reality asks your logic",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Setting & Logic Testcases",
    linkedin: "https://www.linkedin.com/in/gaurang-garg-832b46320/?isSelfProfile=true",
  },
  {
    id: "ivy-singh",
    name: "Ivy Singh",
    role: "Coordinator (Admin)",
    category: "coordinators",
    image: "/images/team/ivy-singh.png",
    objectPosition: "center 20%",
    quote: "Systems over willpower.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Contest Admin & Execution",
    linkedin: "https://www.linkedin.com/in/ivysingh99/?isSelfProfile=true",
  },
  {
    id: "pavani-agarwal",
    name: "Pavani Agarwal",
    role: "Coordinator",
    category: "coordinators",
    image: "/images/team/pavani-agarwal.png",
    objectPosition: "center 18%",
    quote: "Code, create, and inspire.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Community & Tech Outreach",
    linkedin: "https://www.linkedin.com/in/pavaniagarwal",
  },
  {
    id: "devansh-agarwal",
    name: "Devansh Agarwal",
    role: "Coordinator",
    category: "coordinators",
    image: "/images/team/devansh-agarwal.png",
    objectPosition: "center 18%",
    quote: "Building logic, solving complexity, and driving innovation.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Tech Operations",
    linkedin: "https://www.linkedin.com/in/devanshagr17",
  },

  // Volunteers
  {
    id: "vardaan-saxena",
    name: "Vardaan Saxena",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/vardaan-saxena.jpg",
    objectPosition: "center 26%",
    quote: "I always build something that I keep wishing someone would make for me.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Full Stack & Creative Engineering",
    linkedin: "https://www.linkedin.com/in/vardaan-saxena-b4b4a4365",
  },
  {
    id: "asti-bajaj",
    name: "Asti Bajaj",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/asti-bajaj.jpg",
    objectPosition: "center 28%",
    quote: "Turning chaos into logic and algorithms into art ",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Algorithms & Math",
    linkedin: "https://www.linkedin.com/in/asti-bajaj/?isSelfProfile=true",
  },
  {
    id: "madhavi",
    name: "Madhavi",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/madhavi.png",
    objectPosition: "center 18%",
    quote: "Too curious to stay ordinary",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Data Structures & Logic",
    linkedin: "https://www.linkedin.com/in/madhavi-3886a7414",
  },
  {
    id: "abhigya-narayan-awasthi",
    name: "Abhigya Narayan Awasthi",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/abhigya-narayan-awasthi.png",
    objectPosition: "center 28%",
    quote: "Still Learning",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Dynamic Programming & Trees",
    linkedin: "https://www.linkedin.com/in/abhigya-narayan-awasthi-ab759030b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  },
  {
    id: "saurav-raj",
    name: "Saurav Raj",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/saurav-raj.png",
    objectPosition: "center 18%",
    quote: "Not every path needs an audience, and not every destination needs an announcement.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Graph Theory & Implementation",
    linkedin: "https://www.linkedin.com/in/rsaurav25?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  },
  {
    id: "bhavya-dua",
    name: "Bhavya Dua",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/bhavya-dua.jpg",
    objectPosition: "center 20%",
    quote: "Create. Explore. Evolve",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Web & Algorithmic Tooling",
    linkedin: "https://www.linkedin.com/in/bhavya-dua-388a03368",
  },
  {
    id: "ojus-kapoor",
    name: "Ojus Kapoor",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/ojus-kapoor.png",
    objectPosition: "center 20%",
    quote: "Life is a mess, but atleast I am not a bug.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Debugging",
    linkedin: "https://www.linkedin.com/in/ojus-kapoor",
  },
  {
    id: "shiv-bajpai",
    name: "Shiv Bajpai",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/shiv-bajpai.png",
    objectPosition: "center 20%",
    quote: "Driven by curiosity, fueled by logic.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "C++ Optimization & Logic",
    linkedin: "https://www.linkedin.com/in/shiv-bajpai-859b7629b?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  },
  {
    id: "shambhavi-sinha",
    name: "Shambhavi Sinha",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/shambhavi-sinha.png",
    objectPosition: "center 18%",
    quote: "Where there’s a will, there’s a way.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Contest Operations & Logistics",
    linkedin: "https://www.linkedin.com/in/shambhavisinha7?utm_source=share_via&utm_content=profile&utm_medium=member_android",
  },
  {
    id: "rishabh-kashyap",
    name: "Rishabh Kashyap",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/rishabh-kashyap.png",
    objectPosition: "center 18%",
    quote: "It's never too late.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/rishabh-kashyap-7b234b2a8",
  },
  {
    id: "krish-aggarwal",
    name: "Krish Aggarwal",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/krish-aggarwal.png",
    objectPosition: "54% 42%",
    quote: "Building with code, driven by innovation",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/krish-aggarwal-b94a82369",
  },
  {
    id: "jayendra-pratap-singh",
    name: "Jayendra Pratap Singh",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/jayendra-pratap-singh.png",
    objectPosition: "center 24%",
    quote: "Stop waiting to be chosen , choose yourself and watch your life changes.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/jayendra-pratap-singh-011182399",
  },
  {
    id: "manas-bajaj",
    name: "Manas Bajaj",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/manas-bajaj.png",
    objectPosition: "center 22%",
    quote: "Passionate about algorithms and building impactful software.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/manas-bajaj-81a153394/",
  },
  {
    id: "kisna-agarwal",
    name: "Kisna Agarwal",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/kisna-agarwal.png",
    objectPosition: "center 18%",
    quote: "Turning curiosity into code, one algorithm at a time.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/kisna-agarwal-575b9a413",
  },
  {
    id: "himesh-rathee",
    name: "Himesh Rathee",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/himesh-rathee.png",
    objectPosition: "center 15%",
    quote: "Consistent effort beats natural talent every single time.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/himeshrathee",
  },
  {
    id: "dev-agarwal",
    name: "Dev Agarwal",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/dev-agarwal.png",
    objectPosition: "center 15%",
    quote: "Silent Thunder",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/dev-agarwal-532067358",
  },
  {
    id: "srajan-sachan",
    name: "Srajan Sachan",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/srajan-sachan.jpg",
    objectPosition: "center 32%",
    quote: "Trust the process, not the pace",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/srajan-sachan-a40617441/",
  },
  {
    id: "aastha-dua",
    name: "Aastha Dua",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/aastha-dua.png",
    objectPosition: "center 15%",
    quote: "To being perfectly imperfect",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/aastha-dua-405882379/",
  },
  {
    id: "vaibhav-sharma",
    name: "Vaibhav Sharma",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/vaibhav-sharma.png",
    objectPosition: "center 22%",
    quote: "Curious learner, algorithmic problem solver.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/vaibhav-sharma57/",
  },
  {
    id: "shreyansh-srivastava",
    name: "Shreyansh Srivastava",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/shreyansh-srivastava.png",
    objectPosition: "center 22%",
    quote: "I am a problem solver. Mostly the ones I create myself.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/shreysriva",
  },
  {
    id: "manya-rastogi",
    name: "Manya Rastogi",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/manya-rastogi.jpg",
    objectPosition: "52% 30%",
    quote: "Sunflower soul. Algorithmic mind.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/manya-rastogi-b08a30380/",
  },
  {
    id: "mudit-singh",
    name: "Mudit Singh",
    role: "Volunteer",
    category: "volunteers",
    image: "/images/team/mudit-singh.png",
    objectPosition: "62% 58%",
    quote: "I speak fluent C++ and broken English.",
    nameGradient: THEME_NAME_GRADIENT,
    specialty: "Problem Solving & Development",
    linkedin: "https://www.linkedin.com/in/notyourmudit",
  },
];

function getInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const { theme, toggleTheme } = useTheme();
  const [activeRole, setActiveRole] = useState<RoleCategory>("faculty");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const themeLabel =
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  // Filter members by the selected category
  const roleMembers = teamMembers.filter((m) => {
    if (activeRole === "faculty") return m.category === "faculty";
    if (activeRole === "advisors") return m.category === "advisors";
    if (activeRole === "coordinators") return m.category === "coordinators";
    if (activeRole === "volunteers") return m.category === "volunteers";
    return false;
  });

  const trackRef = useRef<HTMLDivElement>(null);

  // Reset index to 0 whenever the category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [activeRole]);

  // Smoothly center the active avatar in the scrolling track without scrolling the window
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const activeEl = track.children[selectedIndex] as HTMLElement | undefined;
    if (!activeEl) return;

    const trackWidth = track.clientWidth;
    const elOffsetLeft = activeEl.offsetLeft;
    const elWidth = activeEl.clientWidth;
    const targetScrollLeft = elOffsetLeft - trackWidth / 2 + elWidth / 2;

    track.scrollTo({
      left: Math.max(0, targetScrollLeft),
      behavior: "smooth",
    });
  }, [selectedIndex, activeRole]);

  // Keyboard navigation for fast browsing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (roleMembers.length <= 1) return;
      if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) =>
          prev === 0 ? roleMembers.length - 1 : prev - 1
        );
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) =>
          prev === roleMembers.length - 1 ? 0 : prev + 1
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [roleMembers.length]);

  // Current active spotlight member
  const currentMember =
    roleMembers[selectedIndex] || roleMembers[0] || null;

  // Arrow navigation
  const handlePrev = () => {
    if (roleMembers.length === 0) return;
    setSelectedIndex((prev) =>
      prev === 0 ? roleMembers.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    if (roleMembers.length === 0) return;
    setSelectedIndex((prev) =>
      prev === roleMembers.length - 1 ? 0 : prev + 1
    );
  };

  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (diff > 45) {
      handleNext();
    } else if (diff < -45) {
      handlePrev();
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  const hasAnySocial =
    currentMember &&
    Boolean(
      currentMember.linkedin ||
      currentMember.instagram ||
      currentMember.github ||
      currentMember.portfolio
    );

  return (
    <div className="team-page-wrapper">
      {/* Ambient background glow identical to Login and Contact pages */}
      <div className="team-bg-glow" aria-hidden="true" />

      {/* Cool & Aesthetic "Meet the Team" Hero Section */}
      <header className="team-hero-header">
        <h1 className="team-hero-title">
          Meet the Team
        </h1>
      </header>

      {/* Main Container */}
      <main className="team-container">
        {/* TOP PROFILE SPOTLIGHT CARD (Generous Size & Customized Color Gradients) */}
        {currentMember ? (
          <article
            className="gdg-profile-card"
            key={currentMember.id}
            aria-label={`Profile of ${currentMember.name}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Profile Content Body */}
            <div className="gdg-card-body">
              {/* Circular Avatar on Left with Sleek Glass Border */}
              <div className="gdg-avatar-ring">
                <div className="gdg-avatar-inner">
                  {currentMember.image ? (
                    <img
                      src={currentMember.image}
                      alt={currentMember.name}
                      className="gdg-avatar-img"
                      style={{
                        objectPosition:
                          currentMember.objectPosition || "center 20%",
                      }}
                    />
                  ) : (
                    <div className="gdg-avatar-fallback">
                      <span>{getInitials(currentMember.name)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Details Column */}
              <div className="gdg-profile-info">
                {/* 1. GREETING */}
                <p className="gdg-intro-label">Hi, my name is</p>

                {/* 2. NAME WITH DISTINCT AESTHETIC GRADIENT */}
                <h1
                  className={`gdg-name-heading ${currentMember.name.length > 18 ? "gdg-name-long" : ""
                    }`}
                >
                  <span
                    className="gdg-name-gradient"
                    style={{ backgroundImage: currentMember.nameGradient }}
                  >
                    {currentMember.name}
                  </span>
                </h1>

                {/* 3. BIO / QUOTE */}
                <p className="gdg-bio-text">
                  &quot;{(currentMember.quote || "Competitive programmer & problem solver").replace(/^["“”']+|["“”']+$/g, "").trim()}&quot;
                </p>

                {/* 4. SOCIAL HANDLES (Only verified individual handles) */}
                {hasAnySocial && (
                  <div className="gdg-socials-row">
                    {currentMember.linkedin && (
                      <a
                        href={currentMember.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gdg-social-item gdg-social-linkedin"
                        title={`${currentMember.name}'s LinkedIn profile`}
                      >
                        <span className="gdg-social-icon gdg-social-icon-linkedin">
                          <LinkedinIcon size={16} />
                        </span>
                        <span>{currentMember.name}</span>
                      </a>
                    )}

                    {currentMember.instagram && (
                      <a
                        href={currentMember.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gdg-social-item"
                        title={`${currentMember.name}'s Instagram profile`}
                      >
                        <span className="gdg-social-icon">
                          <InstagramIcon size={16} />
                        </span>
                        <span>Instagram</span>
                      </a>
                    )}

                    {currentMember.github && (
                      <a
                        href={currentMember.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gdg-social-item"
                        title={`${currentMember.name}'s GitHub profile`}
                      >
                        <span className="gdg-social-icon">
                          <GithubIcon size={16} />
                        </span>
                        <span>{currentMember.name}</span>
                      </a>
                    )}

                    {currentMember.portfolio && (
                      <a
                        href={currentMember.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gdg-social-item"
                        title={`${currentMember.name}'s Portfolio`}
                      >
                        <span className="gdg-social-icon">
                          <Globe size={16} />
                        </span>
                        <span>Portfolio</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </article>
        ) : (
          <div className="gdg-advisory-card">
            <div className="gdg-advisory-icon">
              <Award size={28} />
            </div>
            <h2 className="gdg-name-heading">
              <span
                className="gdg-name-gradient"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%)",
                }}
              >
                Senior Advisors
              </span>
            </h2>
            <p className="gdg-bio-text" style={{ maxWidth: "600px", margin: "14px auto 0" }}>
              Senior student advisors and alumni mentoring ICPC regionals,
              contest curation standards, and technical initiatives at KPH.
            </p>
          </div>
        )}

        {/* ROLE SELECTION TABS (Clean text with active underline indicator) */}
        <nav className="gdg-tabs-nav" aria-label="Role Navigation">
          <button
            type="button"
            className={`gdg-tab-button ${activeRole === "faculty" ? "active" : ""
              }`}
            onClick={() => setActiveRole("faculty")}
          >
            Faculty coordinator
          </button>

          <button
            type="button"
            className={`gdg-tab-button ${activeRole === "advisors" ? "active" : ""
              }`}
            onClick={() => setActiveRole("advisors")}
          >
            Senior Advisors
          </button>

          <button
            type="button"
            className={`gdg-tab-button ${activeRole === "coordinators" ? "active" : ""
              }`}
            onClick={() => setActiveRole("coordinators")}
          >
            Coordinators
          </button>

          <button
            type="button"
            className={`gdg-tab-button ${activeRole === "volunteers" ? "active" : ""
              }`}
            onClick={() => setActiveRole("volunteers")}
          >
            Volunteers
          </button>
        </nav>

        {/* BOTTOM CIRCULAR AVATARS CAROUSEL (Zero Square Artifacts) */}
        {roleMembers.length > 0 && (
          <div
            className="gdg-carousel-wrapper"
            aria-label="Member selection carousel"
          >
            <button
              type="button"
              className="gdg-arrow-btn"
              onClick={handlePrev}
              aria-label="Previous member"
              title="Previous"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="gdg-avatars-track" ref={trackRef}>
              {roleMembers.map((member, index) => {
                const isActive = index === selectedIndex;
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`gdg-circle-item ${isActive ? "active" : ""
                      }`}
                    onClick={() => setSelectedIndex(index)}
                    aria-label={`Select ${member.name}`}
                    title={member.name}
                  >
                    <div className="gdg-circle-frame">
                      {member.image ? (
                        <img
                          src={member.image}
                          alt={member.name}
                          className="gdg-circle-photo"
                          style={{
                            objectPosition:
                              member.objectPosition || "center 20%",
                          }}
                        />
                      ) : (
                        <div className="gdg-circle-fallback">
                          <span>{getInitials(member.name)}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="gdg-arrow-btn"
              onClick={handleNext}
              aria-label="Next member"
              title="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
