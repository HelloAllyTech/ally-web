import React from "react";

import { EventType } from "@components/event-type-selection-dialog";

import { CombinationTriggerConditions } from "./CombinationTriggerConditions";
import { StandardTriggerConditions } from "./StandardTriggerConditions";
import { TriggerCondition, isCombinationTriggerCondition } from "../../types/triggerConditions";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: TriggerCondition | undefined;
  onChange: (field: string, value: string | number | string[]) => void;
  isInTable?: boolean; // Flag to indicate if rendered in table (for styling adjustments)
  isFocused?: boolean; // Flag to indicate if the cell is currently focused
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
          <span className="text-sm font-medium text-gray-600 mr-2">Trigger conditions</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>
      )}
      <div className="flex items-start relative">
        <div className="flex-1">
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
    </div>
  );
};
