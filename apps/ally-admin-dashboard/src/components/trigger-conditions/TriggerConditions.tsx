import React from "react";

import { EventType } from "@components/event-type-selection-dialog";

import { CombinationTriggerConditions } from "./CombinationTriggerConditions";
import { StandardTriggerConditions } from "./StandardTriggerConditions";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: any;
  sentences?: string[]; // Sentences field for SENTENCE_SIMILARITY events
  onChange: (field: string, value: string | number | string[]) => void;
}

export const TriggerConditions: React.FC<TriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  sentences,
  onChange,
}) => {
  if (!eventType) return null;

  // Merge sentences into triggerCondition for sentence similarity events
  const enhancedTriggerCondition =
    eventType === "SENTENCE_SIMILARITY" && sentences
      ? { ...triggerCondition, sentences }
      : triggerCondition;

  return (
    <div className="flex flex-col">
      {/* Label with horizontal grey line */}
      <div className="flex items-center mb-2">
        <span className="text-sm font-medium text-gray-600 mr-2">Trigger conditions</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>
      <div className="flex items-start relative">
        <div className="flex-1">
          {eventType === "COMBINATION" ? (
            <CombinationTriggerConditions triggerCondition={triggerCondition} onChange={onChange} />
          ) : (
            <StandardTriggerConditions
              eventType={eventType}
              triggerCondition={enhancedTriggerCondition}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};
