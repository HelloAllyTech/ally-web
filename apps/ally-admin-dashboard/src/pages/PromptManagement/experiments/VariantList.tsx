import React, { useState } from "react";

import { en } from "@constants";
import { RubricCriterion, SkillExperimentVariant } from "@types";

import { VariantStatusBadge } from "./ExperimentStatusBadge";
import { VariantOutputs } from "./VariantOutputs";

const VariantCard: React.FC<{
  promptId: string;
  variant: SkillExperimentVariant;
  rubric: RubricCriterion[];
  trafficLabel?: string;
}> = ({ promptId, variant, rubric, trafficLabel }) => {
  const copy = en.skillExperiments.variants;
  const [showText, setShowText] = useState(false);
  const [showOutputs, setShowOutputs] = useState(false);
  const means = variant.criterionMeans ?? {};

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-light p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-typography-900">{variant.label}</span>
        <VariantStatusBadge status={variant.status} />
        {trafficLabel && <span className="text-xs text-typography-500">{trafficLabel}</span>}
        <span className="ml-auto text-sm text-typography-800">
          {variant.meanScore === null ? (
            <span className="text-typography-500">{copy.noScore}</span>
          ) : (
            <>
              <span className="font-medium">{variant.meanScore.toFixed(1)}</span>
              <span className="text-xs text-typography-500">
                {" "}
                · {copy.judged(variant.judgedCount)}
              </span>
            </>
          )}
        </span>
      </div>

      {Object.keys(means).length > 0 && (
        <p className="text-xs text-typography-600">
          <span className="sr-only">{copy.perCriterion}: </span>
          {rubric
            .filter(c => typeof means[c.key] === "number")
            .map(c => `${c.name} ${means[c.key].toFixed(1)}`)
            .join(" · ")}
        </p>
      )}
      {variant.changeSummary && (
        <p className="text-xs text-typography-700">
          <span className="font-medium">{copy.changeSummary}: </span>
          {variant.changeSummary}
        </p>
      )}
      {variant.hypothesis && (
        <p className="text-xs text-typography-700">
          <span className="font-medium">{copy.hypothesis}: </span>
          {variant.hypothesis}
        </p>
      )}
      {variant.statusReason && (
        <p className="text-xs text-typography-700">
          <span className="font-medium">{copy.outcome}: </span>
          {variant.statusReason}
        </p>
      )}

      <div className="flex gap-4 text-xs">
        <button
          type="button"
          className="text-typography-700 hover:text-typography-900"
          aria-expanded={showText}
          onClick={() => setShowText(v => !v)}
        >
          {showText ? copy.hideText : copy.showText}
        </button>
        {variant.status !== "rejected" && (
          <button
            type="button"
            className="text-typography-700 hover:text-typography-900"
            aria-expanded={showOutputs}
            onClick={() => setShowOutputs(v => !v)}
          >
            {showOutputs ? copy.hideOutputs : copy.showOutputs}
          </button>
        )}
      </div>
      {showText && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-xs text-typography-800">
          {variant.content}
        </pre>
      )}
      {showOutputs && <VariantOutputs promptId={promptId} variantId={variant.id} rubric={rubric} />}
    </div>
  );
};

/**
 * Every version, current run first. Earlier runs fold away: they explain how
 * the skill got here but say nothing about what is serving now.
 */
export const VariantList: React.FC<{
  promptId: string;
  variants: SkillExperimentVariant[];
  currentRun: number;
  rubric: RubricCriterion[];
  challengerPercent: number;
  live: boolean;
}> = ({ promptId, variants, currentRun, rubric, challengerPercent, live }) => {
  const copy = en.skillExperiments.variants;
  const current = variants.filter(v => v.run === currentRun);
  const earlier = variants.filter(v => v.run !== currentRun);
  const challengerLive = live && current.some(v => v.status === "challenger");

  const traffic = (v: SkillExperimentVariant) => {
    if (!live) return undefined;
    if (v.status === "challenger") return `${challengerPercent}%`;
    if (v.status === "champion") return `${challengerLive ? 100 - challengerPercent : 100}%`;
    return undefined;
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="variants-heading">
      <h3 id="variants-heading" className="text-base font-medium text-typography-900">
        {copy.heading}
      </h3>
      {current.length === 0 && earlier.length === 0 && (
        <p className="text-sm text-typography-500">{copy.none}</p>
      )}
      {current.map(v => (
        <VariantCard
          key={v.id}
          promptId={promptId}
          variant={v}
          rubric={rubric}
          trafficLabel={traffic(v)}
        />
      ))}
      {earlier.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-typography-700">
            {copy.earlierRuns(new Set(earlier.map(v => v.run)).size)}
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            {earlier.map(v => (
              <VariantCard
                key={v.id}
                promptId={promptId}
                variant={{ ...v, label: `${copy.run(v.run)} · ${v.label}` }}
                rubric={rubric}
              />
            ))}
          </div>
        </details>
      )}
    </section>
  );
};
