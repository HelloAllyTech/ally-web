import React from "react";

import { TrashCan } from "@carbon/icons-react";
import { useDispatch } from "react-redux";

import { Button, NumberInput, Stack, Tag, TextArea, TextInput, Tile } from "@ally-ui-mono/ui-shared";
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

/** Read-only polarity indicator; clickable to flip when editing. */
const PolarityControl: React.FC<{
  polarity: RoleplayBehaviorPolarity;
  onToggle: () => void;
  readOnly?: boolean;
}> = ({ polarity, onToggle, readOnly }) => {
  const strings = en.roleplayStudio.spec;
  const isPositive = polarity === "positive";
  const label = isPositive ? strings.polarityPositive : strings.polarityNegative;
  const tag = (
    <Tag type={isPositive ? "green" : "red"} size="sm">
      {label}
    </Tag>
  );
  if (readOnly) return tag;
  return (
    <button type="button" onClick={onToggle} title={label} className="shrink-0">
      {tag}
    </button>
  );
};

/** Behavior rows with polarity + weights, read-only display or inline editing. */
export const RubricSection: React.FC<RubricSectionProps> = ({ rubric, readOnly = false }) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();

  const update = (behavior: RoleplayRubricBehavior, patch: Partial<RoleplayRubricBehavior>) =>
    dispatch(upsertRubricBehavior({ ...behavior, ...patch }));

  const renderExamples = (behavior: RoleplayRubricBehavior) =>
    behavior.examples?.length > 0 ? (
      <div className="flex flex-col gap-1">
        <p className="cds--label" style={{ marginBottom: 0 }}>
          {strings.behaviorExamples}
        </p>
        <ul className="list-disc list-inside">
          {behavior.examples.map((example, index) => (
            <li key={`${behavior.id}-example-${index}`} className="text-typography-700">
              {example}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <SpecSectionCard title={strings.rubric} sections={["rubric"]}>
      <div className="flex flex-col gap-3">
        {rubric.behaviors.length === 0 && (
          <p className="text-typography-500">{strings.emptySection}</p>
        )}
        {rubric.behaviors.map(behavior => (
          <Tile key={behavior.id}>
            <Stack gap={3}>
              {readOnly ? (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-medium text-typography-900 break-words">
                      {behavior.name || "—"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <PolarityControl polarity={behavior.polarity} onToggle={() => undefined} readOnly />
                      <Tag type="cool-gray" size="sm">{`${strings.behaviorWeight} ${behavior.weight}`}</Tag>
                    </div>
                  </div>
                  {behavior.description && (
                    <p className="text-typography-800 whitespace-pre-wrap break-words">
                      {behavior.description}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <TextInput
                        id={`behavior-name-${behavior.id}`}
                        labelText={strings.behaviorName}
                        value={behavior.name}
                        onChange={event => update(behavior, { name: event.target.value })}
                      />
                    </div>
                    <PolarityControl
                      polarity={behavior.polarity}
                      onToggle={() =>
                        update(behavior, {
                          polarity: behavior.polarity === "positive" ? "negative" : "positive",
                        })
                      }
                    />
                    <div className="w-24">
                      <NumberInput
                        id={`behavior-weight-${behavior.id}`}
                        label={strings.behaviorWeight}
                        value={behavior.weight}
                        onChange={(_event, { value }) => update(behavior, { weight: Number(value) || 0 })}
                      />
                    </div>
                    <Button
                      kind="ghost"
                      size="md"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription={strings.remove}
                      tooltipPosition="left"
                      onClick={() => dispatch(removeRubricBehavior(behavior.id))}
                    />
                  </div>
                  <TextArea
                    id={`behavior-description-${behavior.id}`}
                    labelText={strings.behaviorDescription}
                    value={behavior.description}
                    onChange={event => update(behavior, { description: event.target.value })}
                    rows={2}
                  />
                </>
              )}
              {renderExamples(behavior)}
            </Stack>
          </Tile>
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
