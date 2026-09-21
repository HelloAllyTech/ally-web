import React, { useMemo, useState } from "react";

import {
  Button,
  Checkbox,
  FilterableMultiSelect,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderQuestionEvent, BuilderQuestionOption, BuilderStructuredAnswer } from "@types";

import { builderTransition, prefersReducedMotion } from "../../pages/Builder/builderMotion";

/** What the chat sends back for an answered card. */
export interface BuilderAnswerPayload {
  message: string;
  questionId: string;
  answer?: BuilderStructuredAnswer;
}

interface QuestionCardProps {
  question: BuilderQuestionEvent;
  /** On resume: a plain freeText/singleSelect answer (locks the card). */
  answeredWith?: string;
  /** On resume: a structured multi-select/dropdown answer (locks the card). */
  answeredAnswer?: BuilderStructuredAnswer;
  onAnswer: (payload: BuilderAnswerPayload) => void;
  disabled?: boolean;
  /** Pinned above the feed during a mid-build pause rather than inline. */
  emphasised?: boolean;
}

const normalizeOptions = (options: BuilderQuestionEvent["options"]): BuilderQuestionOption[] =>
  options ?? [];

/**
 * A question from the agent, rendered as an answer card.
 *
 * Single-select and free text answer inline; multi-select and dropdown gather
 * a set and confirm. The recommended option is marked and sorted first so the
 * common case is one click without reading four descriptions, and an
 * "own answer" entry is always available on a select question — an option
 * list the admin can't step outside of forces a wrong answer.
 *
 * Once answered the card locks and shows what was said, including on resume:
 * a re-openable question would let the transcript and the PRD disagree.
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  answeredWith,
  answeredAnswer,
  onAnswer,
  disabled = false,
  emphasised = false,
}) => {
  const strings = en.builder.question;

  // Recommended first — the eye lands on it before the alternatives, which is
  // the point of recommending anything.
  const options = useMemo(() => {
    const normalized = normalizeOptions(question.options);
    return [...normalized].sort(
      (a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended)),
    );
  }, [question.options]);

  const labelFor = (id: string) => options.find(o => o.id === id)?.label ?? id;

  const isSelect =
    question.kind === "singleSelect" ||
    question.kind === "multiSelect" ||
    question.kind === "dropdown";

  const summarizeAnswer = (answer?: BuilderStructuredAnswer): string | null => {
    if (!answer) return null;
    if (answer.none) return strings.noneOfThese;
    const parts = [
      ...(answer.selectedOptionIds ?? []).map(labelFor),
      ...(answer.customValues ?? []),
    ];
    return parts.length ? parts.join(", ") : null;
  };

  const [lockedSummary, setLockedSummary] = useState<string | null>(
    answeredWith ?? summarizeAnswer(answeredAnswer),
  );
  const answered = lockedSummary !== null;

  const [selected, setSelected] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<string[]>([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [freeText, setFreeText] = useState("");

  const lock = (summary: string) => setLockedSummary(summary || strings.noneOfThese);

  const submitFreeText = () => {
    const trimmed = freeText.trim();
    if (!trimmed || answered || disabled) return;
    lock(trimmed);
    onAnswer({ message: trimmed, questionId: question.id });
  };

  const submitSingle = (option: BuilderQuestionOption) => {
    if (answered || disabled) return;
    lock(option.label);
    onAnswer({
      message: option.label,
      questionId: question.id,
      answer: { selectedOptionIds: [option.id] },
    });
  };

  const submitSingleCustom = () => {
    const trimmed = customDraft.trim();
    if (!trimmed || answered || disabled) return;
    lock(trimmed);
    onAnswer({
      message: trimmed,
      questionId: question.id,
      answer: { customValues: [trimmed] },
    });
  };

  const submitNone = () => {
    if (answered || disabled) return;
    lock(strings.noneOfThese);
    onAnswer({
      message: strings.noneOfThese,
      questionId: question.id,
      answer: { none: true },
    });
  };

  const toggleOption = (id: string, checked: boolean) => {
    setNoneSelected(false);
    setSelected(prev => (checked ? [...prev, id] : prev.filter(x => x !== id)));
  };

  const addCustomValue = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) return;
    setNoneSelected(false);
    setCustomValues(prev => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setCustomDraft("");
  };

  const selectedCount = selected.length + customValues.length;
  const minSelections = question.minSelections ?? 1;
  const canConfirmMulti = noneSelected || selectedCount >= minSelections;

  const confirmMulti = () => {
    if (answered || disabled || !canConfirmMulti) return;
    if (noneSelected) {
      submitNone();
      return;
    }
    const labels = [...selected.map(labelFor), ...customValues];
    const message = labels.join(", ");
    lock(message);
    onAnswer({
      message,
      questionId: question.id,
      answer: {
        ...(selected.length ? { selectedOptionIds: selected } : {}),
        ...(customValues.length ? { customValues } : {}),
      },
    });
  };

  const renderCustomEntry = (onAdd: () => void) => (
    <div className="mt-3 flex items-end gap-2">
      <TextInput
        id={`builder-custom-${question.id}`}
        labelText={strings.addCustom}
        hideLabel
        size="sm"
        placeholder={strings.addCustomPlaceholder}
        value={customDraft}
        disabled={disabled || answered}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          setCustomDraft(event.target.value)
        }
        onKeyDown={(event: React.KeyboardEvent) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onAdd();
          }
        }}
      />
      <Button
        kind="tertiary"
        size="sm"
        disabled={disabled || answered || !customDraft.trim()}
        onClick={onAdd}
      >
        {strings.add}
      </Button>
    </div>
  );

  function renderConfirmRow() {
    return (
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-typography-500">
          {noneSelected ? strings.noneOfThese : strings.selectedCountLabel(selectedCount)}
          {!noneSelected && minSelections > 1 && selectedCount < minSelections
            ? ` · ${strings.minSelectionsHint(minSelections)}`
            : ""}
        </span>
        <Button
          kind="primary"
          size="sm"
          disabled={disabled || !canConfirmMulti}
          onClick={confirmMulti}
        >
          {strings.confirmSelection}
        </Button>
      </div>
    );
  }

  const renderBody = () => {
    if (answered) {
      return (
        <div className="mt-2 flex items-center gap-2">
          <Tag type="green" size="sm">
            {strings.answeredLabel}
          </Tag>
          <p className="text-sm italic text-typography-700">{lockedSummary}</p>
        </div>
      );
    }

    if (!isSelect) {
      return (
        <div className="mt-3 flex flex-col gap-2">
          <TextArea
            id={`builder-question-${question.id}`}
            labelText={strings.freeTextPlaceholder}
            hideLabel
            value={freeText}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFreeText(event.target.value)
            }
            placeholder={strings.freeTextPlaceholder}
            disabled={disabled}
            rows={2}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitFreeText();
              }
            }}
          />
          <div className="flex justify-end">
            <Button
              kind="primary"
              size="sm"
              disabled={disabled || !freeText.trim()}
              onClick={submitFreeText}
            >
              {strings.submitAnswer}
            </Button>
          </div>
        </div>
      );
    }

    // Single select — one click answers. Each option shows its trade-off, so
    // the choice is made from the card rather than from memory of the chat.
    if (question.kind === "singleSelect") {
      return (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                autoFocus={index === 0 && Boolean(option.recommended) && !disabled}
                onClick={() => submitSingle(option)}
                style={{
                  transition: builderTransition(["background-color", "border-color"], "fast"),
                }}
                className={[
                  "w-full rounded border px-3 py-2 text-left",
                  "hover:border-primary-500 hover:bg-primary-50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  option.recommended ? "border-primary-400 bg-primary-50/40" : "border-neutral-300",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium text-typography-900">{option.label}</span>
                  {/* A plain span, not a Carbon <Tag>: Tag renders a <button>,
                      and a button inside this option button is invalid DOM —
                      it also steals the click that should pick the option. */}
                  {option.recommended && (
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                      {strings.recommended}
                    </span>
                  )}
                </span>
                {option.description && (
                  <span className="mt-0.5 block text-xs text-typography-600">
                    {option.description}
                  </span>
                )}
              </button>
            ))}
            {question.allowNone && (
              <Button kind="ghost" size="sm" disabled={disabled} onClick={submitNone}>
                {strings.noneOfThese}
              </Button>
            )}
          </div>
          {question.allowCustom && renderCustomEntry(submitSingleCustom)}
        </>
      );
    }

    if (question.kind === "dropdown") {
      const selectedItems = options.filter(o => selected.includes(o.id));
      return (
        <div className="mt-3 flex flex-col gap-2">
          <FilterableMultiSelect
            id={`builder-dropdown-${question.id}`}
            titleText=""
            placeholder={strings.selectPlaceholder}
            items={options}
            itemToString={(item: BuilderQuestionOption | null) => item?.label ?? ""}
            selectedItems={selectedItems}
            disabled={disabled}
            onChange={({
              selectedItems: next,
            }: {
              selectedItems: BuilderQuestionOption[] | null;
            }) => {
              setNoneSelected(false);
              setSelected((next ?? []).map(item => item.id));
            }}
          />
          {question.allowCustom && renderCustomEntry(addCustomValue)}
          {customValues.length > 0 && (
            <p className="text-xs text-typography-600">{customValues.join(", ")}</p>
          )}
          {renderConfirmRow()}
        </div>
      );
    }

    return (
      <div className="mt-3 flex flex-col gap-1.5">
        {options.map(option => (
          <Checkbox
            key={option.id}
            id={`builder-opt-${question.id}-${option.id}`}
            labelText={
              option.description ? `${option.label} — ${option.description}` : option.label
            }
            checked={selected.includes(option.id)}
            disabled={disabled}
            onChange={(_event: unknown, { checked }: { checked: boolean }) =>
              toggleOption(option.id, checked)
            }
          />
        ))}
        {customValues.map(value => (
          <Checkbox
            key={`custom-${value}`}
            id={`builder-custom-opt-${question.id}-${value}`}
            labelText={value}
            checked
            disabled={disabled}
            onChange={(_event: unknown, { checked }: { checked: boolean }) => {
              if (!checked) setCustomValues(prev => prev.filter(v => v !== value));
            }}
          />
        ))}
        {question.allowNone && (
          <Checkbox
            id={`builder-none-${question.id}`}
            labelText={strings.noneOfThese}
            checked={noneSelected}
            disabled={disabled}
            onChange={(_event: unknown, { checked }: { checked: boolean }) => {
              setNoneSelected(checked);
              if (checked) {
                setSelected([]);
                setCustomValues([]);
              }
            }}
          />
        )}
        {question.allowCustom && renderCustomEntry(addCustomValue)}
        {renderConfirmRow()}
      </div>
    );
  };

  return (
    <div className="flex justify-start">
      <Tile
        className={[
          "w-full max-w-[92%]",
          emphasised && !answered ? "border-l-4 border-l-primary-500" : "",
        ].join(" ")}
        style={
          prefersReducedMotion()
            ? undefined
            : { transition: builderTransition(["box-shadow"], "moderate") }
        }
      >
        <p className="text-sm font-medium text-typography-900">{question.prompt}</p>
        {/* Why this question, now — tells a clarification apart from a fresh
            line of enquiry, which is otherwise invisible to the reader. */}
        {question.rationale && (
          <p className="mt-1 text-xs italic text-typography-500">{question.rationale}</p>
        )}
        {renderBody()}
      </Tile>
    </div>
  );
};
