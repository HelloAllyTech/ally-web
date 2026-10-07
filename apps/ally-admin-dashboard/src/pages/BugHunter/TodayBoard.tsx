import { FC } from "react";

import { useGetBugHunterTodayQuery } from "@api";
import { en } from "@constants";
import { BugHunterToday, BugHunterTodayRepo } from "@types";

/** Refresh cadence. The board is a glance, not a live feed; a minute is plenty and cheap. */
export const TODAY_BOARD_POLL_MS = 60_000;

/** The team's day. Sweeps run at 06:00 India, so "today" has to mean India's today. */
export const TODAY_BOARD_TIME_ZONE = "Asia/Kolkata";

const fmtUsd = (n: number): string => `$${n.toFixed(2)}`;

/**
 * "Today, by repo" — one row per repo of what Bug Hunter did since midnight:
 * sweeps that ran, bugs found, what the independent verifier confirmed or
 * refuted, fix sessions started by it and by people, fix PRs open, merged and
 * released, and the money spent. A totals row underneath.
 *
 * Read-only and self-contained: it reads one endpoint on its own poll and
 * touches nothing the table below depends on. Renders nothing while the first
 * load is in flight so a quiet page does not flash an empty grid.
 */
export const TodayBoard: FC = () => {
  const { data, isError } = useGetBugHunterTodayQuery(
    { timeZone: TODAY_BOARD_TIME_ZONE },
    { pollingInterval: TODAY_BOARD_POLL_MS },
  );
  if (!data || isError) return null;
  return <TodayBoardView board={data} />;
};

export const TodayBoardView: FC<{ board: BugHunterToday }> = ({ board }) => {
  const t = en.bugHunter.today;
  const sweeps = (r: Pick<BugHunterTodayRepo, "sweeps">) => {
    const parts: string[] = [];
    if (r.sweeps.completed) parts.push(`${r.sweeps.completed} ${t.sweepsDone}`);
    if (r.sweeps.failed) parts.push(`${r.sweeps.failed} ${t.sweepsFailed}`);
    if (r.sweeps.running) parts.push(`${r.sweeps.running} ${t.sweepsRunning}`);
    if (r.sweeps.skipped) parts.push(`${r.sweeps.skipped} ${t.sweepsSkipped}`);
    return parts.length ? parts.join(" · ") : "—";
  };
  const verdicts = (ok: number, bad: number, okWord: string, badWord: string) =>
    ok + bad === 0 ? "—" : `${ok} ${okWord} · ${bad} ${badWord}`;
  const sessions = (r: Pick<BugHunterTodayRepo, "fixSessions">) => {
    const total = r.fixSessions.byPerson + r.fixSessions.byAgent;
    if (!total) return "—";
    const bits = [
      `${r.fixSessions.byAgent} ${t.sessionsAuto}`,
      `${r.fixSessions.byPerson} ${t.sessionsByYou}`,
    ];
    if (r.fixSessions.running) bits.push(`${r.fixSessions.running} ${t.sessionsRunning}`);
    if (r.fixSessions.failed) bits.push(`${r.fixSessions.failed} ${t.sessionsFailed}`);
    return bits.join(" · ");
  };
  const num = (n: number) => (n ? String(n) : "—");

  const rows: (BugHunterTodayRepo | (Omit<BugHunterTodayRepo, "repo"> & { repo: string }))[] = [
    ...board.repos,
    { ...board.totals, repo: t.total },
  ];

  return (
    <section
      data-testid="today-board"
      aria-label={t.title}
      className="border border-border-light rounded-lg bg-white px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold text-typography-900">{t.title}</h2>
        <span className="text-xs text-typography-600">
          {t.subtitle.replace("{date}", board.date)}
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-left text-typography-600">
              <th className="py-1 pr-3 font-medium">{t.colRepo}</th>
              <th className="py-1 pr-3 font-medium">{t.colSweeps}</th>
              <th className="py-1 pr-3 font-medium text-right">{t.colFound}</th>
              <th className="py-1 pr-3 font-medium">{t.colVerified}</th>
              <th className="py-1 pr-3 font-medium">{t.colSessions}</th>
              <th className="py-1 pr-3 font-medium">{t.colFixVerdicts}</th>
              <th className="py-1 pr-3 font-medium text-right">{t.colPrsOpen}</th>
              <th className="py-1 pr-3 font-medium text-right">{t.colMerged}</th>
              <th className="py-1 pr-3 font-medium text-right">{t.colReleased}</th>
              <th className="py-1 font-medium text-right">{t.colSpend}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isTotal = i === rows.length - 1;
              return (
                <tr
                  key={r.repo}
                  data-testid={isTotal ? "today-total" : `today-${r.repo}`}
                  className={`border-t border-border-light ${isTotal ? "font-semibold text-typography-900" : "text-typography-800"}`}
                >
                  <td className="py-1.5 pr-3 font-mono">{r.repo}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{sweeps(r)}</td>
                  <td className="py-1.5 pr-3 text-right">{num(r.found)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {verdicts(r.verified, r.refuted, t.verifiedWord, t.refutedWord)}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">{sessions(r)}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {verdicts(r.fixesPassed, r.fixesFailed, t.passedWord, t.failedWord)}
                  </td>
                  <td className="py-1.5 pr-3 text-right">{num(r.prsOpen)}</td>
                  <td className="py-1.5 pr-3 text-right">{num(r.merged)}</td>
                  <td className="py-1.5 pr-3 text-right">{num(r.released)}</td>
                  <td className="py-1.5 text-right">{r.spendUsd ? fmtUsd(r.spendUsd) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
