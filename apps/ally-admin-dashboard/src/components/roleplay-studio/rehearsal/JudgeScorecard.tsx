import React from "react";

import { en } from "@constants";
import { RoleplayJudgeDimension, RoleplayRehearsalResults } from "@src/types/roleplayStudio";

const DIMENSIONS: RoleplayJudgeDimension[] = [
  "persona_consistency",
  "disclosure_discipline",
  "difficulty_calibration",
  "rubric_coverage",
];

const barColor = (score: number) => {
  if (score >= 75) return "bg-success-400";
  if (score >= 50) return "bg-primary-400";
  return "bg-destructive-400";
};

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-typography-800">{label}</span>
        <span className="text-sm font-medium text-typography-900">{clamped}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${barColor(clamped)} transition-all`}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
};

interface JudgeScorecardProps {
  results: RoleplayRehearsalResults;
}

/** Overall score + the four judge dimensions as labeled 0-100 bars. */
export const JudgeScorecard: React.FC<JudgeScorecardProps> = ({ results }) => {
  const strings = en.roleplayStudio.rehearsal;
  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-neutral-50 border border-border-light">
          <span className="text-xl font-semibold text-typography-900">
            {Math.round(results.overall)}
          </span>
          <span className="text-[10px] text-typography-600">{strings.overall}</span>
        </div>
        <div className="flex-1 flex flex-col gap-2.5 min-w-0">
          {DIMENSIONS.map(dimension => (
            <ScoreBar
              key={dimension}
              label={strings.dimensions[dimension]}
              score={results.dimensions?.[dimension] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
