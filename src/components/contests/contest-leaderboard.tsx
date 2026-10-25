"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  Award,
  ExternalLink,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Flame,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import type { ContestLeaderboard, LeaderboardEntry } from "@/types/contest";
import type { Account } from "@/types/account";
import { ApiError } from "@/lib/api";

type Props = {
  leaderboard: ContestLeaderboard;
  account: Account | null;
  isAdmin?: boolean;
  onDeleteLeaderboard?: () => Promise<void> | void;
};

export function ContestLeaderboardView({
  leaderboard,
  account,
  isAdmin = false,
  onDeleteLeaderboard,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "REGISTERED" | "TOP10">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const entries = useMemo(() => leaderboard.entries || [], [leaderboard]);
  const problems = useMemo(() => leaderboard.problems || [], [leaderboard]);

  // Identify current user's entry if logged in
  const myEntry = useMemo(() => {
    if (!account) return null;
    const userEnrollment = account.profile?.enrollmentNo?.trim().toLowerCase();
    const userEmail = account.email?.trim().toLowerCase();
    const userHandle = account.profile?.hackerrankHandle?.trim().toLowerCase();

    return entries.find((e) => {
      const eEnrollment = e.enrollmentNo?.trim().toLowerCase();
      const eEmail = e.email?.trim().toLowerCase();
      const eHandle = e.hackerRankHandle?.trim().toLowerCase();

      return (
        (userEnrollment && eEnrollment === userEnrollment) ||
        (userEmail && eEmail === userEmail) ||
        (userHandle && eHandle === userHandle)
      );
    });
  }, [account, entries]);

  // Filter entries based on search & quick filters
  const filteredEntries = useMemo(() => {
    let list = entries;

    if (filterType === "REGISTERED") {
      list = list.filter((e) => e.registered || Boolean(e.enrollmentNo));
    } else if (filterType === "TOP10") {
      list = list.filter((e) => e.rank <= 10);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.displayName?.toLowerCase().includes(q) ||
          e.hackerRankHandle?.toLowerCase().includes(q) ||
          e.enrollmentNo?.toLowerCase().includes(q) ||
          e.branch?.toLowerCase().includes(q) ||
          e.batch?.toLowerCase().includes(q) ||
          String(e.rank) === q
      );
    }

    return list;
  }, [entries, filterType, search]);

  const totalPages = Math.ceil(filteredEntries.length / pageSize) || 1;
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Jump to current user's page and highlight
  function jumpToMyRank() {
    if (!myEntry) return;
    const index = filteredEntries.findIndex((e) => e.rank === myEntry.rank);
    if (index !== -1) {
      const targetPage = Math.floor(index / pageSize) + 1;
      setCurrentPage(targetPage);
      setTimeout(() => {
        const el = document.getElementById(`rank-row-${myEntry.rank}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }

  // Export Leaderboard to CSV
  function exportCsv() {
    const headers = [
      "Rank",
      "Name",
      "HackerRank Handle",
      "Enrollment No",
      "Branch",
      "Batch",
      "Campus",
      "Score",
      "Solved",
      "Penalty",
      "Disqualified",
    ];
    problems.forEach((p, idx) => {
      headers.push(p.name || `Problem ${idx + 1}`);
    });

    const rows = entries.map((e) => {
      const row = [
        e.rank,
        `"${(e.displayName || "").replace(/"/g, '""')}"`,
        `"${(e.hackerRankHandle || "").replace(/"/g, '""')}"`,
        `"${e.enrollmentNo || ""}"`,
        `"${e.branch || ""}"`,
        `"${e.batch || ""}"`,
        `"${e.campus || ""}"`,
        e.score,
        e.solved ?? 0,
        e.penalty ?? 0,
        e.disqualified ? "YES" : "NO",
      ];
      problems.forEach((p) => {
        const prob = e.problems?.find((ep) => ep.slug === p.slug || ep.name === p.name);
        row.push(prob?.solved ? prob.bestScore ?? 100 : 0);
      });
      return row.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${leaderboard.contestSlug || "contest"}_leaderboard.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDelete() {
    if (!onDeleteLeaderboard) return;
    try {
      setIsDeleting(true);
      setDeleteError("");
      await onDeleteLeaderboard();
      setDeleteModalOpen(false);
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete leaderboard.");
    } finally {
      setIsDeleting(false);
    }
  }

  const stats = leaderboard.stats || {};
  const winner = stats.winner || entries[0] || null;

  return (
    <div className="mt-8 space-y-6">
      {/* Leaderboard Card Container */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-md">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--surface-muted)]/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shadow-inner">
              <Trophy size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--text)]">Official Contest Leaderboard</h2>
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Concluded
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Final standings for {leaderboard.contestTitle || leaderboard.contestSlug} &middot; {entries.length} Participants
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text)] shadow-sm transition hover:bg-[var(--surface-muted)]"
              title="Download CSV of standings"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            {/* Admin Delete Action */}
            {isAdmin && onDeleteLeaderboard && (
              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-500/20 dark:text-rose-400"
                title="Remove published leaderboard for this contest"
              >
                <Trash2 size={14} />
                <span>Delete Leaderboard</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] border-b border-[var(--border)] bg-[var(--surface)] sm:grid-cols-4 sm:divide-y-0">
          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <Users size={14} /> Total Contestants
            </div>
            <div className="mt-1 text-xl font-bold text-[var(--text)]">{entries.length}</div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <Award size={14} className="text-amber-500" /> Contest Winner
            </div>
            <div
              className="mt-1 truncate text-sm font-bold text-[var(--text)]"
              title={(winner as any)?.displayName || (winner as any)?.name}
            >
              {(winner as any)?.displayName || (winner as any)?.name || "—"}
            </div>
            {winner && <div className="text-[11px] font-semibold text-emerald-500">{winner.score} pts</div>}
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <Flame size={14} className="text-orange-500" /> High Score
            </div>
            <div className="mt-1 text-xl font-bold text-[var(--text)]">
              {stats.highestScore !== undefined ? `${stats.highestScore} pts` : "—"}
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
              <Target size={14} className="text-sky-500" /> Problems Count
            </div>
            <div className="mt-1 text-xl font-bold text-[var(--text)]">
              {problems.length > 0 ? `${problems.length} Problems` : "CP Matrix"}
            </div>
          </div>
        </div>

        {/* Current User Highlight Banner */}
        {myEntry && (
          <div className="flex flex-col items-start justify-between gap-3 border-b border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-900 dark:text-emerald-200 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500 font-bold text-black shadow-sm">
                #{myEntry.rank}
              </span>
              <div>
                <span className="font-bold">Your Standing: Rank #{myEntry.rank}</span> &middot;{" "}
                <span>Score: <b>{myEntry.score} pts</b></span> &middot;{" "}
                <span>Solved: <b>{myEntry.solved ?? 0}</b></span> &middot;{" "}
                <span>Penalty: <b>{myEntry.penalty ?? 0}m</b></span>
              </div>
            </div>

            <button
              type="button"
              onClick={jumpToMyRank}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-semibold text-emerald-800 transition hover:bg-emerald-500/30 dark:text-emerald-300"
            >
              Highlight My Row &darr;
            </button>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search by name, handle, enrollment, batch..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-1.5 pl-8 pr-3 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setFilterType("ALL");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterType === "ALL"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              All ({entries.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType("TOP10");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterType === "TOP10"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              Top 10
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterType("REGISTERED");
                setCurrentPage(1);
              }}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterType === "REGISTERED"
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text)]"
              }`}
            >
              JIIT Registered
            </button>
          </div>
        </div>

        {/* Leaderboard Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--text-secondary)] border-b border-[var(--border)]">
              <tr>
                <th className="px-3.5 py-3 font-semibold text-center w-14">Rank</th>
                <th className="px-3.5 py-3 font-semibold min-w-[200px]">Candidate</th>
                <th className="px-3.5 py-3 font-semibold min-w-[130px]">Enrollment</th>
                <th className="px-3.5 py-3 font-semibold min-w-[110px]">Batch / Branch</th>
                <th className="px-3.5 py-3 font-semibold text-center min-w-[90px]">Score</th>
                <th className="px-3.5 py-3 font-semibold text-center min-w-[70px]">Solved</th>
                <th className="px-3.5 py-3 font-semibold text-center min-w-[70px]">Penalty</th>
                {problems.map((p, idx) => (
                  <th
                    key={p.slug || idx}
                    className="px-2.5 py-3 font-semibold text-center min-w-[75px]"
                    title={`${p.name} (Max Score: ${p.maxScore})`}
                  >
                    <div className="text-[11px] font-bold text-[var(--text)] truncate max-w-[80px] mx-auto">
                      P{idx + 1}
                    </div>
                    <div className="text-[9px] text-[var(--muted)] font-mono">{p.maxScore}p</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {paginatedEntries.length > 0 ? (
                paginatedEntries.map((row) => {
                  const isMe = myEntry && row.rank === myEntry.rank;
                  return (
                    <tr
                      key={row.rank}
                      id={`rank-row-${row.rank}`}
                      className={`transition-colors ${
                        isMe
                          ? "bg-emerald-500/10 hover:bg-emerald-500/15 font-medium"
                          : "hover:bg-[var(--surface-hover)]"
                      } ${row.disqualified ? "opacity-60 bg-rose-500/5" : ""}`}
                    >
                      {/* Rank Column */}
                      <td className="px-3.5 py-3 text-center">
                        <span
                          className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                            row.rank === 1
                              ? "bg-amber-400 text-black font-extrabold shadow-sm ring-2 ring-amber-400/50"
                              : row.rank === 2
                              ? "bg-slate-300 text-black font-bold shadow-sm"
                              : row.rank === 3
                              ? "bg-amber-700 text-white font-bold shadow-sm"
                              : "bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>

                      {/* Candidate Name & Handle */}
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[var(--text)]">{row.displayName || "Participant"}</span>
                          {isMe && (
                            <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-bold text-emerald-500">
                              YOU
                            </span>
                          )}
                          {row.disqualified && (
                            <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-500">
                              DISQUALIFIED
                            </span>
                          )}
                        </div>
                        {row.hackerRankHandle && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)] font-mono">
                            <a
                              href={`https://www.hackerrank.com/${row.hackerRankHandle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:text-[var(--accent)] hover:underline"
                            >
                              <span>@{row.hackerRankHandle}</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
                      </td>

                      {/* Enrollment */}
                      <td className="px-3.5 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                        {row.enrollmentNo ? (
                          <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 font-semibold text-[var(--text)]">
                            {row.enrollmentNo}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)] italic">—</span>
                        )}
                      </td>

                      {/* Batch & Branch */}
                      <td className="px-3.5 py-3 text-[11px] text-[var(--text-secondary)]">
                        {row.branch || row.batch ? (
                          <span>
                            {row.batch ? `${row.batch} ` : ""}
                            {row.branch ? `&middot; ${row.branch}` : ""}
                            {row.campus ? ` (${row.campus})` : ""}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>

                      {/* Total Score */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="font-extrabold text-[#8dc63f] text-sm">
                          {row.score}
                        </span>
                      </td>

                      {/* Solved */}
                      <td className="px-3.5 py-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {row.solved ?? 0}
                        </span>
                      </td>

                      {/* Penalty */}
                      <td className="px-3.5 py-3 text-center font-mono text-[11px] text-[var(--muted)]">
                        {row.penalty !== undefined ? `${row.penalty}m` : "—"}
                      </td>

                      {/* Problem Matrix Cells */}
                      {problems.map((p, idx) => {
                        const prob = row.problems?.find(
                          (ep) => ep.slug === p.slug || ep.name === p.name || ep.slug?.includes(p.slug)
                        );
                        if (!prob) {
                          return (
                            <td key={p.slug || idx} className="px-2.5 py-3 text-center font-mono text-[11px] text-[var(--muted)]">
                              —
                            </td>
                          );
                        }

                        if (prob.solved) {
                          return (
                            <td key={p.slug || idx} className="px-2.5 py-3 text-center">
                              <div
                                className="inline-flex flex-col items-center justify-center rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400"
                                title={`Solved in ${prob.solveTimeMinutes}m (${prob.attempts} attempt${prob.attempts === 1 ? "" : "s"})`}
                              >
                                <span className="font-bold text-[10px] leading-tight">
                                  {prob.bestScore ?? prob.maxScore}
                                </span>
                                {prob.solveTimeMinutes !== undefined && prob.solveTimeMinutes > 0 && (
                                  <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-mono">
                                    {prob.solveTimeMinutes}m
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (prob.attempts && prob.attempts > 0) {
                          return (
                            <td key={p.slug || idx} className="px-2.5 py-3 text-center">
                              <span
                                className="inline-block rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono"
                                title={`Attempted ${prob.attempts} time${prob.attempts === 1 ? "" : "s"}, not solved`}
                              >
                                -{prob.wrongAttempts || prob.attempts}
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={p.slug || idx} className="px-2.5 py-3 text-center font-mono text-[11px] text-[var(--muted)]">
                            —
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7 + problems.length}
                    className="px-4 py-12 text-center text-[var(--muted)]"
                  >
                    No participants matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col gap-3 border-t border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--text-secondary)]">
          <div>
            Showing <b>{filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</b> to{" "}
            <b>{Math.min(currentPage * pageSize, filteredEntries.length)}</b> of{" "}
            <b>{filteredEntries.length}</b> participants
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-[var(--surface-muted)]"
            >
              <ChevronLeft size={14} /> Prev
            </button>

            <span className="px-2 font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-medium disabled:opacity-40 hover:bg-[var(--surface-muted)]"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="flex size-10 items-center justify-center rounded-full bg-rose-500/10">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-[var(--text)]">Delete Published Leaderboard?</h3>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              This will remove the official standings table from this contest page for all students.
              You can re-upload or publish a new leaderboard from the Admin Center anytime.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-600 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 size={14} />
                <span>{isDeleting ? "Deleting..." : "Yes, Delete Leaderboard"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
