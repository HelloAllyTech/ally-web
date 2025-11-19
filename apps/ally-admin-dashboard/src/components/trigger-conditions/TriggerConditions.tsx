import React from "react";

import { EventType } from "@components";

import { CombinationTriggerConditions } from "./CombinationTriggerConditions";
import { StandardTriggerConditions } from "./StandardTriggerConditions";
import {
  TriggerCondition,
  isCombinationTriggerCondition,
  CombinationExpressionNode,
  CombinationTriggerCondition,
} from "../../types/triggerConditions";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: TriggerCondition | undefined;
  onChange?: (field: string, value: string | number | string[] | CombinationExpressionNode) => void;
  isInTable?: boolean;
}

const SidePanelWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col">
    <div className="flex items-center mb-2">
      <span className="text-sm font-medium text-typography-800 mr-2">Trigger conditions</span>
      <div className="flex-1 border-t"></div>
    </div>
    <div className="flex items-start relative">
      <div className="flex-1">
        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-primary-500"></div>
        {children}
      </div>
    </div>
    <div className="border-t mt-4"></div>
  </div>
);

export const TriggerConditions: React.FC<TriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  onChange,
  isInTable = false,
}) => {
  if (!eventType) return null;

  const renderCombinationConditions = (condition: CombinationTriggerCondition) => (
    <CombinationTriggerConditions
      triggerCondition={condition}
      onChange={onChange || (() => {})}
      isInTable={isInTable}
    />
  );

  const renderStandardConditions = () => {
    if (!triggerCondition) return null;
    return (
      <StandardTriggerConditions
        eventType={eventType}
        triggerCondition={triggerCondition}
        onChange={onChange}
        isInTable={isInTable}
      />
    );
  };

  if (isInTable) {
    if (!triggerCondition) return null;
    if (isCombinationTriggerCondition(triggerCondition)) {
      return renderCombinationConditions(triggerCondition);
    }
    return renderStandardConditions();
  }

  if (!triggerCondition) return null;

  return (
    <SidePanelWrapper>
      {isCombinationTriggerCondition(triggerCondition)
        ? renderCombinationConditions(triggerCondition)
        : renderStandardConditions()}
    </SidePanelWrapper>
  );
};
