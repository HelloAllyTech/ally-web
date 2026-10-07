import React, { useState } from "react";

import { useGetSkillExperimentObservationsQuery } from "@api";
import { en } from "@constants";
import { RubricCriterion, SkillExperimentObservation } from "@types";

const PAGE = 10;

const describe = (o: SkillExperimentObservation): string | null => {
  const copy = en.skillExperiments.outputs;
  if (o.status === "failed") return copy.judgeFailed;
  if (o.skillError) return copy.failedCall;
  if (o.formatOk === false) return copy.brokeFormat;
  return null;
};

/** One version's judged outputs, newest first — what the scores are made of. */
export const VariantOutputs: React.FC<{
  promptId: string;
  variantId: string;
  rubric: RubricCriterion[];
}> = ({ promptId, variantId, rubric }) => {
  const copy = en.skillExperiments.outputs;
  const [limit, setLimit] = useState(PAGE);
  const { data, isLoading, isError } = useGetSkillExperimentObservationsQuery({
    promptId,
    variantId,
    limit,
  });
  const names = Object.fromEntries(rubric.map(c => [c.key, c.name]));

  if (isLoading) return <p className="text-xs text-typography-500">{copy.loading}</p>;
  if (isError) return <p className="text-xs text-destructive-700">{copy.error}</p>;
  if (!data?.items.length) return <p className="text-xs text-typography-500">{copy.empty}</p>;

  return (
    <div className="flex flex-col gap-2">
      {data.items.map(o => {
        const problem = describe(o);
        return (
          <details key={o.id} className="rounded border border-border-light p-2 text-xs">
            <summary className="cursor-pointer text-typography-800">
              <span className="font-medium">{o.score === null ? "—" : Math.round(o.score)}</span>
              {" · "}
              {problem ?? o.judgeSummary ?? ""}
            </summary>
            <div className="mt-2 flex flex-col gap-2 text-typography-700">
              {o.criterionScores && (
                <ul className="flex flex-col gap-1">
                  {Object.entries(o.criterionScores).map(([key, verdict]) => (
                    <li key={key}>
                      <span className="font-medium">
                        {names[key] ?? key}: {verdict.score}/5
                      </span>
                      {verdict.reason ? ` — ${verdict.reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {(o.skillError || o.judgeError) && (
                <p className="text-destructive-700">{o.skillError ?? o.judgeError}</p>
              )}
              <div>
                <p className="font-medium">{copy.input}</p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">
                  {JSON.stringify(o.input, null, 2)}
                </pre>
              </div>
              {o.output && (
                <div>
                  <p className="font-medium">{copy.output}</p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2">
                    {o.output}
                  </pre>
                </div>
              )}
            </div>
          </details>
        );
      })}
      {data.count > data.items.length && (
        <button
          type="button"
          className="self-start text-xs text-typography-700 hover:text-typography-900"
          onClick={() => setLimit(prev => Math.min(prev + PAGE, 100))}
        >
          {copy.more} ({data.items.length} / {data.count})
        </button>
      )}
    </div>
  );
};
