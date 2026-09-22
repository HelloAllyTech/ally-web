import { FC, useCallback } from "react";

import { AutoExpandableTextarea, Tooltip } from "@ally-ui-mono/ui-shared";
import { Add, TooltipIcon, Trash } from "@assets";
import type { BinaryClassificationExample } from "@types";

/**
 * Editor for a binary classifier's few-shot examples.
 *
 * The two polarities sit SIDE BY SIDE rather than stacked, because the thing
 * an author has to check is the boundary between them — whether each negative
 * is close enough to the positives to actually calibrate it. Reading them as
 * two separate lists hides exactly the comparison that matters ("Comparative
 * contrast for malrule and misconception correction").
 *
 * This is the main review surface for a generated event. The class name is one
 * line and reads plausibly almost however it is written; the examples are where
 * a wrong boundary is visible.
 */

interface ExampleColumnProps {
  title: string;
  hint: string;
  tooltip: string;
  emptyHint: string;
  examples: BinaryClassificationExample[];
  onChange: (examples: BinaryClassificationExample[]) => void;
  max: number;
  disabled: boolean;
  placeholder: string;
}

const ExampleColumn: FC<ExampleColumnProps> = ({
  title,
  hint,
  tooltip,
  emptyHint,
  examples,
  onChange,
  max,
  disabled,
  placeholder,
}) => {
  const updateAt = useCallback(
    (index: number, text: string) => {
      onChange(examples.map((example, i) => (i === index ? { text } : example)));
    },
    [examples, onChange],
  );

  const removeAt = useCallback(
    (index: number) => {
      onChange(examples.filter((_, i) => i !== index));
    },
    [examples, onChange],
  );

  const addOne = useCallback(() => {
    onChange([...examples, { text: "" }]);
  }, [examples, onChange]);

  const atCapacity = examples.length >= max;

  return (
    <div className="flex flex-1 flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-base font-regular text-typography-800">{title}</span>
        <Tooltip label={tooltip} align="top">
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
        <span className="ml-auto text-xs text-typography-500">
          {examples.length}/{max}
        </span>
      </div>
      <p className="text-xs text-typography-600">{hint}</p>

      {examples.length === 0 ? (
        // The empty state states what a good example looks like rather than
        // "None yet" — the difference between a useful example and a useless
        // one is the whole feature, and it is not guessable from the label.
        <p className="rounded-md border border-dashed border-border-light bg-neutral-50 px-3 py-4 text-xs text-typography-600">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {examples.map((example, index) => (
            <div
              key={index}
              className="flex items-start gap-2 rounded-md border border-border-light bg-white px-3 py-2"
            >
              <AutoExpandableTextarea
                value={example.text}
                onChange={(text: string) => updateAt(index, text)}
                placeholder={placeholder}
                minHeight={20}
                maxLines={6}
                className="flex-1 border-none bg-transparent p-0 text-sm focus:outline-none resize-none custom-scrollbar"
              />
              <button
                type="button"
                aria-label={`Remove example ${index + 1}`}
                onClick={() => removeAt(index)}
                disabled={disabled}
                className="mt-1 shrink-0 text-typography-500 hover:text-destructive-500 disabled:opacity-40"
              >
                <Trash width={14} height={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={addOne}
        disabled={disabled || atCapacity}
        className="flex w-fit items-center gap-1 text-sm text-primary-600 hover:underline disabled:cursor-not-allowed disabled:text-typography-400 disabled:no-underline"
      >
        <Add width={12} height={12} />
        Add example
      </button>
    </div>
  );
};

interface ClassifierExamplesEditorProps {
  positiveExamples: BinaryClassificationExample[];
  negativeExamples: BinaryClassificationExample[];
  onChange: (patch: {
    positiveExamples?: BinaryClassificationExample[];
    negativeExamples?: BinaryClassificationExample[];
  }) => void;
  /** Per polarity. Mirrors the server's MAX_EXAMPLES_PER_POLARITY. */
  max: number;
  disabled?: boolean;
}

export const ClassifierExamplesEditor: FC<ClassifierExamplesEditorProps> = ({
  positiveExamples,
  negativeExamples,
  onChange,
  max,
  disabled = false,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-start gap-6">
      <ExampleColumn
        title="Positive examples"
        hint="Things the counsellor might say that DO belong to this class."
        tooltip="Shown to the classifier before every judgement. Vary them — different phrasings and lengths, not one sentence reworded."
        emptyHint="No positive examples. A good one is a single counsellor utterance, written the way it would be spoken — “What was that like for you?”"
        placeholder="One counsellor utterance…"
        examples={positiveExamples}
        onChange={next => onChange({ positiveExamples: next })}
        max={max}
        disabled={disabled}
      />
      <ExampleColumn
        title="Negative examples"
        hint="Near misses — things a careless classifier would wrongly flag."
        tooltip="These do the real work. A negative only teaches the boundary if it is something the counsellor plausibly says in the same moment; an unrelated sentence teaches nothing."
        emptyHint="No negative examples. The useful ones are near misses — for an open-question class, “So you're feeling anxious, is that right?” (a question, on topic, but closed)."
        placeholder="One counsellor utterance…"
        examples={negativeExamples}
        onChange={next => onChange({ negativeExamples: next })}
        max={max}
        disabled={disabled}
      />
    </div>
    {/*
      Not a cosmetic limit, so it is stated where the author is deciding how
      many to keep: every example is re-sent on every learner turn, batched
      across every classifier on the simulation.
    */}
    <p className="text-xs text-typography-500">
      Examples are re-sent to the model on every learner turn, so keep only the ones that earn their
      place.
    </p>
  </div>
);
