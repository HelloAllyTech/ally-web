import { FC } from "react";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { AddItemButton, FormLabel } from "@components";
import { AgentTestCaseRubric } from "@types";

interface RubricsEditorProps {
  rubrics: AgentTestCaseRubric[];
  onChange: (rubrics: AgentTestCaseRubric[]) => void;
}

const EMPTY_RUBRIC: AgentTestCaseRubric = { criteria: "", scoringInstructions: "" };

/** Repeatable {criteria, scoringInstructions} rows for a full-session test case. */
export const RubricsEditor: FC<RubricsEditorProps> = ({ rubrics, onChange }) => {
  const updateRow = (index: number, patch: Partial<AgentTestCaseRubric>) =>
    onChange(rubrics.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const removeRow = (index: number) => onChange(rubrics.filter((_, i) => i !== index));

  const addRow = () => onChange([...rubrics, { ...EMPTY_RUBRIC }]);

  return (
    <div className="flex flex-col gap-3">
      <FormLabel>Rubrics</FormLabel>
      {rubrics.length === 0 ? (
        <p className="text-sm text-typography-600">
          No rubrics yet. Add a row to define what the agent is scored on.
        </p>
      ) : (
        rubrics.map((row, index) => (
          <div
            key={index}
            className="rounded border border-border-light bg-white p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-typography-700">Rubric {index + 1}</span>
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="text-destructive-500 hover:underline text-sm"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-typography-600">Criteria</label>
              <input
                type="text"
                value={row.criteria}
                onChange={e => updateRow(index, { criteria: e.target.value })}
                placeholder="What is being evaluated?"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-typography-600">Scoring instructions</label>
              <AutoExpandableTextarea
                value={row.scoringInstructions}
                onChange={value => updateRow(index, { scoringInstructions: value })}
                placeholder="How should this criteria be scored?"
                minHeight={72}
                maxLines={10}
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
              />
            </div>
          </div>
        ))
      )}
      <AddItemButton onClick={addRow} label="Add rubric" />
    </div>
  );
};
