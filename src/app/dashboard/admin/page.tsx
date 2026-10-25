"use client";

import { useEffect, useState, useMemo, useCallback, type FormEvent } from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Lock,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Trophy,
  Upload,
  UserPlus,
  Users,
  X,
  XCircle,
  ExternalLink,
  Pencil,
  Save,
} from "lucide-react";
import { useAccount } from "@/components/account-provider";
import { useAuth } from "@/components/auth-provider";
import { useApi } from "@/lib/use-api";
import { ApiError } from "@/lib/api";
import { AppLoader } from "@/components/app-loader";
import type { AdminContest, LeaderboardParticipant, AdminAccessRecord, GeneratedCertificate } from "@/types/admin";

type ActiveTab = "contests" | "certificates" | "access";

const SAMPLE_LEADERBOARD: LeaderboardParticipant[] = [
  { rank: 1, name: "Jayendra Pratap Singh", email: "2501030287@mail.jiit.ac.in", score: 800, solved: 4, penalty: 59, enrollmentNo: "2501030287", branch: "CSE", batch: "B12", hackerRankHandle: "h2501030287" },
  { rank: 2, name: "Vaibhav Sharma", email: "2501030279@mail.jiit.ac.in", score: 600, solved: 3, penalty: 45, enrollmentNo: "2501030279", branch: "CSE", batch: "B12", hackerRankHandle: "h2501030279" },
  { rank: 3, name: "Shreyansh Srivastava", email: "2501030069@mail.jiit.ac.in", score: 400, solved: 2, penalty: 30, enrollmentNo: "2501030069", branch: "IT", batch: "B10", hackerRankHandle: "h2501030069" },
];

const DEFAULT_GMAIL_RELAY_URL =
  "https://script.google.com/macros/s/AKfycbzZGV_zombq6_Xo6n2FTu1qZcVoURtvZPqkTad3b72Uox5NTOBGxxXepFDZlqqLYVAy/exec";

function buildCertificateEmailHtml(candidateName: string, contestTitle: string, dateStr?: string) {
  const firstName = (candidateName || "Participant").trim().split(" ")[0];
  const contest = contestTitle || "KPH Programming Contest";
  const date = dateStr || "24th October 2026";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Certificate: ${contest}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'SF Mono','Fira Code',Consolas,Menlo,monospace;">
<table role="presentation" width="100%" bgcolor="#0a0a0a" style="background:#0a0a0a;">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" style="width:100%;max-width:600px;background:#111111;border:1px solid #2a2f2a;border-radius:10px;overflow:hidden;">
    <tr><td style="background:#1a1d1a;padding:10px 16px;border-bottom:1px solid #2a2f2a;font-size:12px;color:#7d8590;">
      <span style="color:#ff5f56;">&#9679;</span> <span style="color:#ffbd2e;">&#9679;</span> <span style="color:#8dc63f;">&#9679;</span>
      &nbsp;&nbsp;knuth-programming-hub ~ mail
    </td></tr>
    <tr><td align="center" style="background:#000000;padding:28px 20px 20px;">
      <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSkJEHOK8uZi0wRotEefZVakIGcaWBoCQK7SyzeFVyJRuW1UYGJTCIDM0s&amp;s=10" width="170" alt="Knuth Programming Hub" style="display:block;width:170px;max-width:100%;height:auto;border:0;">
    </td></tr>
    <tr><td style="padding:28px 22px 8px;color:#d6dbd6;font-size:14px;line-height:1.7;">
      <div style="font-size:13px;color:#8dc63f;margin-bottom:14px;">$ ./thank_you.sh --user "${candidateName}"</div>
      <table role="presentation" width="100%" style="margin:0 0 20px;background:#0f1f10;border:1px solid #8dc63f;border-radius:8px;">
        <tr>
          <td width="64" align="center" style="padding:16px 0 16px 16px;">
            <table role="presentation"><tr>
              <td align="center" width="36" height="36" bgcolor="#8dc63f" style="width:36px;height:36px;border-radius:50%;background:#8dc63f;color:#000000;font-size:20px;font-weight:700;line-height:36px;">&#10003;</td>
            </tr></table>
          </td>
          <td style="padding:16px 16px 16px 12px;">
            <div style="font-size:20px;font-weight:700;color:#8dc63f;line-height:1.3;">${contest} Executed</div>
            <div style="font-size:12px;color:#9aa59a;margin-top:4px;">Participation recorded &middot; Status: Executed</div>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 14px 0;">Hi <b style="color:#ffffff;">${firstName}</b>,</p>
      <p style="margin:0 0 14px 0;">Thank you for participating in <b style="color:#ffffff;">${contest}</b> on <b style="color:#ffffff;">${date}</b>. Your dedication, problem-solving mindset, and passion for programming made this event a success.</p>
      <div style="background:#161916;border-left:3px solid #8dc63f;padding:12px 14px;margin:16px 0 20px;color:#c0c7c0;font-size:13px;">
        &#128206; <b>Certificate Attached:</b> Your official participation certificate has been generated and attached to this email as a PDF.
      </div>
      <p style="margin:20px 0 0;font-size:13px;color:#9aa59a;">
        Best regards,<br>
        <b style="color:#ffffff;">Knuth Programming Hub</b><br>
        <span style="color:#7d8590;font-size:12px;">JIIT, Noida Sec-62 &middot; <a href="https://kph-jiit.vercel.app" style="color:#8dc63f;text-decoration:none;">kph-jiit.vercel.app</a></span>
      </p>
    </td></tr>
    <tr><td align="center" style="background:#0c0d0c;padding:16px;border-top:1px solid #1f231f;font-size:11px;color:#5b625b;">
      contests &middot; workshops &middot; DSA &middot; repeat
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export default function AdminPage() {
  const { account, status } = useAccount();
  const { user } = useAuth();
  const api = useApi();

  const [activeTab, setActiveTab] = useState<ActiveTab>("contests");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Contests State
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [contestModalOpen, setContestModalOpen] = useState(false);
  const [contestSearch, setContestSearch] = useState("");
  const [contestSubmitting, setContestSubmitting] = useState(false);
  const [newContest, setNewContest] = useState({
    title: "",
    slug: "",
    description: "",
    venue: "",
    contestDate: "",
    contestStartTime: "14:00",
    contestEndTime: "16:00",
    startsAt: "",
    endsAt: "",
    registrationStartsAt: "",
    registrationClosesAt: "",
    registrationStatus: "OPEN" as "OPEN" | "SOON" | "CLOSED",
    prizePool: "",
    goodies: "",
    participationType: "SOLO" as "SOLO" | "TEAM",
    minTeamSize: 1,
    maxTeamSize: 3,
    teamNameRequired: true,
    hackerrankRequired: false,
  });

  // Edit Contest State
  const [editingContest, setEditingContest] = useState<AdminContest | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editContestForm, setEditContestForm] = useState({
    title: "",
    slug: "",
    description: "",
    venue: "",
    contestDate: "",
    contestStartTime: "14:00",
    contestEndTime: "16:00",
    startsAt: "",
    endsAt: "",
    registrationStartsAt: "",
    registrationClosesAt: "",
    registrationStatus: "OPEN" as "OPEN" | "SOON" | "CLOSED",
    prizePool: "",
    goodies: "",
    participationType: "SOLO" as "SOLO" | "TEAM",
    minTeamSize: 1,
    maxTeamSize: 3,
    teamNameRequired: true,
    hackerrankRequired: false,
  });

  // Delete Confirmation States
  const [contestToDelete, setContestToDelete] = useState<AdminContest | null>(null);
  const [contestDeleting, setContestDeleting] = useState(false);
  const [candidateToDelete, setCandidateToDelete] = useState<{ filename: string; name: string } | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<{ index: number; name: string } | null>(null);

  // Certificate / Leaderboard State
  const [selectedContestSlug, setSelectedContestSlug] = useState("");
  const [parsedLeaderboard, setParsedLeaderboard] = useState<LeaderboardParticipant[]>([]);
  const [rawUploadedJson, setRawUploadedJson] = useState<unknown>(null);
  const [generatedCertificates, setGeneratedCertificates] = useState<GeneratedCertificate[]>([]);
  const [certGenerating, setCertGenerating] = useState(false);
  const [leaderboardPublishing, setLeaderboardPublishing] = useState(false);
  const [leaderboardDeleting, setLeaderboardDeleting] = useState(false);
  const [publishedLeaderboardInfo, setPublishedLeaderboardInfo] = useState<{
    exists: boolean;
    totalParticipants?: number;
    updatedAt?: string;
  } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailConfirmModalOpen, setEmailConfirmModalOpen] = useState(false);
  const [emailSuccessResults, setEmailSuccessResults] = useState<{ total: number; sentCount: number; hasSmtp: boolean } | null>(null);
  const [emailStatuses, setEmailStatuses] = useState<Record<string, { status: "SENT" | "FAILED"; reason?: string }>>({});
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [pdfPreviewCandidate, setPdfPreviewCandidate] = useState<GeneratedCertificate | null>(null);
  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Admin Access State
  const [admins, setAdmins] = useState<AdminAccessRecord[]>([]);
  const [newAdminId, setNewAdminId] = useState("");
  const [newAdminNote, setNewAdminNote] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{ id: string; identifier: string; name?: string; note?: string } | null>(null);
  const [adminRevoking, setAdminRevoking] = useState(false);

  // Auto-generate slug as title is typed
  function handleTitleChange(value: string) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setNewContest((prev) => ({ ...prev, title: value, slug }));
  }

  // Load Initial Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [contestsRes, adminsRes] = await Promise.all([
        api<{ contests: AdminContest[] }>("/api/admin/contests"),
        api<{ admins: AdminAccessRecord[] }>("/api/admin/access"),
      ]);
      setContests(contestsRes.contests);
      setAdmins(adminsRes.admins);
      // selectedContestSlug defaults to "" (None), requiring admin to explicitly select a contest
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to load admin data.",
      });
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (account?.role === "ADMIN") {
      void loadData();
    }
  }, [account, loadData]);

  // Check if a leaderboard is published whenever selectedContestSlug changes
  useEffect(() => {
    if (!selectedContestSlug) return;
    let cancelled = false;
    api<{ exists: boolean; leaderboard: any }>(`/api/admin/contests/${encodeURIComponent(selectedContestSlug)}/leaderboard`)
      .then((res) => {
        if (cancelled) return;
        setPublishedLeaderboardInfo(
          res.exists
            ? { exists: true, totalParticipants: res.leaderboard?.totalParticipants, updatedAt: res.leaderboard?.updatedAt }
            : { exists: false }
        );
      })
      .catch(() => {
        if (!cancelled) setPublishedLeaderboardInfo({ exists: false });
      });
    return () => {
      cancelled = true;
    };
  }, [api, selectedContestSlug]);

  // Auto-dismiss success feedback after 5 seconds
  useEffect(() => {
    if (feedback?.type === "success") {
      const timer = setTimeout(() => {
        setFeedback(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Auto-dismiss email success summary banner after 5 seconds
  useEffect(() => {
    if (emailSuccessResults) {
      const timer = setTimeout(() => {
        setEmailSuccessResults(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [emailSuccessResults]);

  // Filtered Contests
  const filteredContests = useMemo(() => {
    return contests.filter((c) =>
      c.title.toLowerCase().includes(contestSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(contestSearch.toLowerCase()) ||
      (c.venue && c.venue.toLowerCase().includes(contestSearch.toLowerCase()))
    );
  }, [contests, contestSearch]);

  const selectedContest = useMemo(() => {
    return contests.find((c) => c.slug === selectedContestSlug);
  }, [contests, selectedContestSlug]);

  // Auth Protection Gate
  if (status === "loading" || loading) return <AppLoader />;
  if (!account || account.role !== "ADMIN") {
    return (
      <div className="section-page py-12 text-center">
        <div className="mx-auto max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
          <ShieldAlert className="mx-auto mb-4 size-12 text-red-500" />
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Admin Access Restricted</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This portal is restricted to authorized Knuth Programming Hub administrators. Your current account ({account?.email}) does not have admin permissions.
          </p>
          <div className="mt-6">
            <Link href="/dashboard" className="button button-primary">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Contests Submissions
  async function handleCreateContest(e: FormEvent) {
    e.preventDefault();
    try {
      setContestSubmitting(true);
      setFeedback(null);

      let startsAt = newContest.startsAt || null;
      let endsAt = newContest.endsAt || null;
      if (newContest.contestDate && newContest.contestStartTime) {
        startsAt = `${newContest.contestDate}T${newContest.contestStartTime}:00+05:30`;
      }
      if (newContest.contestDate && newContest.contestEndTime) {
        endsAt = `${newContest.contestDate}T${newContest.contestEndTime}:00+05:30`;
      }
      const cleanVenueInput = newContest.venue ? newContest.venue.replace(/\s*,\s*/g, ", ").trim() : "";

      const { contest } = await api<{ contest: AdminContest }>("/api/admin/contests", {
        method: "POST",
        body: {
          ...newContest,
          venue: cleanVenueInput,
          startsAt,
          endsAt,
          registrationStartsAt: newContest.registrationStartsAt || null,
          registrationClosesAt: newContest.registrationClosesAt || null,
        },
      });
      setContests((prev) => [contest, ...prev]);
      setContestModalOpen(false);
      setNewContest({
        title: "",
        slug: "",
        description: "",
        venue: "",
        contestDate: "",
        contestStartTime: "14:00",
        contestEndTime: "16:00",
        startsAt: "",
        endsAt: "",
        registrationStartsAt: "",
        registrationClosesAt: "",
        registrationStatus: "OPEN",
        prizePool: "",
        goodies: "",
        participationType: "SOLO",
        minTeamSize: 1,
        maxTeamSize: 3,
        teamNameRequired: true,
        hackerrankRequired: false,
      });
      setFeedback({ type: "success", message: `Contest "${contest.title}" posted successfully!` });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to create contest.",
      });
    } finally {
      setContestSubmitting(false);
    }
  }

  async function handleToggleContestStatus(slug: string, current: "OPEN" | "SOON" | "CLOSED") {
    const nextStatus = current === "OPEN" ? "CLOSED" : "OPEN";
    try {
      const { contest } = await api<{ contest: AdminContest }>(`/api/admin/contests/${slug}`, {
        method: "PATCH",
        body: { registrationStatus: nextStatus },
      });
      setContests((prev) => prev.map((c) => (c.slug === slug ? contest : c)));
      setFeedback({ type: "success", message: `Status for ${contest.title} updated to ${nextStatus}.` });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to update status.",
      });
    }
  }

  function handleOpenEditContest(contest: AdminContest) {
    let contestDate = "";
    let contestStartTime = "14:00";
    let contestEndTime = "16:00";

    if (contest.startsAt) {
      try {
        const d = new Date(contest.startsAt);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          contestDate = `${year}-${month}-${day}`;
          contestStartTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      } catch {
        // ignore date parse errors
      }
    }
    if (contest.endsAt) {
      try {
        const d = new Date(contest.endsAt);
        if (!isNaN(d.getTime())) {
          contestEndTime = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }
      } catch {
        // ignore date parse errors
      }
    }

    const formatForDateTimeLocal = (dateStr: string | null) => {
      if (!dateStr) return "";
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${mins}`;
      } catch {
        return "";
      }
    };

    setEditContestForm({
      title: contest.title,
      slug: contest.slug,
      description: contest.description || "",
      venue: contest.venue || "",
      contestDate,
      contestStartTime,
      contestEndTime,
      startsAt: contest.startsAt || "",
      endsAt: contest.endsAt || "",
      registrationStartsAt: formatForDateTimeLocal(contest.registrationStartsAt),
      registrationClosesAt: formatForDateTimeLocal(contest.registrationClosesAt),
      registrationStatus: contest.registrationStatus,
      prizePool: contest.prizePool || "",
      goodies: contest.goodies || "",
      participationType: contest.participationType || "SOLO",
      minTeamSize: contest.minTeamSize || 1,
      maxTeamSize: contest.maxTeamSize || 3,
      teamNameRequired: contest.teamNameRequired ?? true,
      hackerrankRequired: contest.hackerrankRequired ?? false,
    });
    setEditingContest(contest);
  }

  async function handleUpdateContest(e: FormEvent) {
    e.preventDefault();
    if (!editingContest) return;
    try {
      setEditSubmitting(true);
      setFeedback(null);

      const startsAt = editContestForm.contestDate && editContestForm.contestStartTime
        ? `${editContestForm.contestDate}T${editContestForm.contestStartTime}:00+05:30`
        : (editContestForm.startsAt || editingContest.startsAt || null);

      const endsAt = editContestForm.contestDate && editContestForm.contestEndTime
        ? `${editContestForm.contestDate}T${editContestForm.contestEndTime}:00+05:30`
        : (editContestForm.endsAt || editingContest.endsAt || null);
      const cleanVenueInput = editContestForm.venue ? editContestForm.venue.replace(/\s*,\s*/g, ", ").trim() : "";

      const { contest } = await api<{ contest: AdminContest }>(`/api/admin/contests/${editingContest.slug}`, {
        method: "PATCH",
        body: {
          title: editContestForm.title,
          description: editContestForm.description,
          venue: cleanVenueInput,
          prizePool: editContestForm.prizePool,
          goodies: editContestForm.goodies,
          participationType: editContestForm.participationType,
          minTeamSize: editContestForm.minTeamSize,
          maxTeamSize: editContestForm.maxTeamSize,
          teamNameRequired: editContestForm.teamNameRequired,
          hackerrankRequired: editContestForm.hackerrankRequired,
          startsAt,
          endsAt,
          registrationStartsAt: editContestForm.registrationStartsAt || null,
          registrationClosesAt: editContestForm.registrationClosesAt || null,
          registrationStatus: editContestForm.registrationStatus,
        },
      });

      setContests((prev) =>
        prev.map((c) => (c.slug === editingContest.slug ? { ...c, ...contest } : c))
      );
      setEditingContest(null);
      setFeedback({ type: "success", message: `Contest "${contest.title}" updated successfully.` });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to update contest.",
      });
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDeleteContest(slug: string, title: string) {
    try {
      setContestDeleting(true);
      await api(`/api/admin/contests/${slug}`, { method: "DELETE" });
      setContests((prev) => prev.filter((c) => c.slug !== slug));
      setFeedback({ type: "success", message: `Contest "${title}" deleted.` });
      setContestToDelete(null);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to delete contest.",
      });
    } finally {
      setContestDeleting(false);
    }
  }

  // Leaderboard & Certificates
  function handleJsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedContestSlug) {
      setFeedback({ type: "error", message: "Please select a contest from the dropdown (1. Select Contest) first." });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      processJsonContent(content);
    };
    reader.readAsText(file);
  }

  function processJsonContent(content: string) {
    if (!selectedContestSlug) {
      setFeedback({ type: "error", message: "Please select a contest from the dropdown (1. Select Contest) first." });
      return;
    }
    try {
      setFeedback(null);
      const data = JSON.parse(content);
      setRawUploadedJson(data);
      const rawList: Record<string, unknown>[] = Array.isArray(data)
        ? data
        : (data.leaderboard || data.standings || data.rows || data.models || data.results || data.participants || []);

      if (!rawList.length) {
        throw new Error("No participant rows found in the uploaded JSON.");
      }

      const normalized: LeaderboardParticipant[] = rawList.map((item: Record<string, unknown>, idx: number) => {
        const rank = Number(item.rank ?? item.position ?? idx + 1);
        const name = String(item.displayName ?? item.name ?? item.hacker ?? item.username ?? `Student #${rank}`).trim();
        const hackerRankHandle = String(item.hackerRankHandle ?? item.hacker ?? item.username ?? "").trim();
        let enrollmentNo = String(item.enrollmentNo ?? item.enrollment_no ?? item.enrollment ?? "").trim();
        if (!enrollmentNo && hackerRankHandle) {
          const m = hackerRankHandle.match(/^h?(\d{8,12})$/i);
          if (m) enrollmentNo = m[1];
        }
        const email = String(item.email ?? item.gmail ?? "").trim().toLowerCase();
        const score = typeof item.score === "number" ? item.score : typeof item.points === "number" ? item.points : Number(item.score) || 0;
        const branch = String(item.branch ?? "").trim();
        const batch = String(item.batch ?? "").trim();
        const campus = String(item.campus ?? "").trim();
        const yearOfStudy = String(item.yearOfStudy ?? "").trim();
        const solved = typeof item.solved === "number" ? item.solved : (Array.isArray(item.problems) ? item.problems.filter((p: any) => p?.solved).length : 0);
        const penalty = typeof item.penalty === "number" ? item.penalty : 0;
        const disqualified = Boolean(item.disqualified);
        const registered = item.registered !== undefined ? Boolean(item.registered) : Boolean(enrollmentNo);
        const problems = Array.isArray(item.problems) ? (item.problems as any[]) : [];

        return {
          rank,
          name,
          displayName: name,
          hackerRankHandle,
          email: email || (enrollmentNo ? `${enrollmentNo}@mail.jiit.ac.in` : ""),
          score,
          enrollmentNo,
          branch,
          batch,
          campus,
          yearOfStudy,
          solved,
          penalty,
          disqualified,
          registered,
          problems,
          raw: item,
        };
      }).sort((a, b) => a.rank - b.rank);

      setParsedLeaderboard(normalized);
      setFeedback({ type: "success", message: `Parsed ${normalized.length} participants from leaderboard.` });
    } catch (err: unknown) {
      setFeedback({ type: "error", message: `Invalid JSON format: ${err instanceof Error ? err.message : String(err)}` });
      setParsedLeaderboard([]);
      setRawUploadedJson(null);
    }
  }

  function loadSampleLeaderboard() {
    if (!selectedContestSlug) {
      setFeedback({ type: "error", message: "Please select a contest from the dropdown (1. Select Contest) first." });
      return;
    }
    const sample = JSON.stringify(SAMPLE_LEADERBOARD, null, 2);
    processJsonContent(sample);
  }

  async function handlePublishLeaderboard() {
    if (!selectedContestSlug) {
      setFeedback({ type: "error", message: "Please select a contest to publish leaderboard for." });
      return;
    }
    if (!parsedLeaderboard.length) {
      setFeedback({ type: "error", message: "Please upload or load a leaderboard before publishing." });
      return;
    }
    try {
      setLeaderboardPublishing(true);
      setFeedback(null);
      const res = await api<{ ok: boolean; slug: string; contestTitle: string; totalParticipants: number; updatedAt: string }>(
        `/api/admin/contests/${encodeURIComponent(selectedContestSlug)}/leaderboard`,
        {
          method: "POST",
          body: { data: rawUploadedJson || parsedLeaderboard },
        }
      );
      setPublishedLeaderboardInfo({
        exists: true,
        totalParticipants: res.totalParticipants,
        updatedAt: res.updatedAt,
      });
      setFeedback({
        type: "success",
        message: `Successfully posted official leaderboard for "${res.contestTitle}" (${res.totalParticipants} participants)! Live on contest page when ended.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to publish leaderboard.",
      });
    } finally {
      setLeaderboardPublishing(false);
    }
  }

  async function handleDeletePublishedLeaderboard() {
    if (!selectedContestSlug) return;
    try {
      setLeaderboardDeleting(true);
      setFeedback(null);
      await api(`/api/admin/contests/${encodeURIComponent(selectedContestSlug)}/leaderboard`, {
        method: "DELETE",
      });
      setPublishedLeaderboardInfo({ exists: false });
      setFeedback({
        type: "success",
        message: `Leaderboard removed for contest ${selectedContestSlug}.`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to delete leaderboard.",
      });
    } finally {
      setLeaderboardDeleting(false);
    }
  }

  async function handleGenerateCertificates() {
    if (!selectedContestSlug) {
      setFeedback({ type: "error", message: "Please select a contest from the dropdown (1. Select Contest) before generating certificates." });
      return;
    }
    if (!parsedLeaderboard.length) {
      setFeedback({ type: "error", message: "Please upload or load a leaderboard before generating certificates." });
      return;
    }
    try {
      setCertGenerating(true);
      setFeedback(null);
      const res = await api<{
        success: boolean;
        contestTitle: string;
        date: string;
        processedCount: number;
        certificates: GeneratedCertificate[];
      }>("/api/admin/certificates/generate", {
        method: "POST",
        body: {
          contestSlug: selectedContestSlug,
          recipients: parsedLeaderboard,
        },
      });
      setGeneratedCertificates(res.certificates);
      setFeedback({
        type: "success",
        message: `Successfully generated ${res.processedCount} Participation Certificate(s) for "${res.contestTitle}" using cert_gen!`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to generate certificates.",
      });
    } finally {
      setCertGenerating(false);
    }
  }

  async function handleSendCertificatesEmail() {
    if (!generatedCertificates.length) {
      setFeedback({ type: "error", message: "No generated certificates to send. Please click 'Generate Certificates' first." });
      return;
    }
    try {
      setEmailSending(true);
      setFeedback(null);

      const token = user ? await user.getIdToken() : "";
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(/\/$/, "");
      const relayUrl = (process.env.NEXT_PUBLIC_GMAIL_RELAY_URL || DEFAULT_GMAIL_RELAY_URL).trim();

      const currentContest = contests.find((c) => c.slug === selectedContestSlug);
      const contestTitle = currentContest?.title || "KPH Programming Contest";

      let sentCount = 0;
      let failedCount = 0;
      const updatedStatuses: Record<string, { status: "SENT" | "FAILED"; reason?: string }> = {};

      for (const cert of generatedCertificates) {
        const emailKey = cert.email.trim().toLowerCase();

        try {
          // 1. Fetch certificate PDF blob from backend
          const pdfRes = await fetch(`${apiUrl}/api/admin/certificates/pdf/${encodeURIComponent(cert.filename)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (!pdfRes.ok) {
            throw new Error(`Failed to load certificate PDF (${pdfRes.status})`);
          }

          const blob = await pdfRes.blob();
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = reader.result as string;
              resolve(res.includes(",") ? res.split(",")[1] : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // 2. Dispatch directly via Google Apps Script HTTPS Relay
          // Running directly from browser guarantees residential/client IP, bypassing cloud datacenter WAF blocks
          const htmlBody = buildCertificateEmailHtml(cert.name, contestTitle, cert.date);
          const emailSubject = `Knuth Programming Hub ~ Certificate: ${contestTitle}`;

          const dispatchRes = await fetch(relayUrl, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
              to: cert.email,
              subject: emailSubject,
              htmlBody: htmlBody,
              attachments: [
                {
                  filename: cert.filename,
                  content: base64Data,
                  type: "application/pdf",
                },
              ],
            }),
          });

          if (!dispatchRes.ok) {
            throw new Error(`Google Relay responded with HTTP ${dispatchRes.status}`);
          }

          const resData = await dispatchRes.json().catch(() => ({ success: true }));
          if (resData && resData.success === false) {
            throw new Error(resData.error || "Google Apps Script returned failure");
          }

          sentCount++;
          const sentEntry = { status: "SENT" as const };
          if (emailKey) updatedStatuses[emailKey] = sentEntry;
          if (cert.filename) updatedStatuses[cert.filename] = sentEntry;
          if (cert.name) updatedStatuses[cert.name.trim().toLowerCase()] = sentEntry;
          setEmailStatuses((prev) => ({ ...prev, ...updatedStatuses }));
        } catch (itemErr: unknown) {
          failedCount++;
          const errReason = itemErr instanceof Error ? itemErr.message : "Delivery failed";
          const failedEntry = { status: "FAILED" as const, reason: errReason };
          if (emailKey) updatedStatuses[emailKey] = failedEntry;
          if (cert.filename) updatedStatuses[cert.filename] = failedEntry;
          if (cert.name) updatedStatuses[cert.name.trim().toLowerCase()] = failedEntry;
          setEmailStatuses((prev) => ({ ...prev, ...updatedStatuses }));
        }
      }

      setEmailStatuses((prev) => ({ ...prev, ...updatedStatuses }));

      if (sentCount > 0) {
        setEmailSuccessResults({
          total: generatedCertificates.length,
          sentCount: sentCount,
          hasSmtp: true,
        });
        setFeedback({
          type: "success",
          message:
            failedCount > 0
              ? `Successfully dispatched certificates via email to ${sentCount} candidate(s)! (${failedCount} candidate(s) failed or had invalid email)`
              : `Successfully sent certificates via email to all ${sentCount} candidate(s)!`,
        });
      } else {
        const failureReason = Object.values(updatedStatuses)[0]?.reason || "All candidate deliveries failed.";
        setFeedback({
          type: "error",
          message: `Email dispatch failed: ${failureReason}`,
        });
      }
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send certificates via email.",
      });
    } finally {
      setEmailSending(false);
    }
  }

  function confirmRemoveCandidate() {
    if (!candidateToDelete) return;
    const { filename, name } = candidateToDelete;
    setGeneratedCertificates((prev) => prev.filter((c) => c.filename !== filename));
    setFeedback({ type: "success", message: `Removed "${name}" from the certificates list.` });
    setCandidateToDelete(null);
  }

  function confirmRemoveParticipant() {
    if (!participantToDelete) return;
    const { index, name } = participantToDelete;
    setParsedLeaderboard((prev) => prev.filter((_, idx) => idx !== index));
    setFeedback({ type: "success", message: `Removed "${name}" from the leaderboard list.` });
    setParticipantToDelete(null);
  }

  async function handlePreviewPdf(cert: GeneratedCertificate) {
    try {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
      }
      setPdfPreviewCandidate(cert);
      setPdfPreviewModalOpen(true);
      setPdfLoading(true);

      const token = user ? await user.getIdToken() : "";
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(/\/$/, "");
      const res = await fetch(`${apiUrl}/api/admin/certificates/pdf/${encodeURIComponent(cert.filename)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error("Could not load certificate PDF. Please ensure the certificate file exists.");
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(objectUrl);
    } catch (err: unknown) {
      setFeedback({ type: "error", message: err instanceof Error ? err.message : "Failed to preview certificate." });
    } finally {
      setPdfLoading(false);
    }
  }

  function handleClosePdfModal() {
    setPdfPreviewModalOpen(false);
    setPdfPreviewCandidate(null);
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }

  // Admin Access Submissions
  async function handleAddAdmin(e: FormEvent) {
    e.preventDefault();
    if (!newAdminId.trim()) return;
    try {
      setAdminSubmitting(true);
      setFeedback(null);
      const { admin } = await api<{ admin: AdminAccessRecord }>("/api/admin/access", {
        method: "POST",
        body: { identifier: newAdminId.trim(), note: newAdminNote.trim() },
      });
      setAdmins((prev) => [admin, ...prev.filter((a) => a.identifier.toLowerCase() !== admin.identifier.toLowerCase())]);
      setNewAdminId("");
      setNewAdminNote("");
      setFeedback({ type: "success", message: `Admin access granted to "${admin.identifier}".` });
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to add admin.",
      });
    } finally {
      setAdminSubmitting(false);
    }
  }

  function isPermanentAdmin(adm: AdminAccessRecord) {
    if (adm.isPermanent) return true;
    const clean = adm.identifier.toLowerCase().trim();
    return clean === "2501030287@mail.jiit.ac.in" || clean === "2501030287";
  }

  async function handleConfirmRevokeAdmin() {
    if (!adminToDelete) return;
    try {
      setAdminRevoking(true);
      await api(`/api/admin/access/${adminToDelete.id}`, { method: "DELETE" });
      setAdmins((prev) => prev.filter((a) => a.id !== adminToDelete.id));
      setFeedback({ type: "success", message: `Admin access revoked for "${adminToDelete.identifier}".` });
      setAdminToDelete(null);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof ApiError ? err.message : "Failed to revoke admin access.",
      });
    } finally {
      setAdminRevoking(false);
    }
  }

  return (
    <div className="section-page py-6">
      {/* Top Banner */}
      <div className="mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--text)] sm:text-3xl">Admin Center</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)]">
              <ShieldCheck size={13} />
              ADMIN
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage competitive programming contests, process leaderboard certificates, and configure administrative access.
          </p>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 flex items-center justify-between rounded-lg p-4 text-sm font-medium ${
            feedback.type === "success"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => setActiveTab("contests")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "contests"
              ? "border-[var(--accent)] text-[var(--text)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          <Trophy size={16} />
          Contests Management
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {contests.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("certificates")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "certificates"
              ? "border-[var(--accent)] text-[var(--text)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          <Award size={16} />
          Leaderboard & Certificates
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("access")}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
            activeTab === "access"
              ? "border-[var(--accent)] text-[var(--text)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
          }`}
        >
          <Users size={16} />
          Admin Access IDs
          <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
            {admins.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CONTESTS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === "contests" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search contests..."
                value={contestSearch}
                onChange={(e) => setContestSearch(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setContestModalOpen(true)}
              className="button button-primary"
            >
              <Plus size={16} />
              <span>Post New Contest</span>
            </button>
          </div>

          {/* Contests Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Contest</th>
                    <th className="px-4 py-3 font-semibold">Schedule (IST)</th>
                    <th className="px-4 py-3 font-semibold">Venue</th>
                    <th className="px-4 py-3 font-semibold">Highlights</th>
                    <th className="px-4 py-3 font-semibold">Registrations</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredContests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                        No contests found. Click &quot;Post New Contest&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredContests.map((contest) => (
                      <tr key={contest.id} className="hover:bg-[var(--surface-hover)]">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-[var(--text)]">{contest.title}</div>
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--muted)]">
                            <span>/contests/{contest.slug}</span>
                            <span>•</span>
                            {contest.participationType === "TEAM" ? (
                              <span className="inline-flex items-center gap-0.5 font-sans font-semibold text-[var(--accent)]">
                                <Users size={11} /> Team (up to {contest.maxTeamSize})
                              </span>
                            ) : (
                              <span className="font-sans font-medium text-[var(--text-secondary)]">Solo</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                          {contest.startsAt ? (
                            <div className="space-y-0.5">
                              <div>{new Date(contest.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                              <div className="text-[10px] text-[var(--muted)]">
                                {new Date(contest.startsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                {contest.endsAt && ` – ${new Date(contest.endsAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                              </div>
                            </div>
                          ) : (
                            <span className="italic text-[var(--muted)]">TBA</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                          {contest.venue ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} className="text-[var(--muted)]" />
                              {contest.venue}
                            </span>
                          ) : (
                            <span className="italic text-[var(--muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-1">
                            {contest.prizePool && (
                              <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                {contest.prizePool}
                              </span>
                            )}
                            {contest.goodies && (
                              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                {contest.goodies}
                              </span>
                            )}
                            {!contest.prizePool && !contest.goodies && <span className="text-[var(--muted)]">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-[var(--text)]">{contest.registrationsCount}</span>
                          <span className="text-[var(--muted)]"> registered</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                              contest.registrationStatus === "OPEN"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : contest.registrationStatus === "SOON"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {contest.registrationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditContest(contest)}
                              title="Edit Contest"
                              aria-label="Edit Contest"
                              className="rounded border border-[var(--border)] p-1.5 text-[var(--accent)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)]"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleContestStatus(contest.slug, contest.registrationStatus)}
                              title={contest.registrationStatus === "OPEN" ? "Close Registration" : "Open Registration"}
                              className="rounded border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                            >
                              <RefreshCw size={13} />
                            </button>
                            <Link
                              href={`/dashboard/contests/${contest.slug}`}
                              target="_blank"
                              title="View Public Page"
                              className="rounded border border-[var(--border)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                            >
                              <ExternalLink size={13} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setContestToDelete(contest)}
                              title="Delete Contest"
                              aria-label="Delete Contest"
                              className="rounded border border-rose-500/30 p-1.5 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Contest Modal */}
          {contestModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-[var(--accent)]" />
                    <h2 className="text-lg font-bold text-[var(--text)]">Post New Contest</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContestModalOpen(false)}
                    className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateContest} className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Contest Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AlgoBlitz 2026"
                        value={newContest.title}
                        onChange={(e) => handleTitleChange(e.target.value)}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">URL Slug *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. algoblitz-2026"
                        value={newContest.slug}
                        onChange={(e) => setNewContest({ ...newContest, slug: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                  </div>

                  {/* Participation Mode (Solo vs Team) */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
                    <label className="mb-2 block font-bold text-[var(--text)]">Participation Format *</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                          newContest.participationType === "SOLO"
                            ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--border)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="participationType"
                          value="SOLO"
                          checked={newContest.participationType === "SOLO"}
                          onChange={() =>
                            setNewContest({
                              ...newContest,
                              participationType: "SOLO",
                              minTeamSize: 1,
                              maxTeamSize: 1,
                            })
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-[var(--text)]">Solo (Individual)</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Single student per registration</div>
                        </div>
                      </label>

                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                          newContest.participationType === "TEAM"
                            ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--border)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="participationType"
                          value="TEAM"
                          checked={newContest.participationType === "TEAM"}
                          onChange={() =>
                            setNewContest({
                              ...newContest,
                              participationType: "TEAM",
                              minTeamSize: 1,
                              maxTeamSize: 3,
                            })
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-[var(--text)]">Team Contest</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Allow 1 to up to 6 members in a team</div>
                        </div>
                      </label>
                    </div>

                    {/* Team Size Configuration */}
                    {newContest.participationType === "TEAM" && (
                      <div className="mt-3.5 grid gap-3 border-t border-[var(--border)] pt-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-1 block font-semibold text-[var(--text)]">Max Team Size</label>
                          <select
                            value={newContest.maxTeamSize}
                            onChange={(e) => {
                              const max = Number(e.target.value);
                              setNewContest({
                                ...newContest,
                                maxTeamSize: max,
                                minTeamSize: Math.min(newContest.minTeamSize, max),
                              });
                            }}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                          >
                            <option value={2}>Up to 2 Members (Pairs)</option>
                            <option value={3}>Up to 3 Members (ICPC / Standard)</option>
                            <option value={4}>Up to 4 Members</option>
                            <option value={5}>Up to 5 Members</option>
                            <option value={6}>Up to 6 Members (Large Team)</option>
                          </select>
                          <span className="mt-1 block text-[10px] text-[var(--muted)]">Leader + up to {newContest.maxTeamSize - 1} members</span>
                        </div>

                        <div>
                          <label className="mb-1 block font-semibold text-[var(--text)]">Min Team Size</label>
                          <select
                            value={newContest.minTeamSize}
                            onChange={(e) => setNewContest({ ...newContest, minTeamSize: Number(e.target.value) })}
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                          >
                            <option value={1}>1 Member (Solo allowed in team)</option>
                            {newContest.maxTeamSize >= 2 && <option value={2}>At least 2 Members</option>}
                            {newContest.maxTeamSize >= 3 && <option value={3}>At least 3 Members</option>}
                            {newContest.maxTeamSize >= 4 && <option value={4}>At least 4 Members</option>}
                            {newContest.maxTeamSize >= 5 && <option value={5}>At least 5 Members</option>}
                            {newContest.maxTeamSize >= 6 && <option value={6}>At least 6 Members</option>}
                          </select>
                          <span className="mt-1 block text-[10px] text-[var(--muted)]">Minimum required to submit</span>
                        </div>

                        <div>
                          <label className="mb-1 block font-semibold text-[var(--text)]">Team Name</label>
                          <select
                            value={newContest.teamNameRequired ? "required" : "optional"}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                teamNameRequired: e.target.value === "required",
                              })
                            }
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                          >
                            <option value="required">Required for team</option>
                            <option value="optional">Optional (Auto-filled if blank)</option>
                          </select>
                          <span className="mt-1 block text-[10px] text-[var(--muted)]">Team name on registration</span>
                        </div>

                        <div>
                          <label className="mb-1 block font-semibold text-[var(--text)]">HackerRank ID</label>
                          <select
                            value={newContest.hackerrankRequired ? "required" : "optional"}
                            onChange={(e) =>
                              setNewContest({
                                ...newContest,
                                hackerrankRequired: e.target.value === "required",
                              })
                            }
                            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                          >
                            <option value="optional">Optional for members</option>
                            <option value="required">Strictly Required</option>
                          </select>
                          <span className="mt-1 block text-[10px] text-[var(--muted)]">HackerRank username requirement</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Venue</label>
                      <input
                        type="text"
                        placeholder="e.g. CL1, CL2 (ABB3)"
                        value={newContest.venue}
                        onChange={(e) => setNewContest({ ...newContest, venue: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Prize Pool</label>
                      <input
                        type="text"
                        placeholder="e.g. Prize Pool of ₹10,000"
                        value={newContest.prizePool}
                        onChange={(e) => setNewContest({ ...newContest, prizePool: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Goodies</label>
                      <input
                        type="text"
                        placeholder="e.g. KPH T-Shirts & Stickers"
                        value={newContest.goodies}
                        onChange={(e) => setNewContest({ ...newContest, goodies: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                  </div>

                  {/* Contest Date & Time (Asked Separately & Cleanly) */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text)]">
                        Contest Schedule (IST) · Displayed Inside &amp; on Cards
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">e.g. 31 October 2026 · 14:00 – 16:00 IST</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Contest Date *</label>
                        <input
                          type="date"
                          value={newContest.contestDate}
                          onChange={(e) => setNewContest({ ...newContest, contestDate: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Start Time (IST) *</label>
                        <input
                          type="time"
                          value={newContest.contestStartTime}
                          onChange={(e) => setNewContest({ ...newContest, contestStartTime: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">End Time (IST) *</label>
                        <input
                          type="time"
                          value={newContest.contestEndTime}
                          onChange={(e) => setNewContest({ ...newContest, contestEndTime: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Registration Dates */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text)]">
                        Registration Window (IST) · Dashboard &amp; Cutoff
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">Start and end of registration</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Registration Opens At</label>
                        <input
                          type="datetime-local"
                          value={newContest.registrationStartsAt}
                          onChange={(e) => setNewContest({ ...newContest, registrationStartsAt: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Registration Closes At</label>
                        <input
                          type="datetime-local"
                          value={newContest.registrationClosesAt}
                          onChange={(e) => setNewContest({ ...newContest, registrationClosesAt: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[var(--text)]">Initial Registration Status</label>
                    <div className="flex gap-4">
                      {(["OPEN", "SOON", "CLOSED"] as const).map((statusVal) => (
                        <label key={statusVal} className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name="regStatus"
                            value={statusVal}
                            checked={newContest.registrationStatus === statusVal}
                            onChange={() => setNewContest({ ...newContest, registrationStatus: statusVal })}
                          />
                          <span className="font-semibold">{statusVal}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[var(--text)]">Description & Rules</label>
                    <textarea
                      rows={4}
                      placeholder="Describe format, eligibility, platform rules, and HackerRank setup..."
                      value={newContest.description}
                      onChange={(e) => setNewContest({ ...newContest, description: e.target.value })}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                    <button
                      type="button"
                      onClick={() => setContestModalOpen(false)}
                      className="button button-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={contestSubmitting}
                      className="button button-primary"
                    >
                      {contestSubmitting ? "Creating..." : "Publish Contest"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Contest Modal */}
          {editingContest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                      <Pencil size={16} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text)]">Edit Contest</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Update contest details, schedule, or guidelines</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingContest(null)}
                    className="p-1 text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleUpdateContest} className="space-y-4 text-xs">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Contest Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. AlgoBlitz 2026"
                        value={editContestForm.title}
                        onChange={(e) => setEditContestForm({ ...editContestForm, title: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)] focus:ring-1 focus:ring-[var(--accent)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 flex items-center gap-1.5 font-semibold text-[var(--text)]">
                        <span>URL Slug</span>
                        <span className="inline-flex items-center gap-0.5 rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                          <Lock size={10} /> Locked
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={editContestForm.slug}
                        className="w-full cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs text-[var(--muted)]"
                      />
                      <span className="mt-1 block text-[10px] text-[var(--muted)]">
                        Locked to preserve existing registrations and public URLs.
                      </span>
                    </div>
                  </div>

                  {/* Participation Mode (Solo vs Team) */}
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
                    <label className="mb-2 block font-bold text-[var(--text)]">Participation Format *</label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                          editContestForm.participationType === "SOLO"
                            ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--border)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="editParticipationType"
                          value="SOLO"
                          checked={editContestForm.participationType === "SOLO"}
                          onChange={() =>
                            setEditContestForm({
                              ...editContestForm,
                              participationType: "SOLO",
                              minTeamSize: 1,
                              maxTeamSize: 1,
                            })
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-[var(--text)]">Solo (Individual)</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Single student per registration</div>
                        </div>
                      </label>

                      <label
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${
                          editContestForm.participationType === "TEAM"
                            ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
                            : "border-[var(--border)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="editParticipationType"
                          value="TEAM"
                          checked={editContestForm.participationType === "TEAM"}
                          onChange={() =>
                            setEditContestForm({
                              ...editContestForm,
                              participationType: "TEAM",
                              minTeamSize: 1,
                              maxTeamSize: Math.max(2, editContestForm.maxTeamSize),
                            })
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-bold text-[var(--text)]">Team Participation</div>
                          <div className="text-[11px] text-[var(--text-secondary)]">Leader registers with teammates</div>
                        </div>
                      </label>
                    </div>

                    {editContestForm.participationType === "TEAM" && (
                      <div className="mt-3.5 border-t border-[var(--border)] pt-3.5 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block font-semibold text-[var(--text)]">Max Team Size</label>
                            <select
                              value={editContestForm.maxTeamSize}
                              onChange={(e) => {
                                const max = Number(e.target.value);
                                setEditContestForm({
                                  ...editContestForm,
                                  maxTeamSize: max,
                                  minTeamSize: Math.min(editContestForm.minTeamSize, max),
                                });
                              }}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                            >
                              <option value={2}>Up to 2 Members (Pairs)</option>
                              <option value={3}>Up to 3 Members (ICPC / Standard)</option>
                              <option value={4}>Up to 4 Members</option>
                              <option value={5}>Up to 5 Members</option>
                              <option value={6}>Up to 6 Members (Large Team)</option>
                            </select>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">Leader + up to {editContestForm.maxTeamSize - 1} members</span>
                          </div>

                          <div>
                            <label className="mb-1 block font-semibold text-[var(--text)]">Min Team Size</label>
                            <select
                              value={editContestForm.minTeamSize}
                              onChange={(e) => setEditContestForm({ ...editContestForm, minTeamSize: Number(e.target.value) })}
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                            >
                              <option value={1}>1 Member (Solo allowed in team)</option>
                              {editContestForm.maxTeamSize >= 2 && <option value={2}>At least 2 Members</option>}
                              {editContestForm.maxTeamSize >= 3 && <option value={3}>At least 3 Members</option>}
                              {editContestForm.maxTeamSize >= 4 && <option value={4}>At least 4 Members</option>}
                              {editContestForm.maxTeamSize >= 5 && <option value={5}>At least 5 Members</option>}
                              {editContestForm.maxTeamSize >= 6 && <option value={6}>At least 6 Members</option>}
                            </select>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">Minimum required to submit</span>
                          </div>

                          <div>
                            <label className="mb-1 block font-semibold text-[var(--text)]">Team Name</label>
                            <select
                              value={editContestForm.teamNameRequired ? "required" : "optional"}
                              onChange={(e) =>
                                setEditContestForm({
                                  ...editContestForm,
                                  teamNameRequired: e.target.value === "required",
                                })
                              }
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                            >
                              <option value="required">Required for team</option>
                              <option value="optional">Optional (Auto-filled if blank)</option>
                            </select>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">Team name on registration</span>
                          </div>

                          <div>
                            <label className="mb-1 block font-semibold text-[var(--text)]">HackerRank ID</label>
                            <select
                              value={editContestForm.hackerrankRequired ? "required" : "optional"}
                              onChange={(e) =>
                                setEditContestForm({
                                  ...editContestForm,
                                  hackerrankRequired: e.target.value === "required",
                                })
                              }
                              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                            >
                              <option value="optional">Optional for members</option>
                              <option value="required">Strictly Required</option>
                            </select>
                            <span className="mt-1 block text-[10px] text-[var(--muted)]">HackerRank username requirement</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Venue</label>
                      <input
                        type="text"
                        placeholder="e.g. CL1, CL2 (ABB3)"
                        value={editContestForm.venue}
                        onChange={(e) => setEditContestForm({ ...editContestForm, venue: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Prize Pool</label>
                      <input
                        type="text"
                        placeholder="e.g. Prize Pool of ₹10,000"
                        value={editContestForm.prizePool}
                        onChange={(e) => setEditContestForm({ ...editContestForm, prizePool: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold text-[var(--text)]">Goodies</label>
                      <input
                        type="text"
                        placeholder="e.g. KPH T-Shirts & Stickers"
                        value={editContestForm.goodies}
                        onChange={(e) => setEditContestForm({ ...editContestForm, goodies: e.target.value })}
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                      />
                    </div>
                  </div>

                  {/* Contest Date & Time */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text)]">
                        Contest Schedule (IST) · Displayed Inside &amp; on Cards
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">e.g. 31 October 2026 · 14:00 – 16:00 IST</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Contest Date *</label>
                        <input
                          type="date"
                          value={editContestForm.contestDate}
                          onChange={(e) => setEditContestForm({ ...editContestForm, contestDate: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Start Time (IST) *</label>
                        <input
                          type="time"
                          value={editContestForm.contestStartTime}
                          onChange={(e) => setEditContestForm({ ...editContestForm, contestStartTime: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">End Time (IST) *</label>
                        <input
                          type="time"
                          value={editContestForm.contestEndTime}
                          onChange={(e) => setEditContestForm({ ...editContestForm, contestEndTime: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Registration Dates */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--text)]">
                        Registration Window (IST) · Dashboard &amp; Cutoff
                      </span>
                      <span className="text-[10px] text-[var(--muted)]">Start and end of registration</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Registration Opens At</label>
                        <input
                          type="datetime-local"
                          value={editContestForm.registrationStartsAt}
                          onChange={(e) => setEditContestForm({ ...editContestForm, registrationStartsAt: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-[var(--text-secondary)]">Registration Closes At</label>
                        <input
                          type="datetime-local"
                          value={editContestForm.registrationClosesAt}
                          onChange={(e) => setEditContestForm({ ...editContestForm, registrationClosesAt: e.target.value })}
                          className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--text)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[var(--text)]">Registration Status</label>
                    <div className="flex gap-4">
                      {(["OPEN", "SOON", "CLOSED"] as const).map((statusVal) => (
                        <label key={statusVal} className="flex cursor-pointer items-center gap-1.5">
                          <input
                            type="radio"
                            name="editRegStatus"
                            value={statusVal}
                            checked={editContestForm.registrationStatus === statusVal}
                            onChange={() => setEditContestForm({ ...editContestForm, registrationStatus: statusVal })}
                          />
                          <span className="font-semibold">{statusVal}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block font-semibold text-[var(--text)]">Description &amp; Rules</label>
                    <textarea
                      rows={4}
                      placeholder="Describe format, eligibility, platform rules, and HackerRank setup..."
                      value={editContestForm.description}
                      onChange={(e) => setEditContestForm({ ...editContestForm, description: e.target.value })}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
                    <button
                      type="button"
                      onClick={() => setEditingContest(null)}
                      className="button button-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSubmitting}
                      className="button button-primary"
                    >
                      <Save size={14} />
                      <span>{editSubmitting ? "Saving Changes..." : "Save Changes"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Contest Confirmation Modal */}
          {contestToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Delete Contest</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Confirmation required before removal</p>
                  </div>
                </div>

                <div className="mb-5 space-y-3 text-xs text-[var(--text-secondary)]">
                  <p>
                    Are you sure you want to permanently delete this contest?
                  </p>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-1">
                    <div className="font-bold text-sm text-[var(--text)]">{contestToDelete.title}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)]">slug: {contestToDelete.slug}</div>
                    {contestToDelete.venue && (
                      <div className="text-[11px] text-[var(--text-secondary)]">Venue: {contestToDelete.venue}</div>
                    )}
                    <div className="text-[11px]">
                      Registered Participants: <strong className="text-[var(--text)]">{contestToDelete.registrationsCount}</strong>
                    </div>
                  </div>

                  {contestToDelete.registrationsCount > 0 ? (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-[11px] text-rose-800 dark:text-rose-300">
                      ⚠️ This contest has <strong>{contestToDelete.registrationsCount} registered participant(s)</strong>. Deleting this contest will permanently delete the contest and all associated student registrations. This action cannot be undone.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-[11px] text-rose-800 dark:text-rose-300">
                      ⚠️ This action is permanent and cannot be undone. All public contest pages and schedule listings for this contest will be removed.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    disabled={contestDeleting}
                    onClick={() => setContestToDelete(null)}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={contestDeleting}
                    onClick={() => handleDeleteContest(contestToDelete.slug, contestToDelete.title)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>{contestDeleting ? "Deleting..." : "Delete Contest"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CERTIFICATES & LEADERBOARD */}
      {/* ======================================================== */}
      {activeTab === "certificates" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column: Configuration */}
            <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:col-span-1">
              <div>
                <h3 className="mb-2 text-sm font-bold text-[var(--text)]">1. Select Contest</h3>
                <select
                  value={selectedContestSlug}
                  onChange={(e) => {
                    const slug = e.target.value;
                    setSelectedContestSlug(slug);
                    if (!slug) {
                      setParsedLeaderboard([]);
                      setGeneratedCertificates([]);
                      setPublishedLeaderboardInfo(null);
                    }
                  }}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                >
                  <option value="">None (Select a Contest)</option>
                  {contests.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title} ({c.slug})
                    </option>
                  ))}
                </select>
                {!selectedContestSlug && (
                  <p className="mt-2 text-[11px] font-medium text-amber-500">
                    ⚠️ Please select a contest first.
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text)]">2. Upload Leaderboard (JSON)</h3>
                </div>
                <p className="mb-2 text-xs text-[var(--text-secondary)]">
                  Upload a HackerRank/Contest leaderboard JSON export:
                </p>

                <label
                  className={`flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-2.5 px-3 text-center transition-colors ${
                    !selectedContestSlug
                      ? "cursor-not-allowed opacity-50 bg-[var(--surface-muted)]/50"
                      : "cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <Upload size={16} className="text-[var(--muted)] shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text)]">
                    {!selectedContestSlug ? "Select a contest above first" : "Click to browse .json file"}
                  </span>
                  <input
                    type="file"
                    accept=".json"
                    disabled={!selectedContestSlug}
                    onChange={handleJsonUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Action Buttons: Generate Certs, Publish Leaderboard, & Email Dispatch */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleGenerateCertificates}
                  disabled={!selectedContestSlug || certGenerating || parsedLeaderboard.length === 0}
                  className="button button-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Award size={16} />
                  <span>
                    {certGenerating
                      ? "Generating with cert_gen..."
                      : `Generate Certificates (${parsedLeaderboard.length})`}
                  </span>
                </button>

                {/* Button below Generate Certificate for Posting/Publishing Leaderboard */}
                <button
                  type="button"
                  onClick={handlePublishLeaderboard}
                  disabled={!selectedContestSlug || leaderboardPublishing || parsedLeaderboard.length === 0}
                  className="button button-secondary w-full border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trophy size={16} />
                  <span>
                    {leaderboardPublishing
                      ? "Publishing Leaderboard..."
                      : `Publish Contest Leaderboard (${parsedLeaderboard.length})`}
                  </span>
                </button>

                {/* Published Leaderboard Status Pill & Quick Unpublish */}
                {selectedContestSlug && publishedLeaderboardInfo?.exists && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={13} />
                        Leaderboard Published ({publishedLeaderboardInfo.totalParticipants ?? 0} contestants)
                      </span>
                      <button
                        type="button"
                        onClick={handleDeletePublishedLeaderboard}
                        disabled={leaderboardDeleting}
                        className="text-[11px] font-semibold text-rose-500 hover:underline"
                        title="Delete / Unpublish leaderboard"
                      >
                        {leaderboardDeleting ? "Deleting..." : "Unpublish"}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                      Live on contest detail page when contest ends.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setEmailConfirmModalOpen(true)}
                  disabled={!selectedContestSlug || emailSending || generatedCertificates.length === 0}
                  className="button button-secondary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Mail size={16} />
                  <span>
                    {emailSending
                      ? "Sending via Email..."
                      : `Send Certificates via Email (${generatedCertificates.length})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Generated Certificate Candidates or Leaderboard Preview */}
            <div className="space-y-5 lg:col-span-2">
              {/* Success / Status Banners */}
              {emailSuccessResults && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300">
                  <div>
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 size={16} />
                      <span>Certificates Successfully Sent via Email ({emailSuccessResults.sentCount || emailSuccessResults.total} candidates)</span>
                    </div>
                    <p className="mt-1">
                      Official participation certificate emails with PDF attachments have been dispatched to the candidates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailSuccessResults(null)}
                    className="p-1 text-emerald-800/70 hover:text-emerald-800 dark:text-emerald-300/70 dark:hover:text-emerald-300"
                    title="Dismiss"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* Table Section */}
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border)] p-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[var(--text)]">
                      {generatedCertificates.length > 0 ? "Generated Certificate Candidates" : "Leaderboard Participants"}
                    </h4>
                    {generatedCertificates.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={11} />
                        {generatedCertificates.length} Generated
                      </span>
                    )}
                  </div>
                  <div className="relative w-48">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="text"
                      placeholder="Filter by name/email..."
                      value={leaderboardSearch}
                      onChange={(e) => setLeaderboardSearch(e.target.value)}
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-muted)] py-1 pl-7 pr-2 text-[11px] text-[var(--text)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="sticky top-0 bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-center w-12">Rank</th>
                        <th className="px-3 py-2 font-semibold">Candidate Name</th>
                        <th className="px-3 py-2 font-semibold">Enrollment</th>
                        <th className="px-3 py-2 font-semibold">Batch / Branch</th>
                        <th className="px-3 py-2 text-center font-semibold">Score</th>
                        <th className="px-3 py-2 text-center font-semibold">Solved</th>
                        <th className="px-3 py-2 text-center font-semibold">Penalty</th>
                        <th className="px-3 py-2 font-semibold">Email</th>
                        <th className="px-3 py-2 text-center font-semibold">Status</th>
                        <th className="px-3 py-2 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {generatedCertificates.length > 0 ? (
                        generatedCertificates
                          .filter(
                            (c) =>
                              c.name.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
                              c.email.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
                              c.enrollmentNo.toLowerCase().includes(leaderboardSearch.toLowerCase())
                          )
                          .map((cert, idx) => {
                            const pMatch = parsedLeaderboard.find((p) => p.name === cert.name || (p.enrollmentNo && p.enrollmentNo === cert.enrollmentNo));
                            const certKey = `${cert.filename || cert.enrollmentNo || cert.name}-${idx}`;
                            return (
                              <tr key={certKey} className="hover:bg-[var(--surface-hover)]">
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                      cert.rank === 1
                                        ? "bg-amber-400 text-black font-extrabold shadow-sm"
                                        : cert.rank === 2
                                        ? "bg-slate-300 text-black font-bold"
                                        : cert.rank === 3
                                        ? "bg-amber-700 text-white font-bold"
                                        : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                    }`}
                                  >
                                    {cert.rank}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 font-semibold text-[var(--text)]">
                                  <div>{cert.name}</div>
                                  {pMatch?.hackerRankHandle && (
                                    <span className="text-[10px] text-[var(--muted)] font-mono">@{pMatch.hackerRankHandle}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
                                  {cert.enrollmentNo || "—"}
                                </td>
                                <td className="px-3 py-2.5 text-[11px] text-[var(--muted)]">
                                  {pMatch?.branch || pMatch?.batch ? `${pMatch?.batch || ""} ${pMatch?.branch ? `· ${pMatch.branch}` : ""}` : "—"}
                                </td>
                                <td className="px-3 py-2.5 text-center font-bold text-[#8dc63f]">
                                  {cert.score ?? pMatch?.score ?? "—"}
                                </td>
                                <td className="px-3 py-2.5 text-center font-semibold text-emerald-500">
                                  {pMatch?.solved ?? "—"}
                                </td>
                                <td className="px-3 py-2.5 text-center font-mono text-[11px] text-[var(--muted)]">
                                  {pMatch?.penalty !== undefined ? `${pMatch.penalty}m` : "—"}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
                                  {cert.email || <span className="italic">Not specified</span>}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    {/* Certificate Generated Tick */}
                                    <span
                                      className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                      title="Certificate PDF generated"
                                      aria-label="Certificate PDF generated"
                                    >
                                      <CheckCircle2 size={13} />
                                    </span>

                                    {/* Email Dispatch Status: Green Tick if Sent, Red Cross if Error/Failed */}
                                    {(() => {
                                      const emailKey = cert.email.trim().toLowerCase();
                                      const statusInfo =
                                        (emailKey ? emailStatuses[emailKey] : undefined) ||
                                        (cert.filename ? emailStatuses[cert.filename] : undefined) ||
                                        (cert.name ? emailStatuses[cert.name.trim().toLowerCase()] : undefined);
                                      if (statusInfo?.status === "SENT") {
                                        return (
                                          <span
                                            className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                            title="Certificate successfully sent to student email"
                                            aria-label="Email Sent"
                                          >
                                            <CheckCircle2 size={13} />
                                          </span>
                                        );
                                      }
                                      if (statusInfo?.status === "FAILED") {
                                        return (
                                          <span
                                            className="inline-flex size-6 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                            title={statusInfo.reason || "Email dispatch failed / error"}
                                            aria-label="Email Failed"
                                          >
                                            <XCircle size={13} />
                                          </span>
                                        );
                                      }
                                      return (
                                        <span
                                          className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]"
                                          title="Email not dispatched yet"
                                          aria-label="Email Pending"
                                        >
                                          <Mail size={12} />
                                        </span>
                                      );
                                    })()}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewPdf(cert)}
                                      className="inline-flex size-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] shadow-sm transition-colors hover:bg-[var(--surface-muted)] hover:border-[var(--accent)]"
                                      title="Preview Certificate"
                                      aria-label="Preview Certificate"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCandidateToDelete({ filename: cert.filename, name: cert.name })}
                                      className="inline-flex size-7 items-center justify-center rounded-md border border-rose-500/30 bg-[var(--surface)] text-rose-500 shadow-sm transition-colors hover:bg-rose-500/10 hover:border-rose-500"
                                      title="Delete Candidate"
                                      aria-label="Delete Candidate"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : parsedLeaderboard.length > 0 ? (
                        parsedLeaderboard
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
                              p.email.toLowerCase().includes(leaderboardSearch.toLowerCase()) ||
                              (p.enrollmentNo && p.enrollmentNo.toLowerCase().includes(leaderboardSearch.toLowerCase())) ||
                              (p.hackerRankHandle && p.hackerRankHandle.toLowerCase().includes(leaderboardSearch.toLowerCase()))
                          )
                          .map((p, idx) => (
                            <tr
                              key={`${p.rank}-${p.enrollmentNo || p.hackerRankHandle || p.name}-${idx}`}
                              className="hover:bg-[var(--surface-hover)]"
                            >
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold ${
                                    p.rank === 1
                                      ? "bg-amber-400 text-black font-extrabold shadow-sm"
                                      : p.rank === 2
                                      ? "bg-slate-300 text-black font-bold"
                                      : p.rank === 3
                                      ? "bg-amber-700 text-white font-bold"
                                      : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                                  }`}
                                >
                                  {p.rank}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-semibold text-[var(--text)]">
                                <div>{p.name}</div>
                                {p.hackerRankHandle && (
                                  <span className="text-[10px] text-[var(--muted)] font-mono">@{p.hackerRankHandle}</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
                                {p.enrollmentNo || "—"}
                              </td>
                              <td className="px-3 py-2.5 text-[11px] text-[var(--muted)]">
                                {p.branch || p.batch ? `${p.batch || ""} ${p.branch ? `· ${p.branch}` : ""}` : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center font-bold text-[#8dc63f]">
                                {p.score ?? 0}
                              </td>
                              <td className="px-3 py-2.5 text-center font-semibold text-emerald-500">
                                {p.solved ?? "—"}
                              </td>
                              <td className="px-3 py-2.5 text-center font-mono text-[11px] text-[var(--muted)]">
                                {p.penalty !== undefined ? `${p.penalty}m` : "—"}
                              </td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-[var(--muted)]">
                                {p.email || <span className="italic">Not specified</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className="inline-flex size-6 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]"
                                  title="Pending Generation"
                                >
                                  <Clock size={13} />
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setParticipantToDelete({ index: idx, name: p.name })}
                                  className="inline-flex size-7 items-center justify-center rounded-md border border-rose-500/30 bg-[var(--surface)] text-rose-500 shadow-sm transition-colors hover:bg-rose-500/10 hover:border-rose-500"
                                  title="Delete Participant"
                                  aria-label="Delete Participant"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : !selectedContestSlug ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-amber-500 font-medium">
                            Please select a contest from dropdown (1. Select Contest) first to view, generate, or publish leaderboard certificates.
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan={10} className="px-4 py-12 text-center text-[var(--muted)]">
                            No leaderboard records uploaded for {contests.find((c) => c.slug === selectedContestSlug)?.title || selectedContestSlug}. Upload a JSON file or click &quot;Sample Data&quot; to begin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Real PDF Certificate Preview Modal */}
          {pdfPreviewModalOpen && pdfPreviewCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-[var(--accent)]" />
                      <h3 className="text-base font-bold text-[var(--text)]">Certificate of Participation</h3>
                      <span className="rounded bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                        Donald Knuth Verticals
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                      Awarded to <strong>{pdfPreviewCandidate.name}</strong> ({pdfPreviewCandidate.enrollmentNo || pdfPreviewCandidate.email}) for {pdfPreviewCandidate.contest}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pdfBlobUrl && (
                      <>
                        <a
                          href={pdfBlobUrl}
                          download={pdfPreviewCandidate.filename}
                          className="button button-secondary text-xs"
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </a>
                        <a
                          href={pdfBlobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="button button-secondary text-xs"
                        >
                          <ExternalLink size={14} />
                          <span>Full Screen</span>
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={handleClosePdfModal}
                      className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Body / PDF Frame */}
                <div className="flex-1 overflow-hidden p-6">
                  {pdfLoading ? (
                    <div className="flex h-[520px] flex-col items-center justify-center gap-3">
                      <RefreshCw size={28} className="animate-spin text-[var(--accent)]" />
                      <p className="text-xs text-[var(--text-secondary)]">Loading certificate preview from cert_gen...</p>
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      title={`Certificate for ${pdfPreviewCandidate.name}`}
                      className="h-[520px] w-full rounded-xl border border-[var(--border)] shadow-inner"
                    />
                  ) : (
                    <div className="flex h-[520px] items-center justify-center text-xs text-[var(--muted)]">
                      Could not render PDF preview.
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--surface-muted)] px-6 py-3 text-xs text-[var(--text-secondary)]">
                  <span>File: <code className="font-mono">{pdfPreviewCandidate.filename}</code></span>
                  <button
                    type="button"
                    onClick={handleClosePdfModal}
                    className="button button-secondary text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Confirmation Modal for Sending Emails */}
          {emailConfirmModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Confirm Email Dispatch</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Official Participation Certificates</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Contest:</span>
                    <span className="font-semibold text-[var(--text)]">{selectedContest?.title || selectedContestSlug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Recipients:</span>
                    <span className="font-semibold text-[var(--text)]">{generatedCertificates.length} Candidate(s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Attachment:</span>
                    <span className="font-semibold text-[var(--text)]">PDF Participation Certificate</span>
                  </div>
                </div>

                <p className="mt-3.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Are you sure you want to dispatch participation certificates to all <strong>{generatedCertificates.length}</strong> candidate(s) via email?
                </p>

                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEmailConfirmModalOpen(false)}
                    disabled={emailSending}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setEmailConfirmModalOpen(false);
                      await handleSendCertificatesEmail();
                    }}
                    disabled={emailSending}
                    className="button button-primary text-xs"
                  >
                    <Mail size={14} />
                    <span>Confirm &amp; Send Emails</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Candidate Confirmation Dialog Modal */}
          {candidateToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Remove Candidate</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Remove student from generated certificates</p>
                  </div>
                </div>

                <div className="mb-5 space-y-3 text-xs text-[var(--text-secondary)]">
                  <p>
                    Are you sure you want to remove this candidate from the certificate queue?
                  </p>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-1">
                    <div className="font-bold text-sm text-[var(--text)]">{candidateToDelete.name}</div>
                    <div className="font-mono text-[11px] text-[var(--muted)]">{candidateToDelete.filename}</div>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                    ℹ️ This student will not receive a certificate when batch emailing is dispatched. You can regenerate certificates at any time.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setCandidateToDelete(null)}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveCandidate}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Remove Student</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Remove Participant Confirmation Dialog Modal */}
          {participantToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Remove Participant</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Remove from uploaded leaderboard</p>
                  </div>
                </div>

                <div className="mb-5 space-y-3 text-xs text-[var(--text-secondary)]">
                  <p>
                    Are you sure you want to remove this participant from the leaderboard list?
                  </p>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 space-y-1">
                    <div className="font-bold text-sm text-[var(--text)]">{participantToDelete.name}</div>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                    ℹ️ Certificates will not be generated for this participant.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={() => setParticipantToDelete(null)}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmRemoveParticipant}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Remove Participant</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADMIN ACCESS IDENTIFIERS */}
      {/* ======================================================== */}
      {activeTab === "access" && (
        <div className="space-y-6">
          {/* Add Admin Form */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-[var(--text)]">Grant New Admin Access</h3>
            <form onSubmit={handleAddAdmin} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]">College Email or Enrollment No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2501030xxx@mail.jiit.ac.in or 2501030xxx"
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text)]">Role / Designation Note</label>
                <input
                  type="text"
                  placeholder="e.g. Contest Lead, Core Team Coordinator"
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text)]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={adminSubmitting || !newAdminId.trim()}
                  className="button button-primary w-full"
                >
                  <UserPlus size={16} />
                  <span>{adminSubmitting ? "Granting..." : "Grant Admin Access"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Admin Table */}
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            <div className="border-b border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
              <h3 className="text-xs font-bold text-[var(--text)]">Authorized Administrator IDs ({admins.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Identifier (Email / ID)</th>
                    <th className="px-4 py-3 font-semibold">Note / Role</th>
                    <th className="px-4 py-3 font-semibold">Matched User</th>
                    <th className="px-4 py-3 font-semibold">Added On</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {admins.map((adm) => {
                    const isPermanent = isPermanentAdmin(adm);
                    const isSelf = account.email.toLowerCase() === adm.identifier.toLowerCase();
                    return (
                      <tr key={adm.id} className="hover:bg-[var(--surface-hover)]">
                        <td className="px-4 py-3.5 font-mono font-semibold text-[var(--text)]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{adm.identifier}</span>
                            {isSelf && (
                              <span className="rounded bg-[var(--accent-subtle)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                                YOU
                              </span>
                            )}
                            {isPermanent && (
                              <span
                                className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300"
                                title="Permanent Lead Administrator — Cannot be removed"
                              >
                                <ShieldCheck size={11} /> PERMANENT
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                          {adm.note || <span className="italic text-[var(--muted)]">Admin</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          {adm.matchedUser ? (
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-emerald-500" />
                              <span className="font-semibold text-[var(--text)]">{adm.matchedUser.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-[var(--muted)] italic">Pending first login</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-[var(--muted)]">
                          {new Date(adm.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {isPermanent ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400"
                              title="Permanent Super Admin — Protected from removal"
                            >
                              <Lock size={12} /> Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setAdminToDelete({
                                  id: adm.id,
                                  identifier: adm.identifier,
                                  name: adm.matchedUser?.displayName,
                                  note: adm.note || undefined,
                                })
                              }
                              title={`Revoke admin privileges for ${adm.identifier}`}
                              className="inline-flex size-7 items-center justify-center rounded-md text-rose-600 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revoke Admin Confirmation Dialog Modal */}
          {adminToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--text)]">Revoke Admin Access</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Confirmation required before removal</p>
                  </div>
                </div>

                <div className="mb-5 space-y-3 text-xs text-[var(--text-secondary)]">
                  <p>
                    Are you sure you want to revoke administrative privileges for:
                  </p>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
                    <div className="font-mono font-bold text-sm text-[var(--text)]">{adminToDelete.identifier}</div>
                    {adminToDelete.name && (
                      <div className="mt-1 font-semibold text-[var(--text)]">{adminToDelete.name}</div>
                    )}
                    {adminToDelete.note && (
                      <div className="mt-0.5 text-[11px] text-[var(--muted)]">Role / Designation: {adminToDelete.note}</div>
                    )}
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
                    ⚠️ This user will immediately lose access to the Admin Center, contest creation, certificate generation, and administrative tools.
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    disabled={adminRevoking}
                    onClick={() => setAdminToDelete(null)}
                    className="button button-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={adminRevoking}
                    onClick={() => void handleConfirmRevokeAdmin()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>{adminRevoking ? "Revoking..." : "Confirm Revoke"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

