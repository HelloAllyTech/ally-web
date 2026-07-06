import React from "react";

import { useDispatch } from "react-redux";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { AddItemButton } from "@components";
import { en } from "@constants";
import { removeRubricBehavior, upsertRubricBehavior } from "@reducer";
import {
  RoleplayBehaviorPolarity,
  RoleplayRubric,
  RoleplayRubricBehavior,
} from "@src/types/roleplayStudio";
import { roleplayEntityId } from "@utils/roleplaySpec";

import { SpecSectionCard } from "./SpecSectionCard";

interface RubricSectionProps {
  rubric: RoleplayRubric;
  readOnly?: boolean;
}

const PolarityChip: React.FC<{
  polarity: RoleplayBehaviorPolarity;
  onToggle: () => void;
  disabled?: boolean;
}> = ({ polarity, onToggle, disabled }) => {
  const strings = en.roleplayStudio.spec;
  const isPositive = polarity === "positive";
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      title={isPositive ? strings.polarityPositive : strings.polarityNegative}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs shrink-0 transition-colors disabled:cursor-not-allowed ${
        isPositive ? "bg-success-100 text-typography-900" : "bg-destructive-50 text-typography-900"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${isPositive ? "bg-success-400" : "bg-destructive-400"}`}
      />
      {isPositive ? strings.polarityPositive : strings.polarityNegative}
    </button>
  );
};

/** Behavior rows with polarity chips + weights, plus inline editing. */
export const RubricSection: React.FC<RubricSectionProps> = ({ rubric, readOnly = false }) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();

  const update = (behavior: RoleplayRubricBehavior, patch: Partial<RoleplayRubricBehavior>) =>
    dispatch(upsertRubricBehavior({ ...behavior, ...patch }));

  return (
    <SpecSectionCard title={strings.rubric} sections={["rubric"]}>
      <div className="flex flex-col gap-3">
        {rubric.behaviors.length === 0 && (
          <p className="text-sm text-typography-500">{strings.emptySection}</p>
        )}
        {rubric.behaviors.map(behavior => (
          <div
            key={behavior.id}
            className="rounded-md border border-border-light p-3 flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <input
                value={behavior.name}
                disabled={readOnly}
                placeholder={strings.behaviorName}
                onChange={event => update(behavior, { name: event.target.value })}
                className="flex-1 min-w-0 rounded-md border border-border-light px-3 py-1.5 text-sm font-medium outline-none focus:border-primary-500 disabled:bg-neutral-50"
              />
              <PolarityChip
                polarity={behavior.polarity}
                disabled={readOnly}
                onToggle={() =>
                  update(behavior, {
                    polarity: behavior.polarity === "positive" ? "negative" : "positive",
                  })
                }
              />
              <label className="flex items-center gap-1.5 text-xs text-typography-700 shrink-0">
                {strings.behaviorWeight}
                <input
                  type="number"
                  value={behavior.weight}
                  disabled={readOnly}
                  onChange={event => update(behavior, { weight: Number(event.target.value) || 0 })}
                  className="w-16 rounded-md border border-border-light px-2 py-1 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
                />
              </label>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => dispatch(removeRubricBehavior(behavior.id))}
                  className="text-xs text-typography-600 hover:text-destructive-500 shrink-0"
                >
                  {strings.remove}
                </button>
              )}
            </div>
            <AutoExpandableTextarea
              value={behavior.description}
              onChange={description => update(behavior, { description })}
              placeholder={strings.behaviorDescription}
              disabled={readOnly}
              minHeight={40}
              maxLines={8}
              className="w-full rounded-md border border-border-light px-3 py-2 text-sm outline-none focus:border-primary-500 disabled:bg-neutral-50"
            />
            {behavior.examples?.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-typography-700">{strings.behaviorExamples}</span>
                <ul className="list-disc list-inside">
                  {behavior.examples.map((example, index) => (
                    <li
                      key={`${behavior.id}-example-${index}`}
                      className="text-xs text-typography-700"
                    >
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {!readOnly && (
          <AddItemButton
            label={strings.addBehavior}
            onClick={() =>
              dispatch(
                upsertRubricBehavior({
                  id: roleplayEntityId("behavior"),
                  name: "",
                  description: "",
                  polarity: "positive",
                  weight: 1,
                  examples: [],
                }),
              )
            }
          />
        )}
      </div>
    </SpecSectionCard>
  );
};
