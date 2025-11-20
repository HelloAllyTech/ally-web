import React, { useMemo } from "react";

import { useSelector } from "react-redux";

import { useGetSessionEventsQuery } from "@api";
import {
  SESSION_EVENT_STATUS_OPTIONS,
  SORT_BY,
  SORT_ORDER,
  getTriggerConditionConfig,
} from "@constants";
import { selectAvailableEvents } from "@reducer";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";
import {
  CombinationTriggerCondition,
  CombinationExpressionNode,
} from "../../types/triggerConditions";

interface CombinationTriggerConditionsProps {
  triggerCondition: CombinationTriggerCondition;
  onChange: (field: string, value: CombinationExpressionNode) => void;
  isInTable?: boolean;
  availableEvents?: Array<{ id: string; name: string }>;
}

export const CombinationTriggerConditions: React.FC<CombinationTriggerConditionsProps> = ({
  triggerCondition,
  onChange,
  isInTable = false,
  availableEvents: providedAvailableEvents,
}) => {
  // Get events from Redux store
  const reduxAvailableEvents = useSelector(selectAvailableEvents);

  // Fetch events for combination event dropdowns only if not provided via Redux or prop
  const shouldFetch = !providedAvailableEvents && reduxAvailableEvents.length === 0;
  const { data: eventsData } = useGetSessionEventsQuery(
    {
      visibilityType: SESSION_EVENT_STATUS_OPTIONS.ACTIVE,
      limit: 100,
      offset: 0,
      sortBy: SORT_BY.CREATED_AT,
      order: SORT_ORDER.DESC,
      searchName: "",
    },
    {
      skip: !shouldFetch, // Skip query if events are available from Redux or prop
    },
  );

  const availableEvents = useMemo(() => {
    // Priority: prop > Redux store > API call
    if (providedAvailableEvents) {
      return providedAvailableEvents;
    }
    if (reduxAvailableEvents.length > 0) {
      return reduxAvailableEvents;
    }
    return (eventsData?.data || []).map(event => ({
      id: event.id,
      name: event.name || "",
    }));
  }, [eventsData, providedAvailableEvents, reduxAvailableEvents]);

  const config = getTriggerConditionConfig("COMBINATION");
  if (!config) return null;

  // Ensure we always have a valid expression structure to work with
  const expression = triggerCondition.expression || {
    type: "AND",
    left: { id: "" },
    right: { id: "" },
  };

  // Extract values from expression tree for display
  const getLeftEventId = (): string => {
    if (expression.left?.type === "NOT") {
      return expression.left.left?.id || "";
    }
    return expression.left?.id || "";
  };

  const getLeftStatus = (): string => {
    return expression.left?.type === "NOT" ? "NOT_OCCURRED" : "OCCURRED";
  };

  const getRightEventId = (): string => {
    if (expression.right?.type === "NOT") {
      return expression.right.left?.id || "";
    }
    return expression.right?.id || "";
  };

  const getRightStatus = (): string => {
    return expression.right?.type === "NOT" ? "NOT_OCCURRED" : "OCCURRED";
  };

  const getOperator = (): string => {
    return expression.type === "OR" ? "OR" : "AND";
  };

  // Helper function to get event name from event ID
  const getEventNameById = (eventId: string): string => {
    if (!eventId) return "";
    const event = availableEvents.find(e => e.id === eventId);
    return event?.name || "";
  };

  const handleLeftEventChange = (eventId: string) => {
    const newExpression: CombinationExpressionNode = {
      ...expression,
      left:
        getLeftStatus() === "NOT_OCCURRED"
          ? { type: "NOT", left: { id: eventId } }
          : { id: eventId },
    };
    onChange("expression", newExpression);
  };

  const handleLeftStatusChange = (status: string) => {
    const eventId = getLeftEventId();
    const newExpression: CombinationExpressionNode = {
      ...expression,
      left: status === "NOT_OCCURRED" ? { type: "NOT", left: { id: eventId } } : { id: eventId },
    };
    onChange("expression", newExpression);
  };

  const handleRightEventChange = (eventId: string) => {
    const newExpression: CombinationExpressionNode = {
      ...expression,
      right:
        getRightStatus() === "NOT_OCCURRED"
          ? { type: "NOT", left: { id: eventId } }
          : { id: eventId },
    };
    onChange("expression", newExpression);
  };

  const handleRightStatusChange = (status: string) => {
    const eventId = getRightEventId();
    const newExpression: CombinationExpressionNode = {
      ...expression,
      right: status === "NOT_OCCURRED" ? { type: "NOT", left: { id: eventId } } : { id: eventId },
    };
    onChange("expression", newExpression);
  };

  const handleOperatorChange = (operator: "AND" | "OR") => {
    const newExpression: CombinationExpressionNode = {
      ...expression,
      type: operator,
    };
    onChange("expression", newExpression);
  };

  const statusField = config.fields.find(f => f.id === "status");
  const operatorField = config.fields.find(f => f.id === "operator");

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {/* First condition */}
          <div className={`flex items-center gap-2 ${isInTable ? "" : "pl-3"}`}>
            <span className="text-sm text-typography-500">if</span>
            <TriggerConditionDropdown
              value={getLeftEventId()}
              displayValue={getEventNameById(getLeftEventId())}
              options={availableEvents.map(event => ({
                value: event.id,
                label: event.name,
              }))}
              onChange={handleLeftEventChange}
              placeholder="Select an event"
              searchPlaceholder="Search events..."
              isSearchable={true}
              disabled={false}
              className="min-w-[150px] max-w-[170px]"
              isInTable={isInTable}
            />
            <span className="text-sm text-typography-500">has</span>
            <TriggerConditionDropdown
              value={getLeftStatus()}
              options={statusField?.options || []}
              onChange={handleLeftStatusChange}
              placeholder={statusField?.placeholder || "Occurred"}
              disabled={false}
              className={(statusField as any)?.className || ""}
              isInTable={isInTable}
            />
          </div>

          {/* Second condition */}
          <div className={`flex items-center gap-2 ${isInTable ? "" : "pl-3"}`}>
            <TriggerConditionDropdown
              value={getOperator()}
              options={operatorField?.options || []}
              onChange={operator => handleOperatorChange(operator as "AND" | "OR")}
              placeholder="AND"
              disabled={false}
              isInTable={isInTable}
            />
            <TriggerConditionDropdown
              value={getRightEventId()}
              displayValue={getEventNameById(getRightEventId())}
              options={availableEvents.map(event => ({
                value: event.id,
                label: event.name,
              }))}
              onChange={handleRightEventChange}
              placeholder="Select an event"
              searchPlaceholder="Search events..."
              isSearchable={true}
              disabled={false}
              className="min-w-[150px] max-w-[170px]"
              isInTable={isInTable}
            />
            <span className="text-sm text-typography-500">has</span>
            <TriggerConditionDropdown
              value={getRightStatus()}
              options={statusField?.options || []}
              onChange={handleRightStatusChange}
              placeholder={statusField?.placeholder || "Occurred"}
              disabled={false}
              className={(statusField as any)?.className || ""}
              isInTable={isInTable}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
