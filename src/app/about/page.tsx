"use client";

import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Code2,
  GraduationCap,
  MessageCircle,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

const objectives = [
  {
    icon: Target,
    title: "Think algorithmically",
    description: "Nurture an algorithmic problem-solving culture across every year.",
  },
  {
    icon: Users,
    title: "Learn together",
    description:
      "Mentor students through peer-led sessions, live discussions, and curated challenges.",
  },
  {
    icon: Trophy,
    title: "Compete globally",
    description:
      "Encourage participation in ICPC, Meta Hacker Cup, Codeforces contests, and more.",
  },
  {
    icon: BookOpen,
    title: "Grow sustainably",
    description:
      "Build a lasting ecosystem for peer-to-peer learning, technical growth, and campus-wide CP engagement.",
  },
];

const regularActivities = [
  {
    icon: CalendarDays,
    title: "Weekly Practice Contests",
    schedule: "Every Saturday",
    description: "Platform-style rated contests curated by the core team.",
  },
  {
    icon: Code2,
    title: "Topic-Wise Deep Dives",
    schedule: "Bi-weekly",
    description: "Focused sessions on Graphs, DP, Number Theory, and other CP topics.",
  },
  {
    icon: MessageCircle,
    title: "Problem-Solving Sessions",
    schedule: "Weekly",
    description: "Peer-led live discussions paired with problems to put ideas into practice.",
  },
];

const bootcamps = [
  {
    icon: GraduationCap,
    title: "CP101 Orientation",
    schedule: "For first-years",
    description: "Introductory sessions to help new students kickstart their CP journey.",
  },
  {
    icon: Code2,
    title: "Summer Training Bootcamp",
    schedule: "June · 3 weeks",
    description: "An intensive program focused on building problem-solving fundamentals.",
  },
  {
    icon: Trophy,
    title: "CodeChef DSA Camp",
    schedule: "July",
    description: "Mentorship and training from external 5★ and 6★ coders.",
  },
  {
    icon: MessageCircle,
    title: "Mentorship Channel",
    schedule: "24×7 on Discord",
    description: "Open guidance and doubt-solving from seniors and alumni.",
  },
];

const achievements = [
  {
    award: "Winner · SIH Grand Finale 2024",
    title: "Smart India Hackathon",
    description:
      "A JIIT team, including Jahnavi Sharma, won for their UIDAI problem statement.",
    mark: "01",
  },
  {
    award: "AIR 82 · Global Rank 879",
    title: "Meta Hacker Cup 2024",
    description: "Ashish Kumar Sajwal earned this result in Round 2.",
    mark: "02",
  },
  {
    award: "Built in 24 hours",
    title: "TesserX Hackathon · JSCOP 7.0",
    description: "Yash Gupta built NeoBotV2, an AI-powered Discord bot.",
    mark: "03",
  },
  {
    award: "1st place",
    title: "Code Ctrl · CICE, JIIT",
    description: "Yash Gupta and Roshan Sharma took the top spot.",
    mark: "04",
  },
];

const futureGoals = [
  "Scale participation in ICPC, Meta Hacker Cup, and AtCoder Grand Contest.",
  "Conduct larger inter-college competitive programming events.",
  "Strengthen alumni mentorship and industry links.",
  "Expand placement and internship preparation through CP rounds.",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

const cardClass =
  "rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] p-6 backdrop-blur-sm";

function AccentBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
      style={{
        backgroundColor: "color-mix(in srgb, #61891f 14%, transparent)",
        color: "#61891f",
      }}
    >
      {children}
    </span>
  );
}

function EventCard({
  icon: Icon,
  title,
  schedule,
  description,
}: {
  icon: LucideIcon;
  title: string;
  schedule: string;
  description: string;
}) {
  return (
    <motion.article
      variants={itemVariants}
      className={`${cardClass} h-full transition-colors duration-200 hover:border-[color-mix(in_srgb,#61891f_45%,var(--border))]`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-lg"
          style={{
            backgroundColor: "color-mix(in srgb, #61891f 12%, transparent)",
            color: "#61891f",
          }}
        >
          <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
        </span>
        <span className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
          {schedule}
        </span>
      </div>
      <h3 className="text-base font-semibold tracking-tight text-[var(--text)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </motion.article>
  );
}

export default function AboutPage() {
  return (
    <main className="px-6 py-12 md:py-16">
      <motion.div
        className="mx-auto max-w-4xl space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header variants={itemVariants} className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, #61891f 13%, transparent), transparent 70%)",
            }}
          />
          <div className="relative">
            <AccentBadge>About Us</AccentBadge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-[var(--text)] sm:text-5xl md:text-6xl">
              KNUTH Programming Hub{" "}
              <span style={{ color: "#61891f" }}>(KPH)</span>
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-[var(--text-secondary)] md:text-lg md:leading-8">
              KNUTH Programming Hub (KPH) is the flagship vertical of the JIIT
              Programming Hub (Dept. of CSE/IT), dedicated to fostering a
              strong culture of Competitive Programming (CP). Named in honor of
              Donald Knuth, the hub focuses on building algorithmic thinking,
              coding proficiency, and preparing students to compete in
              prestigious platforms such as ICPC, Codeforces, CodeChef,
              LeetCode, and AtCoder.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-secondary)] md:text-base">
              Through weekly contests, problem-solving sessions, bootcamps, and
              mentorship, KPH nurtures both beginners and advanced programmers,
              ensuring a collaborative and competitive ecosystem at JIIT.
            </p>
          </div>
        </motion.header>

        <motion.section variants={itemVariants} aria-labelledby="objectives-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#61891f]">
                What drives us
              </p>
              <h2
                id="objectives-title"
                className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)] md:text-3xl"
              >
                Objectives &amp; focus
              </h2>
            </div>
            <Target
              aria-hidden="true"
              className="mb-1 hidden text-[#61891f] sm:block"
              size={24}
              strokeWidth={1.6}
            />
          </div>
          <motion.div
            variants={containerVariants}
            className="grid gap-4 sm:grid-cols-2"
          >
            {objectives.map(({ icon: Icon, title, description }, index) => (
              <motion.article
                key={title}
                variants={itemVariants}
                className={`${cardClass} flex gap-4`}
              >
                <span className="pt-0.5 text-sm font-semibold text-[#61891f]">
                  0{index + 1}
                </span>
                <div>
                  <Icon
                    aria-hidden="true"
                    className="mb-3 text-[#61891f]"
                    size={20}
                    strokeWidth={1.8}
                  />
                  <h3 className="font-semibold text-[var(--text)]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {description}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section variants={itemVariants} aria-labelledby="events-title">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#61891f]">
              Learn by doing
            </p>
            <h2
              id="events-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)] md:text-3xl"
            >
              Regular events
            </h2>
          </div>
          <div className="space-y-8">
            <div>
              <h3 className="mb-4 text-sm font-semibold text-[var(--text-secondary)]">
                Weekly &amp; regular activities
              </h3>
              <motion.div
                variants={containerVariants}
                className="grid gap-4 md:grid-cols-3"
              >
                {regularActivities.map((event) => (
                  <EventCard key={event.title} {...event} />
                ))}
              </motion.div>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold text-[var(--text-secondary)]">
                Bootcamps &amp; mentorship
              </h3>
              <motion.div
                variants={containerVariants}
                className="grid gap-4 sm:grid-cols-2"
              >
                {bootcamps.map((event) => (
                  <EventCard key={event.title} {...event} />
                ))}
              </motion.div>
            </div>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} aria-labelledby="achievements-title">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#61891f]">
              The work speaks
            </p>
            <h2
              id="achievements-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)] md:text-3xl"
            >
              Past achievements
            </h2>
          </div>
          <motion.div
            variants={containerVariants}
            className="grid gap-4 sm:grid-cols-2"
          >
            {achievements.map((achievement) => (
              <motion.article
                key={achievement.title}
                variants={itemVariants}
                className={`${cardClass} relative overflow-hidden`}
              >
                <span
                  aria-hidden="true"
                  className="absolute right-5 top-4 text-4xl font-semibold tracking-tighter text-[color-mix(in_srgb,#61891f_15%,transparent)]"
                >
                  {achievement.mark}
                </span>
                <div className="relative">
                  <AccentBadge>{achievement.award}</AccentBadge>
                  <h3 className="mt-4 pr-10 text-lg font-semibold tracking-tight text-[var(--text)]">
                    {achievement.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {achievement.description}
                  </p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          aria-labelledby="future-title"
          className={`${cardClass} relative overflow-hidden !p-7 md:!p-9`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, #61891f 14%, transparent), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-[#61891f]">
              <ArrowUpRight aria-hidden="true" size={18} />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                Looking ahead
              </p>
            </div>
            <h2
              id="future-title"
              className="mt-4 max-w-2xl text-2xl font-semibold leading-snug tracking-tight text-[var(--text)] md:text-3xl"
            >
              KNUTH Programming Hub continues to drive the CP wave at JIIT
              through mentorship, contests, and collaboration.
            </h2>
            <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {futureGoals.map((goal) => (
                <li
                  key={goal}
                  className="flex items-start gap-3 text-sm leading-6 text-[var(--text-secondary)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[#61891f]"
                  />
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}
