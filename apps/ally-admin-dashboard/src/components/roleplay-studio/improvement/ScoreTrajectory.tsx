import React from "react";

import { en } from "@constants";
import { RoleplayImprovementRound, RoleplayImprovementRun } from "@src/types/roleplayStudio";

const DIMENSIONS = [
  "persona_consistency",
  "disclosure_discipline",
  "difficulty_calibration",
  "rubric_coverage",
] as const;

const DeltaChip: React.FC<{ delta: number | null | undefined }> = ({ delta }) => {
  if (delta === null || delta === undefined || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`ml-1 text-[10px] font-medium ${up ? "text-success-500" : "text-destructive-500"}`}
    >
      {up ? "▲" : "▼"}
      {Math.abs(delta)}
    </span>
  );
};

interface ScoreTrajectoryProps {
  run: RoleplayImprovementRun;
  rounds: RoleplayImprovementRound[];
}

/**
 * Round-by-round score table: overall + the four dimensions + tests passed,
 * each cell annotated with its delta vs the previous scored round. The best
 * round (the one review acts on) is highlighted.
 */
export const ScoreTrajectory: React.FC<ScoreTrajectoryProps> = ({ run, rounds }) => {
  const strings = en.roleplayStudio.improvement;
  const rehearsalStrings = en.roleplayStudio.rehearsal;
  const scored = rounds.filter(round => round.scores);
  if (scored.length === 0) return null;

  const testsCell = (round: RoleplayImprovementRound): string => {
    const counts = round.scores?.test_counts as Record<string, number> | undefined;
    if (!counts) return "—";
    const total = (counts.passed ?? 0) + (counts.failed ?? 0) + (counts.inconclusive ?? 0);
    return total > 0 ? `${counts.passed ?? 0}/${total}` : "—";
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <h4 className="text-sm font-medium text-typography-900">{strings.trajectory}</h4>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border-light text-xs uppercase text-typography-600">
              <th className="py-1.5 pr-3">{strings.round}</th>
              <th className="py-1.5 pr-3">{rehearsalStrings.overall}</th>
              {DIMENSIONS.map(dimension => (
                <th key={dimension} className="py-1.5 pr-3">
                  {rehearsalStrings.dimensions[dimension]}
                </th>
              ))}
              <th className="py-1.5">{rehearsalStrings.testCases}</th>
            </tr>
          </thead>
          <tbody>
            {scored.map(round => {
              const deltas = round.deltas?.vsPrevious;
              const isBest =
                Boolean(run.bestVersionId) && round.candidateVersionId === run.bestVersionId;
              return (
                <tr
                  key={round.id}
                  className={`border-b border-border-light/60 last:border-0 ${
                    isBest ? "bg-primary-50/50" : ""
                  }`}
                >
                  <td className="py-2 pr-3">
                    <span className="text-typography-900">
                      {round.roundNumber}
                      <span className="ml-1.5 text-xs text-typography-600">
                        {strings.kind[round.kind as keyof typeof strings.kind] ?? round.kind}
                      </span>
                    </span>
                    {!round.fullScope && (
                      <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-typography-600">
                        {strings.targetedScope}
                      </span>
                    )}
                    {isBest && (
                      <span className="ml-1.5 rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700">
                        {strings.bestRound}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-medium text-typography-900">
                    {round.scores?.overall ?? "—"}
                    <DeltaChip delta={deltas?.overall?.delta} />
                  </td>
                  {DIMENSIONS.map(dimension => (
                    <td key={dimension} className="py-2 pr-3 text-typography-800">
                      {(round.scores?.dimensions as Record<string, number> | undefined)?.[
                        dimension
                      ] ?? "—"}
                      <DeltaChip delta={deltas?.dimensions?.[dimension]?.delta} />
                    </td>
                  ))}
                  <td className="py-2 text-typography-800">{testsCell(round)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
