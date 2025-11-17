import React from "react";

import { EventType } from "@components/event-type-selection-dialog";
import { getTriggerConditionConfig, TRIGGER_FIELD_TYPES } from "@constants/TriggerConditionsConfig";

import { TriggerConditionField } from "./TriggerConditionField";

interface StandardTriggerConditionsProps {
  eventType: EventType | string;
  triggerCondition: any;
  onChange: (field: string, value: string | number | string[]) => void;
  isInTable?: boolean;
  isFocused?: boolean;
}

export const StandardTriggerConditions: React.FC<StandardTriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  onChange,
  isInTable = false,
  isFocused = false,
}) => {
  const config = getTriggerConditionConfig(eventType);
  if (!config) return null;

  const fields = config.fields || [];
  const isTimeBased = eventType === "TIME_BASED";
  const isSentenceSimilarity = eventType === "SENTENCE_SIMILARITY";

  return (
    <div
      className={`relative ${isSentenceSimilarity && isFocused ? "flex items-start" : "flex items-center"} gap-2`}
    >
      {isSentenceSimilarity ? (
        <>
          <div className={`flex items-center gap-2 ${isInTable ? "" : "pl-2"} flex-shrink-0`}>
            <span className={`text-sm text-gray-500 flex-shrink-0 ${isInTable ? "" : "pl-2"}`}>
              if
            </span>
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
                    isFocused={isFocused}
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
                  isFocused={isFocused}
                />
              );
            })}
        </>
      ) : (
        <>
          <span className={`text-sm text-gray-500 flex-shrink-0 ${isInTable ? "" : "pl-2"}`}>
            if
          </span>
          {isTimeBased && <span className="text-sm">Time</span>}
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
