import React, { useMemo } from "react";

import { useSelector } from "react-redux";

import { useGetSessionEventsQuery } from "@api";
import {
  EVENT_DETECTION_TYPES,
  SESSION_EVENT_STATUS_OPTIONS,
  SORT_BY,
  SORT_ORDER,
  getTriggerConditionConfig,
} from "@constants";
import { selectAvailableEvents } from "@reducer";
import {
  CombinationTriggerCondition,
  CombinationExpressionNode,
  EVENT_STATUS,
  COMBINATION_OPERATOR,
  EventStatus,
  CombinationOperator,
} from "@types";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";

interface CombinationTriggerConditionsProps {
  triggerCondition: CombinationTriggerCondition;
  onChange: (field: string, value: CombinationExpressionNode) => void;
  isInTable?: boolean;
}

const statusFieldName = "status";
const operatorFieldName = "operator";
enum directionMap {
  LEFT = "left",
  RIGHT = "right",
}

export const CombinationTriggerConditions: React.FC<CombinationTriggerConditionsProps> = ({
  triggerCondition,
  onChange,
  isInTable = false,
}) => {
  // Get events from Redux store
  const reduxAvailableEvents = useSelector(selectAvailableEvents);

  // Fetch events for combination event dropdowns only if not provided via Redux store
  const shouldFetch = reduxAvailableEvents.length === 0;
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
      skip: !shouldFetch,
    },
  );

  const availableEvents = useMemo(() => {
    if (reduxAvailableEvents.length > 0) {
      return reduxAvailableEvents;
    }
    return (
      eventsData?.data?.map(event => ({
        id: event.id,
        name: event.name || "",
        eventCode: event.eventCode || "",
      })) || []
    );
  }, [eventsData, reduxAvailableEvents]);

  const config = getTriggerConditionConfig(EVENT_DETECTION_TYPES.COMBINATION);
  if (!config) return null;

  // Ensure we always have a valid expression structure to work with
  const expression = triggerCondition.expression || {
    type: COMBINATION_OPERATOR.AND,
    left: { id: "" },
    right: { id: "" },
  };

  // Generic helper to get event ID from a side (left or right)
  const getEventId = (side: directionMap): string => {
    const sideNode = expression[side];
    if (sideNode?.type === "NOT") {
      return sideNode.left?.id || "";
    }
    return sideNode?.id || "";
  };

  // Generic helper to get status from a side (left or right)
  const getStatus = (side: directionMap): EventStatus => {
    return expression[side]?.type === "NOT" ? EVENT_STATUS.NOT_OCCURRED : EVENT_STATUS.OCCURRED;
  };

  // Helper to build a condition node (handles NOT status)
  const buildConditionNode = (eventId: string, status: EventStatus): CombinationExpressionNode => {
    return status === EVENT_STATUS.NOT_OCCURRED
      ? { type: "NOT", left: { id: eventId } }
      : { id: eventId };
  };

  // Generic handler for event changes
  const handleEventChange = (side: directionMap, eventId: string) => {
    const currentStatus = getStatus(side);
    const newExpression: CombinationExpressionNode = {
      ...expression,
      [side]: buildConditionNode(eventId, currentStatus),
    };
    onChange("expression", newExpression);
  };

  // Generic handler for status changes
  const handleStatusChange = (side: directionMap, status: EventStatus) => {
    const currentEventId = getEventId(side);
    const newExpression: CombinationExpressionNode = {
      ...expression,
      [side]: buildConditionNode(currentEventId, status),
    };
    onChange("expression", newExpression);
  };

  // Helper function to get event display name from event ID
  const getEventDisplayNameById = (eventId: string): string => {
    if (!eventId) return "";
    const event = availableEvents.find(e => e.id === eventId);
    if (!event) return "";
    return event.eventCode ? `${event.eventCode} - ${event.name}` : event.name;
  };

  const getOperator = (): CombinationOperator => {
    return expression.type === COMBINATION_OPERATOR.OR
      ? COMBINATION_OPERATOR.OR
      : COMBINATION_OPERATOR.AND;
  };

  const handleOperatorChange = (operator: CombinationOperator) => {
    const newExpression: CombinationExpressionNode = {
      ...expression,
      type: operator,
    };
    onChange("expression", newExpression);
  };

  const statusField = config.fields.find(field => field.id === statusFieldName);
  const operatorField = config.fields.find(field => field.id === operatorFieldName);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex flex-col gap-2">
        <div className="flex flex-col gap-2">
          {/* First condition */}
          <div className={`flex items-center gap-2 ${isInTable ? "" : "pl-3"}`}>
            <span className="text-sm text-typography-500">if</span>
            <TriggerConditionDropdown
              value={getEventId(directionMap.LEFT)}
              displayValue={getEventDisplayNameById(getEventId(directionMap.LEFT))}
              options={availableEvents.map(event => ({
                value: event.id,
                label: event.eventCode ? `${event.eventCode} - ${event.name}` : event.name,
              }))}
              onChange={eventId => handleEventChange(directionMap.LEFT, eventId)}
              placeholder="Select an event"
              searchPlaceholder="Search events..."
              isSearchable={true}
              disabled={false}
              className="min-w-[150px] max-w-[170px]"
              isInTable={isInTable}
            />
            <span className="text-sm text-typography-500">has</span>
            <TriggerConditionDropdown
              value={getStatus(directionMap.LEFT)}
              options={statusField?.options || []}
              onChange={status => handleStatusChange(directionMap.LEFT, status as EventStatus)}
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
              onChange={operator => handleOperatorChange(operator as CombinationOperator)}
              placeholder={COMBINATION_OPERATOR.AND}
              disabled={false}
              isInTable={isInTable}
              className="bg-primary-50 border-[0.5px] border-primary-500"
            />
            <TriggerConditionDropdown
              value={getEventId(directionMap.RIGHT)}
              displayValue={getEventDisplayNameById(getEventId(directionMap.RIGHT))}
              options={availableEvents.map(event => ({
                value: event.id,
                label: event.eventCode ? `${event.eventCode} - ${event.name}` : event.name,
              }))}
              onChange={eventId => handleEventChange(directionMap.RIGHT, eventId)}
              placeholder="Select an event"
              searchPlaceholder="Search events..."
              isSearchable={true}
              disabled={false}
              className="min-w-[150px] max-w-[170px]"
              isInTable={isInTable}
            />
            <span className="text-sm text-typography-500">has</span>
            <TriggerConditionDropdown
              value={getStatus(directionMap.RIGHT)}
              options={statusField?.options || []}
              onChange={status => handleStatusChange(directionMap.RIGHT, status as EventStatus)}
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
