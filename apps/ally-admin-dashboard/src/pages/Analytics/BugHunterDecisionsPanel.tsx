import { useMemo, useState } from "react";

import { CarbonDropdown as Dropdown, Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetBugHunterDecisionReplayQuery, useGetBugHunterScoreboardQuery } from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";

import { AnalyticsTabFilters } from "./analyticsFilters";
import {
  fixerRows,
  formatRate,
  replayTakeaway,
  replayVerdictLabel,
  scoreboardRows,
  scoreboardTakeaway,
} from "./bugHunterDecisionsChart";
import { rangeToDays } from "./bugHunterOperationsChart";
import { ChartCard } from "./chartKit";
import { DECISION_OWNER_LABELS, DECISION_POINT_LABELS } from "../BugHunter/bugDecisionLabels";
import { BUG_HUNTER_REPOS } from "../BugHunter/repos";

const REPO_ITEMS = BUG_HUNTER_REPOS.map(id => ({ id, label: id }));

/**
 * The scoreboard and the decision replay (OPP-0776, read side of OPP-0783).
 *
 * Two tables, no charts: these are the cells the orchestrator reads before
 * it decides, shown to the person who can overrule it. The scoreboard says
 * which sense and which model is winning on a repo; the replay says, per
 * decision point, whether the owner or its shadow has been right more
 * often, and when a point has earned a flip.
 */
export const BugHunterDecisionsPanel = ({ query }: AnalyticsTabFilters) => {
  const t = en.bugHunter.scoreboard;
  const days = rangeToDays(query);
  const [repo, setRepo] = useState<(typeof BUG_HUNTER_REPOS)[number]>("ally-web");
  const board = useGetBugHunterScoreboardQuery({ repo, days });
  const replay = useGetBugHunterDecisionReplayQuery({ days });

  const senseRows = useMemo(() => scoreboardRows(board.data?.bySense), [board.data]);
  const modelRows = useMemo(() => scoreboardRows(board.data?.byModel), [board.data]);
  const fixers = useMemo(() => fixerRows(board.data?.fixByModel), [board.data]);
  const points = replay.data?.points ?? [];
  const threshold = points[0]?.flipThreshold ?? 30;

  const th = "py-1 pr-3 font-medium text-typography-600 text-left";
  const thNum = `${th} text-right`;
  const td = "py-1 pr-3";
  const tdNum = `${td} text-right tabular-nums`;

  return (
    <div className="flex flex-col gap-4">
      <div data-chart-id="AAQ-235">
        <ChartCard
          title={t.title}
          caption={t.subtitle.replace("{days}", String(days)).replace("{repo}", repo)}
          takeaway={scoreboardTakeaway(board.data)}
          loading={board.isLoading && !board.data}
          error={board.isError}
          onRetry={board.refetch}
          emptyText={t.empty}
          empty={!!board.data && senseRows.length === 0 && fixers.length === 0}
          chartId="AAQ-235"
          height="auto"
          controls={
            <Dropdown
              id="bug-hunter-scoreboard-repo"
              size="sm"
              titleText={t.repoLabel}
              hideLabel
              label={t.repoLabel}
              items={REPO_ITEMS}
              selectedItem={REPO_ITEMS.find(r => r.id === repo) ?? REPO_ITEMS[0]}
              itemToString={item => item?.label ?? ""}
              onChange={({ selectedItem }) => {
                if (selectedItem) setRepo(selectedItem.id);
              }}
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="min-w-0 overflow-x-auto">
              <h4 className="text-xs font-semibold text-typography-900 mb-1">{t.bySense}</h4>
              <table data-testid="scoreboard-by-sense" className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={th}>{t.colSense}</th>
                    <th className={thNum}>{t.colFiled}</th>
                    <th className={thNum}>{t.colAccepted}</th>
                    <th className={thNum}>{t.colDeclined}</th>
                    <th className={thNum}>{t.colPending}</th>
                    <th className={thNum}>
                      <span className="inline-flex items-center gap-1">
                        {t.colAcceptance}
                        <Tooltip label={t.acceptanceTooltip} align="top">
                          <button type="button" className="cursor-pointer inline-flex items-center">
                            <TooltipIcon />
                          </button>
                        </Tooltip>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {senseRows.map(r => (
                    <tr key={r.key} className="border-t border-border-light">
                      <td className={`${td} font-mono`}>{r.key}</td>
                      <td className={tdNum}>{r.filed}</td>
                      <td className={tdNum}>{r.accepted}</td>
                      <td className={tdNum}>{r.declined}</td>
                      <td className={tdNum}>{r.pending}</td>
                      <td className={tdNum}>{formatRate(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="min-w-0 overflow-x-auto">
              <h4 className="text-xs font-semibold text-typography-900 mb-1">{t.byModel}</h4>
              <table data-testid="scoreboard-by-model" className="w-full text-xs">
                <thead>
                  <tr>
                    <th className={th}>{t.colModel}</th>
                    <th className={thNum}>{t.colFiled}</th>
                    <th className={thNum}>{t.colAccepted}</th>
                    <th className={thNum}>{t.colDeclined}</th>
                    <th className={thNum}>{t.colAcceptance}</th>
                  </tr>
                </thead>
                <tbody>
                  {modelRows.map(r => (
                    <tr key={r.key} className="border-t border-border-light">
                      <td className={`${td} font-mono`}>{r.key}</td>
                      <td className={tdNum}>{r.filed}</td>
                      <td className={tdNum}>{r.accepted}</td>
                      <td className={tdNum}>{r.declined}</td>
                      <td className={tdNum}>{formatRate(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4 className="text-xs font-semibold text-typography-900 mt-3 mb-1">{t.fixers}</h4>
              {fixers.length === 0 ? (
                <p className="text-xs text-typography-500">{t.fixersEmpty}</p>
              ) : (
                <table data-testid="scoreboard-fixers" className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className={th}>{t.colModel}</th>
                      <th className={thNum}>{t.colSessions}</th>
                      <th className={thNum}>{t.colMerged}</th>
                      <th className={thNum}>{t.colFailed}</th>
                      <th className={thNum}>{t.colVerdicts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fixers.map(r => (
                      <tr key={r.key} className="border-t border-border-light">
                        <td className={`${td} font-mono`}>{r.key}</td>
                        <td className={tdNum}>{r.sessions}</td>
                        <td className={tdNum}>
                          {r.merged}
                          {r.mergeRate !== null && (
                            <span className="text-typography-500">
                              {" "}
                              · {formatRate(r.mergeRate)}
                            </span>
                          )}
                        </td>
                        <td className={tdNum}>{r.failed}</td>
                        <td className={tdNum}>
                          {r.passVerdicts} / {r.failVerdicts}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </ChartCard>
      </div>

      <div data-chart-id="AAQ-236">
        <ChartCard
          title={t.replayTitle}
          caption={t.replaySubtitle.replace("{threshold}", String(threshold))}
          takeaway={replayTakeaway(points)}
          loading={replay.isLoading && !replay.data}
          error={replay.isError}
          onRetry={replay.refetch}
          emptyText={t.replayEmpty}
          empty={!!replay.data && points.every(p => p.decisions === 0)}
          chartId="AAQ-236"
          height="auto"
        >
          <div className="min-w-0 overflow-x-auto">
            <table data-testid="decision-replay" className="w-full text-xs">
              <thead>
                <tr>
                  <th className={th}>{t.colPoint}</th>
                  <th className={th}>{t.colOwner}</th>
                  <th className={thNum}>{t.colDecisions}</th>
                  <th className={thNum}>{t.colAgreed}</th>
                  <th className={thNum}>{t.colDisagreed}</th>
                  <th className={thNum}>{t.colOwnerWins}</th>
                  <th className={thNum}>{t.colShadowWins}</th>
                  <th className={thNum}>{t.colVetoes}</th>
                  <th className={th}>{t.colVerdict}</th>
                </tr>
              </thead>
              <tbody>
                {points.map(p => (
                  <tr
                    key={p.point}
                    data-testid={`replay-${p.point}`}
                    className={`border-t border-border-light ${p.verdict === "flip" ? "font-semibold text-amber-800" : ""}`}
                  >
                    <td className={td}>
                      <span className="font-mono">{p.point}</span>{" "}
                      <span className="text-typography-600">{DECISION_POINT_LABELS[p.point]}</span>
                    </td>
                    <td className={td}>
                      {p.fixed ? t.verdictFixed : DECISION_OWNER_LABELS[p.owner]}
                    </td>
                    <td className={tdNum}>{p.decisions}</td>
                    <td className={tdNum}>{p.agreed}</td>
                    <td className={tdNum}>{p.disagreed}</td>
                    <td className={tdNum}>{p.ownerWins}</td>
                    <td className={tdNum}>{p.shadowWins}</td>
                    <td className={tdNum}>{p.vetoes}</td>
                    <td className={td}>{replayVerdictLabel(p.verdict)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
