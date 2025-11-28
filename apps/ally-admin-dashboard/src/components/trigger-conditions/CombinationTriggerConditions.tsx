import React, { useState, useEffect } from "react";

import { useGetSessionEventsQuery, useGetSessionEventByIdQuery } from "@api";
import {
  EVENT_DETECTION_TYPES,
  getTriggerConditionConfig,
  SESSION_EVENT_STATUS_OPTIONS,
  SORT_BY,
  SORT_ORDER,
  INITIAL_EVENTS_LIMIT,
} from "@constants";
import {
  CombinationTriggerCondition,
  CombinationExpressionNode,
  EVENT_STATUS,
  COMBINATION_OPERATOR,
  EventStatus,
  CombinationOperator,
  SessionEvent,
} from "@types";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";

interface CombinationTriggerConditionsProps {
  triggerCondition: CombinationTriggerCondition;
  onChange: (field: string, value: CombinationExpressionNode) => void;
  isInTable?: boolean;
  currentEventId?: string;
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
  currentEventId,
}) => {
  const [availableEvents, setAvailableEvents] = useState<
    Array<{ id: string; name: string; eventCode: string }>
  >([]);
  const [offset, setOffset] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const { data: eventsData } = useGetSessionEventsQuery({
    visibilityType: SESSION_EVENT_STATUS_OPTIONS.ACTIVE,
    limit: INITIAL_EVENTS_LIMIT,
    offset: offset,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    searchName: searchName,
  });

  useEffect(() => {
    if (eventsData?.data) {
      const formattedEvents = eventsData.data.map(event => ({
        id: event.id || "",
        name: event.name || "",
        eventCode: event.eventCode || "",
      }));

      if (offset === 0) {
        setAvailableEvents(formattedEvents);
      } else {
        setAvailableEvents(prev => [...prev, ...formattedEvents]);
      }

      // Check if there are more results to load
      // If current fetch returned less than INITIAL_EVENTS_LIMIT, all data is fetched
      const hasMoreResults = formattedEvents.length >= INITIAL_EVENTS_LIMIT;
      setHasMore(hasMoreResults);
    }
  }, [eventsData, offset]);

  const handleLoadMore = () => {
    setOffset(prev => prev + INITIAL_EVENTS_LIMIT);
  };

  const handleSearch = (search: string) => {
    setSearchName(search);
    setOffset(0);
    setHasMore(true);
  };

  // Ensure we always have a valid expression structure to work with
  const expression = triggerCondition.expression || {
    type: COMBINATION_OPERATOR.AND,
    left: { id: "" },
    right: { id: "" },
  };

  // Helper to extract event ID from a node (handles NOT wrapper)
  const getEventIdFromNode = (node: CombinationExpressionNode | undefined): string => {
    if (!node) return "";
    if (node.type === "NOT" && "left" in node) {
      return node.left?.id || "";
    }
    return node.id || "";
  };

  // Get selected event IDs
  const leftEventId = getEventIdFromNode(expression.left);
  const rightEventId = getEventIdFromNode(expression.right);

  // Fetch event data for left and right dropdowns to get display names
  const { data: leftEventData, isLoading: isLeftLoading } = useGetSessionEventByIdQuery(
    leftEventId,
    {
      skip: !leftEventId,
    },
  );
  const { data: rightEventData, isLoading: isRightLoading } = useGetSessionEventByIdQuery(
    rightEventId,
    {
      skip: !rightEventId,
    },
  );

  // Helper to filter events for dropdowns
  const getFilteredEvents = (excludeEventId: string) => {
    return availableEvents
      .filter(event => {
        if (currentEventId && event.id === currentEventId) return false;
        if (excludeEventId && event.id === excludeEventId) return false;
        return true;
      })
      .map(event => ({
        value: event.id,
        label: event.eventCode ? `${event.eventCode} - ${event.name}` : event.name,
      }));
  };

  const leftDropdownOptions = getFilteredEvents(rightEventId);
  const rightDropdownOptions = getFilteredEvents(leftEventId);

  const config = getTriggerConditionConfig(EVENT_DETECTION_TYPES.COMBINATION);
  if (!config) return null;

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

  // Helper function to get event display name from fetched event data
  const getEventDisplayName = (eventData: SessionEvent | undefined): string => {
    if (!eventData) return "";
    return eventData.eventCode
      ? `${eventData.eventCode} - ${eventData.name}`
      : eventData.name || "";
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
              displayValue={isLeftLoading ? "Loading..." : getEventDisplayName(leftEventData)}
              options={leftDropdownOptions}
              onChange={eventId => handleEventChange(directionMap.LEFT, eventId)}
              onLoadMore={hasMore ? handleLoadMore : undefined}
              onSearch={handleSearch}
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
              displayValue={isRightLoading ? "Loading..." : getEventDisplayName(rightEventData)}
              options={rightDropdownOptions}
              onChange={eventId => handleEventChange(directionMap.RIGHT, eventId)}
              onLoadMore={hasMore ? handleLoadMore : undefined}
              onSearch={handleSearch}
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
