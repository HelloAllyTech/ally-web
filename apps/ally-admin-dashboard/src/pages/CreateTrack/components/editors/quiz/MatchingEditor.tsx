import { FC } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { Select, SelectItem, Tooltip } from "@ally-ui-mono/ui-shared";
import { Plus, TooltipIcon, Trash } from "@assets";
import { MatchingPair, QuizOption, TrackFormValues } from "@types";

interface MatchingEditorProps {
  questionPath: `sections.${number}.items.${number}.quiz.questions.${number}`;
}

const newId = () => crypto.randomUUID();

/**
 * Matching editor: left prompts, right answers (which may include distractors),
 * and a per-left mapping to the correct right entry stored in `correctPairs`.
 */
export const MatchingEditor: FC<MatchingEditorProps> = ({ questionPath }) => {
  const { control, setValue } = useFormContext<TrackFormValues>();

  const leftName = `${questionPath}.left` as `sections.0.items.0.quiz.questions.0.left`;
  const rightName = `${questionPath}.right` as `sections.0.items.0.quiz.questions.0.right`;
  const pairsName =
    `${questionPath}.correctPairs` as `sections.0.items.0.quiz.questions.0.correctPairs`;

  const left = (useWatch({ control, name: leftName }) ?? []) as QuizOption[];
  const right = (useWatch({ control, name: rightName }) ?? []) as QuizOption[];
  const correctPairs = (useWatch({ control, name: pairsName }) ?? []) as MatchingPair[];

  const setLeft = (next: QuizOption[]) => setValue(leftName, next, { shouldDirty: true });
  const setRight = (next: QuizOption[]) => setValue(rightName, next, { shouldDirty: true });
  const setPairs = (next: MatchingPair[]) => setValue(pairsName, next, { shouldDirty: true });

  const updateLeftText = (index: number, text: string) => {
    setLeft(left.map((entry, i) => (i === index ? { ...entry, text } : entry)));
  };
  const updateRightText = (index: number, text: string) => {
    setRight(right.map((entry, i) => (i === index ? { ...entry, text } : entry)));
  };

  const addPairRow = () => {
    setLeft([...left, { id: newId(), text: "" }]);
    setRight([...right, { id: newId(), text: "" }]);
  };

  const removePairRow = (index: number) => {
    const removedLeftId = left[index]?.id;
    const removedRightId = right[index]?.id;
    setLeft(left.filter((_, i) => i !== index));
    setRight(right.filter((_, i) => i !== index));
    setPairs(
      correctPairs.filter(pair => pair.leftId !== removedLeftId && pair.rightId !== removedRightId),
    );
  };

  const addDistractor = () => {
    setRight([...right, { id: newId(), text: "" }]);
  };

  const removeRight = (id: string) => {
    setRight(right.filter(entry => entry.id !== id));
    setPairs(correctPairs.filter(pair => pair.rightId !== id));
  };

  const getMatchFor = (leftId: string): string =>
    correctPairs.find(pair => pair.leftId === leftId)?.rightId ?? "";

  const setMatchFor = (leftId: string, rightId: string) => {
    const others = correctPairs.filter(pair => pair.leftId !== leftId);
    setPairs(rightId ? [...others, { leftId, rightId }] : others);
  };

  return (
    <div className="flex flex-col gap-4">
      <label className="text-sm font-medium text-typography-800">Pairs</label>
      <div className="flex flex-col gap-2">
        {left.map((leftEntry, index) => (
          <div key={leftEntry.id} className="flex items-center gap-2">
            <input
              value={leftEntry.text}
              onChange={event => updateLeftText(index, event.target.value)}
              placeholder={`Left ${index + 1}`}
              className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <input
              value={right[index]?.text ?? ""}
              onChange={event => updateRightText(index, event.target.value)}
              placeholder={`Right ${index + 1}`}
              className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
            />
            <Select
              id={`matching-${leftEntry.id}`}
              labelText="Match to…"
              hideLabel
              className="max-w-[160px]"
              value={getMatchFor(leftEntry.id)}
              onChange={event => setMatchFor(leftEntry.id, event.target.value)}
            >
              <SelectItem value="" text="Match to…" />
              {right.map(rightEntry => (
                <SelectItem
                  key={rightEntry.id}
                  value={rightEntry.id}
                  text={rightEntry.text || "(untitled)"}
                />
              ))}
            </Select>
            {left.length > 2 && (
              <button
                type="button"
                onClick={() => removePairRow(index)}
                className="text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Distractor rights: right entries beyond the paired rows. */}
      {right.length > left.length && (
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1">
            <label className="text-xs font-medium text-typography-600">
              Extra right options (distractors)
            </label>
            <Tooltip
              label="A distractor is a right-side option with no correct match. Add one to make the question harder without changing the number of correct pairs."
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          </span>
          {right.slice(left.length).map(entry => (
            <div key={entry.id} className="flex items-center gap-2">
              <input
                value={entry.text}
                onChange={event =>
                  setRight(
                    right.map(r => (r.id === entry.id ? { ...r, text: event.target.value } : r)),
                  )
                }
                placeholder="Distractor answer"
                className="flex-1 border border-border-light rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary-400"
              />
              <button
                type="button"
                onClick={() => removeRight(entry.id)}
                className="text-destructive-500 hover:text-destructive-600"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={addPairRow}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          <Plus className="w-4 h-4" />
          Add pair
        </button>
        <button
          type="button"
          onClick={addDistractor}
          className="inline-flex items-center gap-1 text-sm text-typography-600 hover:text-typography-900"
        >
          <Plus className="w-4 h-4" />
          Add distractor
        </button>
      </div>
    </div>
  );
};
