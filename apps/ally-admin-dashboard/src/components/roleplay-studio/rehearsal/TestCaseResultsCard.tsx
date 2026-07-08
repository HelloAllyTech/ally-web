import React from "react";

import { en } from "@constants";
import {
  RoleplayRehearsalTestCaseSnapshot,
  RoleplayTestCaseResult,
} from "@src/types/roleplayStudio";

import { VerdictBadge } from "./VerdictBadge";

interface TestCaseResultsCardProps {
  results: RoleplayTestCaseResult[];
  /** Launch-time snapshots (`rehearsal.config.testCases`) for title fallback. */
  testCases?: RoleplayRehearsalTestCaseSnapshot[];
  /** Jumps to the matching transcript tab. */
  onViewTranscript?: (testCaseId: string) => void;
}

/** Per-test-case verdicts with evidence/reasoning expanders. */
export const TestCaseResultsCard: React.FC<TestCaseResultsCardProps> = ({
  results,
  testCases,
  onViewTranscript,
}) => {
  const strings = en.roleplayStudio.rehearsal;

  if (results.length === 0) return null;

  const titleFor = (result: RoleplayTestCaseResult): string =>
    result.title ??
    testCases?.find(snapshot => snapshot.id === result.test_case_id)?.title ??
    result.test_case_id;

  const passed = results.filter(result => result.verdict === "PASSED").length;

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-typography-900">{strings.testCaseResults}</h4>
        <span className="text-sm text-typography-700">
          {strings.passedSummary(passed, results.length)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {results.map(result => (
          <div
            key={result.test_case_id}
            className="rounded-md border border-border-light p-3"
            data-testid={`test-case-result-${result.test_case_id}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <VerdictBadge verdict={result.verdict} />
                <span className="truncate text-sm text-typography-900">{titleFor(result)}</span>
              </div>
              {onViewTranscript && (
                <button
                  type="button"
                  onClick={() => onViewTranscript(result.test_case_id)}
                  className="shrink-0 text-xs text-primary-500 hover:underline"
                >
                  {strings.viewTranscript}
                </button>
              )}
            </div>

            {result.verdict === "INCONCLUSIVE" && (
              <p className="mt-1 text-xs italic text-typography-600">{strings.inconclusiveHint}</p>
            )}

            {(result.evidence || result.reasoning) && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-typography-700">
                  {strings.evidence} / {strings.reasoning}
                </summary>
                <div className="mt-2 flex flex-col gap-2">
                  {result.evidence && (
                    <div>
                      <span className="text-xs font-medium text-typography-700">
                        {strings.evidence}
                      </span>
                      <p className="whitespace-pre-wrap text-xs text-typography-800">
                        {result.evidence}
                      </p>
                    </div>
                  )}
                  {result.reasoning && (
                    <div>
                      <span className="text-xs font-medium text-typography-700">
                        {strings.reasoning}
                      </span>
                      <p className="whitespace-pre-wrap text-xs text-typography-800">
                        {result.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
