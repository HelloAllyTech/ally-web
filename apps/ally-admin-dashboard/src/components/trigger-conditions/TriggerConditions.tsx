import React from "react";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { EventType } from "@components";
import { en, EVENT_DETECTION_TYPES } from "@constants";

import { CombinationTriggerConditions } from "./CombinationTriggerConditions";
import { MultiLevelCombinationTriggerConditions } from "./MultiLevelCombinationTriggerConditions";
import { StandardTriggerConditions } from "./StandardTriggerConditions";
import {
  TriggerCondition,
  isCombinationTriggerCondition,
  CombinationExpressionNode,
  CombinationTriggerCondition,
  COMBINATION_OPERATOR,
} from "../../types/triggerConditions";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: TriggerCondition | undefined;
  onChange?: (field: string, value: string | number | string[] | CombinationExpressionNode) => void;
  isInTable?: boolean;
  currentEventId?: string;
}

const SidePanelWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col">
    <div className="flex items-center mb-2">
      <span className="text-xs font-regular text-typography-600 mr-2">
        {en.simulation.triggerCondition}
      </span>
      <div className="flex-1 border-t"></div>
    </div>
    <div className="flex items-start relative">
      <div className="flex-1">
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-primary-500"></div>
        {children}
      </div>
    </div>
  </div>
);

export const TriggerConditions: React.FC<TriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  onChange,
  isInTable = false,
  currentEventId,
}) => {
  if (!eventType) return null;

  const renderCombinationConditions = (condition: CombinationTriggerCondition) =>
    FEATURE_FLAGS_MAP.MULTI_LEVEL_COMBINATION_TRIGGER_CONDITIONS_FLAG ? (
      <MultiLevelCombinationTriggerConditions
        triggerCondition={condition}
        onChange={onChange || (() => {})}
        isInTable={isInTable}
        currentEventId={currentEventId}
      />
    ) : (
      <CombinationTriggerConditions
        triggerCondition={condition}
        onChange={onChange || (() => {})}
        isInTable={isInTable}
        currentEventId={currentEventId}
      />
    );

  const renderStandardConditions = () => {
    // For standard event types, create an empty structure to display placeholders
    // This allows the UI to show the fields without saving empty values to backend
    let effectiveTriggerCondition: any = triggerCondition;

    if (!triggerCondition) {
      // Create empty structure so fields render with placeholders
      if (eventType === EVENT_DETECTION_TYPES.TIME_BASED) {
        effectiveTriggerCondition = {} as TriggerCondition;
      } else if (eventType === EVENT_DETECTION_TYPES.SCORE_BASED) {
        effectiveTriggerCondition = {} as TriggerCondition;
      } else if (eventType === EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY) {
        effectiveTriggerCondition = {} as TriggerCondition;
      } else if (eventType === EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY) {
        effectiveTriggerCondition = {} as TriggerCondition;
      } else if (eventType === EVENT_DETECTION_TYPES.BINARY_CLASSIFICATION) {
        effectiveTriggerCondition = {} as TriggerCondition;
      }
    }

    if (!effectiveTriggerCondition) return null;

    return (
      <StandardTriggerConditions
        eventType={eventType}
        triggerCondition={effectiveTriggerCondition}
        onChange={onChange}
        isInTable={isInTable}
      />
    );
  };

  // For combination events, always show trigger conditions even if undefined or has null expression
  const isCombinationEvent = eventType === EVENT_DETECTION_TYPES.COMBINATION;
  const shouldRenderCombination =
    isCombinationEvent &&
    (isCombinationTriggerCondition(triggerCondition) ||
      !triggerCondition ||
      (triggerCondition as any)?.expression === null);

  if (isInTable) {
    if (shouldRenderCombination) {
      // Create a default combination trigger condition if it doesn't exist or has null expression
      const defaultCombinationCondition: CombinationTriggerCondition =
        triggerCondition &&
        isCombinationTriggerCondition(triggerCondition) &&
        triggerCondition.expression !== null
          ? triggerCondition
          : {
              expression: {
                type: COMBINATION_OPERATOR.AND,
                left: { id: "" },
                right: { id: "" },
              },
            };
      return renderCombinationConditions(defaultCombinationCondition);
    }
    // For standard event types in table, render with default values if needed
    return renderStandardConditions();
  }

  // For side panel view
  if (shouldRenderCombination) {
    // Create a default combination trigger condition if it doesn't exist or has null expression
    const defaultCombinationCondition: CombinationTriggerCondition =
      triggerCondition &&
      isCombinationTriggerCondition(triggerCondition) &&
      triggerCondition.expression !== null
        ? triggerCondition
        : {
            expression: {
              type: "AND",
              left: { id: "" },
              right: { id: "" },
            },
          };
    return (
      <SidePanelWrapper>
        {renderCombinationConditions(defaultCombinationCondition)}
      </SidePanelWrapper>
    );
  }

  return <SidePanelWrapper>{renderStandardConditions()}</SidePanelWrapper>;
};
