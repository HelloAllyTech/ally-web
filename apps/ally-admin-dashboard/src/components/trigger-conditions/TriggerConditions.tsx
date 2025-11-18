import React from "react";

import { EventType } from "@components";

import { CombinationTriggerConditions } from "./CombinationTriggerConditions";
import { StandardTriggerConditions } from "./StandardTriggerConditions";
import { TriggerCondition, isCombinationTriggerCondition } from "../../types/triggerConditions";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: TriggerCondition | undefined;
  onChange?: (field: string, value: string | number | string[]) => void;
  isInTable?: boolean;
  isFocused?: boolean;
}

export const TriggerConditions: React.FC<TriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  onChange,
  isInTable = false,
  isFocused = false,
}) => {
  if (!eventType || !triggerCondition) return null;

  return (
    <div className="flex flex-col">
      {/* Label with horizontal grey line - hide in table */}
      {!isInTable && (
        <div className="flex items-center mb-2">
          <span className="text-sm font-medium text-typography-800 mr-2">Trigger conditions</span>
          <div className="flex-1 border-t"></div>
        </div>
      )}
      <div className="flex items-start relative">
        <div className="flex-1">
          {!isInTable && (
            <div className={`absolute left-0 top-0 bottom-0 w-[1px] bg-primary-500 `}></div>
          )}
          {isCombinationTriggerCondition(triggerCondition) ? (
            <CombinationTriggerConditions
              triggerCondition={triggerCondition}
              onChange={onChange}
              isInTable={isInTable}
            />
          ) : (
            <StandardTriggerConditions
              eventType={eventType}
              triggerCondition={triggerCondition}
              onChange={onChange}
              isInTable={isInTable}
              isFocused={isFocused}
            />
          )}
        </div>
      </div>
      {!isInTable && <div className="border-t mt-4"></div>}
    </div>
  );
};
