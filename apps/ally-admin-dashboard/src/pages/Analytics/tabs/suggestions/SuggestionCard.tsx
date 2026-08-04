import React from "react";

import { Tag, Tile } from "@ally-ui-mono/ui-shared";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { AnalyticsSuggestion, AnalyticsSuggestionStatus, RoadmapOpportunityType } from "@types";

const fill = (template: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );

interface SuggestionCardProps {
  suggestion: AnalyticsSuggestion;
  onAccept: (suggestion: AnalyticsSuggestion) => void;
  onReject: (suggestion: AnalyticsSuggestion) => void;
}

/**
 * One suggestion, with everything needed to disagree with it.
 *
 * The card leads with the claim and ends with its provenance — the window it was
 * derived from and the model that drafted it — because a suggestion is only as good
 * as the evidence behind it, and both facts are what make it checkable later. The
 * evidence list is shown rather than folded away for the same reason.
 *
 * The footer changes with the decision instead of disappearing: an accepted card
 * links to what it became, and a rejected one shows the reason that will keep it
 * from being proposed again. A queue that only ever showed open items would hide
 * the record of what was decided.
 */
export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
}) => {
  const strings = en.analyticsSuggestions;
  const isPending = suggestion.status === AnalyticsSuggestionStatus.PENDING;

  return (
    <Tile className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <h4 className="text-typography-primary min-w-0 flex-1 text-base font-medium">
          {suggestion.title}
        </h4>
        <Tag type={suggestion.suggestedType === RoadmapOpportunityType.BUG ? "red" : "blue"}>
          {suggestion.suggestedType === RoadmapOpportunityType.BUG
            ? strings.typeBug
            : strings.typeIdea}
        </Tag>
        {/* An unmatched goal is stated, not blanked: null means the model's answer
            was not a live goal, which is a fact about the suggestion. */}
        <Tag type={suggestion.suggestedGoal ? "green" : "gray"}>
          {suggestion.suggestedGoal ?? strings.noGoalMatched}
        </Tag>
      </div>

      <p className="text-typography-800 text-sm whitespace-pre-line">{suggestion.body}</p>

      {suggestion.rationale && (
        <div>
          <div className="text-typography-600 text-xs uppercase">{strings.rationaleLabel}</div>
          <p className="text-typography-700 text-sm">{suggestion.rationale}</p>
        </div>
      )}

      {suggestion.evidence.length > 0 && (
        <div>
          <div className="text-typography-600 text-xs uppercase">{strings.evidenceLabel}</div>
          <ul className="text-typography-700 list-disc pl-5 text-sm">
            {suggestion.evidence.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-typography-500 text-xs">
        {fill(strings.provenance, {
          window: suggestion.window.label,
          model: suggestion.model,
        })}
      </div>

      {isPending && (
        <div className="flex gap-2">
          <Button variant={ButtonVariant.PRIMARY} onClick={() => onAccept(suggestion)}>
            {strings.accept}
          </Button>
          <Button variant={ButtonVariant.SECONDARY} onClick={() => onReject(suggestion)}>
            {strings.reject}
          </Button>
        </div>
      )}

      {suggestion.status === AnalyticsSuggestionStatus.ACCEPTED &&
        (suggestion.opportunityId ? (
          <a
            className="text-primary-500 text-sm underline"
            href={`${ROUTES.PRODUCT_ROADMAP}?opportunity=${suggestion.opportunityId}`}
          >
            {strings.viewOnRoadmap}
          </a>
        ) : (
          <div className="text-typography-600 text-sm">{strings.opportunityGone}</div>
        ))}

      {suggestion.status === AnalyticsSuggestionStatus.REJECTED && (
        <div className="text-typography-600 text-sm">
          {suggestion.rejectedReason
            ? fill(strings.rejectedBecause, { reason: suggestion.rejectedReason })
            : strings.rejectedNoReason}
        </div>
      )}
    </Tile>
  );
};
