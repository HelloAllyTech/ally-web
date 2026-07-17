import React, { useState } from "react";

import { Button, Checkbox, TextInput, Tile } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { CopilotBehaviourReviewEvent, CopilotStructuredAnswer } from "@src/types/roleplayStudio";

import { CopilotAnswerPayload } from "./QuestionCard";

interface BehaviourReviewCardProps {
  review: CopilotBehaviourReviewEvent;
  /** On resume: the confirmed helpful/unhelpful sets (locks the card). */
  answeredAnswer?: CopilotStructuredAnswer;
  onAnswer: (payload: CopilotAnswerPayload) => void;
  disabled?: boolean;
}

interface BehaviourGroupState {
  /** name → checked, for the seeded items. */
  checked: Record<string, boolean>;
  /** trainer-added behaviours (always included). */
  custom: string[];
  draft: string;
}

const seedGroup = (items: CopilotBehaviourReviewEvent["helpful"]): BehaviourGroupState => ({
  checked: Object.fromEntries(items.map(item => [item.name, item.checked !== false])),
  custom: [],
  draft: "",
});

const groupResult = (
  items: CopilotBehaviourReviewEvent["helpful"],
  state: BehaviourGroupState,
): string[] => [
  ...items.filter(item => state.checked[item.name]).map(item => item.name),
  ...state.custom,
];

/**
 * `behaviour_review` card: two pre-checked polarity groups (helpful /
 * unhelpful) mapped from the selected competencies. The trainer unchecks
 * items and adds custom ones, then Confirm sends the final sets back. Locks
 * after answering (also on resume).
 */
export const BehaviourReviewCard: React.FC<BehaviourReviewCardProps> = ({
  review,
  answeredAnswer,
  onAnswer,
  disabled = false,
}) => {
  const strings = en.roleplayStudio.copilot;

  const [helpful, setHelpful] = useState<BehaviourGroupState>(() => seedGroup(review.helpful));
  const [unhelpful, setUnhelpful] = useState<BehaviourGroupState>(() =>
    seedGroup(review.unhelpful),
  );

  const summarizeResume = (): string | null => {
    if (!answeredAnswer) return null;
    const h = answeredAnswer.helpful ?? [];
    const u = answeredAnswer.unhelpful ?? [];
    return `${strings.behaviourReviewHelpful}: ${h.join(", ") || "—"} · ${
      strings.behaviourReviewUnhelpful
    }: ${u.join(", ") || "—"}`;
  };

  const [lockedSummary, setLockedSummary] = useState<string | null>(summarizeResume());
  const answered = lockedSummary !== null;

  const confirm = () => {
    if (answered || disabled) return;
    const helpfulNames = groupResult(review.helpful, helpful);
    const unhelpfulNames = groupResult(review.unhelpful, unhelpful);
    const message = `${strings.behaviourReviewHelpful}: ${
      helpfulNames.join(", ") || "—"
    } · ${strings.behaviourReviewUnhelpful}: ${unhelpfulNames.join(", ") || "—"}`;
    setLockedSummary(message);
    onAnswer({
      message,
      questionId: review.id,
      answer: { helpful: helpfulNames, unhelpful: unhelpfulNames },
    });
  };

  const renderGroup = (
    title: string,
    keyPrefix: string,
    items: CopilotBehaviourReviewEvent["helpful"],
    state: BehaviourGroupState,
    setState: React.Dispatch<React.SetStateAction<BehaviourGroupState>>,
  ) => (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-typography-600">{title}</p>
      {items.length === 0 && state.custom.length === 0 && (
        <p className="text-xs text-typography-500">{strings.behaviourReviewEmpty}</p>
      )}
      {items.map(item => (
        <Checkbox
          key={item.id}
          id={`${keyPrefix}-${item.id}`}
          labelText={item.name}
          checked={state.checked[item.name] ?? false}
          disabled={disabled || answered}
          onChange={(_event: unknown, { checked }: { checked: boolean }) =>
            setState(prev => ({ ...prev, checked: { ...prev.checked, [item.name]: checked } }))
          }
        />
      ))}
      {state.custom.map(value => (
        <Checkbox
          key={`${keyPrefix}-custom-${value}`}
          id={`${keyPrefix}-custom-${value}`}
          labelText={value}
          checked
          disabled={disabled || answered}
          onChange={(_event: unknown, { checked }: { checked: boolean }) => {
            if (!checked)
              setState(prev => ({ ...prev, custom: prev.custom.filter(v => v !== value) }));
          }}
        />
      ))}
      {review.allowCustom && !answered && (
        <div className="mt-1 flex items-end gap-2">
          <TextInput
            id={`${keyPrefix}-add`}
            labelText={strings.addCustom}
            hideLabel
            size="sm"
            placeholder={strings.addCustomPlaceholder}
            value={state.draft}
            disabled={disabled}
            onChange={event => setState(prev => ({ ...prev, draft: event.target.value }))}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                setState(prev => {
                  const trimmed = prev.draft.trim();
                  if (!trimmed || prev.custom.includes(trimmed)) return { ...prev, draft: "" };
                  return { ...prev, custom: [...prev.custom, trimmed], draft: "" };
                });
              }
            }}
          />
          <Button
            kind="tertiary"
            size="sm"
            disabled={disabled || !state.draft.trim()}
            onClick={() =>
              setState(prev => {
                const trimmed = prev.draft.trim();
                if (!trimmed || prev.custom.includes(trimmed)) return { ...prev, draft: "" };
                return { ...prev, custom: [...prev.custom, trimmed], draft: "" };
              })
            }
          >
            {strings.add}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex justify-start">
      <Tile className="max-w-[92%] w-full">
        <p className="text-sm font-medium text-typography-900">{review.prompt}</p>
        {answered ? (
          <p className="mt-2 text-sm italic text-typography-700">{lockedSummary}</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {renderGroup(
              strings.behaviourReviewHelpful,
              `rp-bhv-h-${review.id}`,
              review.helpful,
              helpful,
              setHelpful,
            )}
            {renderGroup(
              strings.behaviourReviewUnhelpful,
              `rp-bhv-u-${review.id}`,
              review.unhelpful,
              unhelpful,
              setUnhelpful,
            )}
            <div className="flex justify-end">
              <Button kind="primary" size="sm" disabled={disabled} onClick={confirm}>
                {strings.behaviourReviewConfirm}
              </Button>
            </div>
          </div>
        )}
      </Tile>
    </div>
  );
};
