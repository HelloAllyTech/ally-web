import React from "react";

import { EventType } from "@components";
import { EVENT_DETECTION_TYPES, getTriggerConditionConfig, TRIGGER_FIELD_TYPES } from "@constants";

import { TriggerConditionField } from "./TriggerConditionField";

interface StandardTriggerConditionsProps {
  eventType: EventType | string;
  triggerCondition: any;
  onChange: (field: string, value: string | number | string[]) => void;
  isInTable?: boolean;
}

export const StandardTriggerConditions: React.FC<StandardTriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  onChange,
  isInTable = false,
}) => {
  const config = getTriggerConditionConfig(eventType);
  if (!config) return null;

  const fields = config.fields || [];
  const isTimeBased = eventType === EVENT_DETECTION_TYPES.TIME_BASED;
  const isSentenceSimilarity = eventType === EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY;
  const isSemanticSimilarity = eventType === EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY;
  const isScoreBased = eventType === EVENT_DETECTION_TYPES.SCORE_BASED;

  // Both sentence similarity and semantic similarity use the same layout
  const isMultilineLayout = isSentenceSimilarity || isSemanticSimilarity;

  return (
    <div
      className={`relative ${isMultilineLayout ? "flex items-start" : "flex items-center"} gap-2`}
    >
      {isMultilineLayout ? (
        <>
          <div className={`flex items-center gap-2 ${isInTable ? "" : "pl-2"} flex-shrink-0`}>
            <span className={`text-sm text-typography-500 flex-shrink-0`}>if</span>
            {fields
              .filter(field => field.type !== TRIGGER_FIELD_TYPES.MULTILINE_TEXT)
              .map(field => {
                const fieldValue = triggerCondition?.[field.id];
                return (
                  <TriggerConditionField
                    key={field.id}
                    field={field}
                    value={fieldValue}
                    onChange={onChange}
                    isInTable={isInTable}
                  />
                );
              })}
          </div>
          {fields
            .filter(field => field.type === TRIGGER_FIELD_TYPES.MULTILINE_TEXT)
            .map(field => {
              const fieldValue = triggerCondition?.[field.id];
              return (
                <TriggerConditionField
                  key={field.id}
                  field={field}
                  value={fieldValue}
                  onChange={onChange}
                  isInTable={isInTable}
                />
              );
            })}
        </>
      ) : (
        <>
          <span className={`text-sm text-typography-500 flex-shrink-0 ${isInTable ? "" : "pl-2"}`}>
            if
          </span>
          {isTimeBased && <span className="text-sm">Time</span>}
          {isScoreBased && <span className="text-sm">Score</span>}
          {fields.map(field => {
            const fieldValue = triggerCondition?.[field.id];
            return (
              <TriggerConditionField
                key={field.id}
                field={field}
                value={fieldValue}
                onChange={onChange}
                isInTable={isInTable}
              />
            );
          })}
        </>
      )}
    </div>
  );
};
