import React, { useMemo, useState } from "react";

import {
  Button,
  Checkbox,
  FilterableMultiSelect,
  TextArea,
  TextInput,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import {
  CharacterInterviewQuestionEvent,
  CharacterInterviewQuestionOption,
  CharacterInterviewStructuredAnswer,
} from "@types";

/** What the composer sends back for an answered card. */
export interface CharacterInterviewAnswerPayload {
  message: string;
  questionId: string;
  answer?: CharacterInterviewStructuredAnswer;
}

interface QuestionCardProps {
  question: CharacterInterviewQuestionEvent;
  /** On resume: a plain freeText/singleSelect answer (locks the card). */
  answeredWith?: string;
  /** On resume: a structured multi-select/dropdown answer (locks the card). */
  answeredAnswer?: CharacterInterviewStructuredAnswer;
  onAnswer: (payload: CharacterInterviewAnswerPayload) => void;
  disabled?: boolean;
}

/**
 * Structured `question` SSE events render as an answer card (same pattern as
 * the Roleplay Studio copilot's QuestionCard, adapted to the interview
 * agent's own event/answer types). Single-select and free-text answer
 * inline; multi-select and dropdown collect a set then Confirm. "None of
 * these" and an "add your own" entry are offered when the question allows
 * them. Once answered the card locks (also on resume).
 */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  answeredWith,
  answeredAnswer,
  onAnswer,
  disabled = false,
}) => {
  const strings = en.characterInterview;
  const options = useMemo(() => question.options ?? [], [question.options]);
  const labelFor = (id: string) => options.find(o => o.id === id)?.label ?? id;

  const isSelect =
    question.kind === "singleSelect" ||
    question.kind === "multiSelect" ||
    question.kind === "dropdown";

  const summarizeAnswer = (answer?: CharacterInterviewStructuredAnswer): string | null => {
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

  // Multi-select / dropdown working state.
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

  const submitSingle = (option: CharacterInterviewQuestionOption) => {
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
    <div className="mt-2 flex items-end gap-2">
      <TextInput
        id={`interview-custom-${question.id}`}
        labelText={strings.addCustom}
        hideLabel
        size="sm"
        placeholder={strings.addCustomPlaceholder}
        value={customDraft}
        disabled={disabled || answered}
        onChange={event => setCustomDraft(event.target.value)}
        onKeyDown={event => {
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

  const renderBody = () => {
    if (answered) {
      return <p className="mt-2 text-sm italic text-typography-700">{lockedSummary}</p>;
    }

    // Free text
    if (!isSelect) {
      return (
        <div className="mt-3 flex flex-col gap-2">
          <TextArea
            id={`interview-question-${question.id}`}
            labelText={strings.freeTextPlaceholder}
            hideLabel
            value={freeText}
            onChange={event => setFreeText(event.target.value)}
            placeholder={strings.freeTextPlaceholder}
            disabled={disabled}
            rows={2}
            onKeyDown={event => {
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

    // Single select — click a chip to answer immediately.
    if (question.kind === "singleSelect") {
      return (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.map(option => (
              <Button
                key={option.id}
                kind="tertiary"
                size="sm"
                disabled={disabled}
                onClick={() => submitSingle(option)}
              >
                {option.label}
              </Button>
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

    // Dropdown (long lists, e.g. voices).
    if (question.kind === "dropdown") {
      const selectedItems = options.filter(o => selected.includes(o.id));
      return (
        <div className="mt-3 flex flex-col gap-2">
          <FilterableMultiSelect
            id={`interview-dropdown-${question.id}`}
            titleText=""
            placeholder={strings.selectPlaceholder}
            items={options}
            itemToString={(item: CharacterInterviewQuestionOption | null) => item?.label ?? ""}
            selectedItems={selectedItems}
            disabled={disabled}
            onChange={({
              selectedItems: next,
            }: {
              selectedItems: CharacterInterviewQuestionOption[] | null;
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

    // Multi-select — checkbox list + optional none/custom, then Confirm.
    return (
      <div className="mt-3 flex flex-col gap-1.5">
        {options.map(option => (
          <Checkbox
            key={option.id}
            id={`interview-opt-${question.id}-${option.id}`}
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
            id={`interview-custom-opt-${question.id}-${value}`}
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
            id={`interview-none-${question.id}`}
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

  function renderConfirmRow() {
    return (
      <div className="mt-1 flex items-center justify-between">
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

  return (
    <div className="flex justify-start">
      <Tile className="max-w-[92%] w-full">
        <p className="text-sm font-medium text-typography-900">{question.prompt}</p>
        {renderBody()}
      </Tile>
    </div>
  );
};
