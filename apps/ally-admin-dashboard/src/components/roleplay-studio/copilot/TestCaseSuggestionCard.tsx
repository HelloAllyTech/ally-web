import React, { useState } from "react";

import { toast } from "sonner";

import { useAcceptCopilotTestCasesMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { CopilotTestCaseSuggestion } from "@src/types/roleplayStudio";

interface TestCaseSuggestionCardProps {
  suggestion: CopilotTestCaseSuggestion;
  /** Copilot session — acceptance persists through the session endpoint. */
  sessionId: string | null;
  /** On resume: the suggestion was already accepted in a prior visit. */
  initiallyAccepted?: boolean;
}

/**
 * One copilot-suggested agent test case, rendered inline in the chat feed.
 * Accept persists it via the copilot session endpoint — which creates the
 * agent_test_cases row, wires its id into the spec's agentTestCaseIds, and
 * appends the "[accepted …]" transcript marker (resume fidelity). Dismiss
 * just hides the card.
 */
export const TestCaseSuggestionCard: React.FC<TestCaseSuggestionCardProps> = ({
  suggestion,
  sessionId,
  initiallyAccepted = false,
}) => {
  const strings = en.roleplayStudio.copilot;
  const [acceptTestCases, { isLoading }] = useAcceptCopilotTestCasesMutation();
  const [state, setState] = useState<"pending" | "accepted" | "dismissed">(
    initiallyAccepted ? "accepted" : "pending",
  );

  if (state === "dismissed") return null;

  const handleAccept = async () => {
    if (!sessionId) return;
    try {
      await acceptTestCases({
        sessionId,
        testCases: [
          {
            suggestionId: suggestion.id,
            title: suggestion.title,
            category: suggestion.category ?? "roleplay",
            description: suggestion.description ?? undefined,
            condition: suggestion.condition ?? undefined,
            test: suggestion.test ?? undefined,
          },
        ],
      }).unwrap();
      setState("accepted");
      toast.success(strings.testCaseSaved);
    } catch {
      toast.error(strings.testCaseSaveFailed);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-typography-900">{suggestion.title}</span>
            {suggestion.category && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-typography-700">
                {suggestion.category}
              </span>
            )}
          </div>
          {suggestion.condition && (
            <p className="mt-1.5 text-xs text-typography-800">
              <span className="font-medium">{strings.testCaseCondition}: </span>
              {suggestion.condition}
            </p>
          )}
          {suggestion.test && (
            <p className="mt-1 text-xs text-typography-800">
              <span className="font-medium">{strings.testCaseTest}: </span>
              {suggestion.test}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {state === "accepted" ? (
            <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs text-primary-600">
              {strings.testCaseAccepted}
            </span>
          ) : (
            <>
              <Button
                variant={ButtonVariant.SECONDARY}
                className="h-[28px] px-2.5 text-xs"
                onClick={() => setState("dismissed")}
                disabled={isLoading}
              >
                {strings.testCaseDismiss}
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                className="h-[28px] px-2.5 text-xs"
                onClick={handleAccept}
                disabled={isLoading || !sessionId}
              >
                {strings.testCaseAccept}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
