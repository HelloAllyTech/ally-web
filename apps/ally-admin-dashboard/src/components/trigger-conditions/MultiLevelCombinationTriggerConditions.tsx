import React, { useState, useEffect, useRef, useMemo } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetSessionEventsQuery } from "@api";
import { Delete, GroupBranch, AddBlue } from "@assets";
import { TriggerConditionDropdown, GeneratedExpressionView } from "@components";
import {
  getTriggerConditionConfig,
  SESSION_EVENT_STATUS_OPTIONS,
  SORT_BY,
  SORT_ORDER,
  INITIAL_EVENTS_LIMIT,
  EVENT_DETECTION_TYPES,
  en,
} from "@constants";
import {
  CombinationTriggerCondition,
  CombinationExpressionNode,
  COMBINATION_OPERATOR,
  EventStatus,
  CombinationOperator,
} from "@types";
import {
  getEventIdFromNode,
  getStatusFromNode,
  getEventNameFromNode,
  buildConditionNode,
  updateNodeAtPath,
  deleteNodeAtPath,
  addSiblingAtPath,
  flattenExpression,
  getAllEventIds,
  getTreeDepth,
  isLeafNode,
  isOperatorNode,
  renderOperatorColor,
  getBorderColor,
} from "@utils";

const FIELD_IDS = {
  STATUS: "status",
  OPERATOR: "operator",
  EXPRESSION: "expression",
} as const;

enum directionMap {
  LEFT = "left",
  RIGHT = "right",
}

interface MultiLevelCombinationTriggerConditionsProps {
  triggerCondition: CombinationTriggerCondition;
  onChange: (field: string, value: CombinationExpressionNode) => void;
  isInTable?: boolean;
  currentEventId?: string;
}

interface Event {
  id: string;
  name: string;
  eventCode: string;
}

export const MultiLevelCombinationTriggerConditions: React.FC<
  MultiLevelCombinationTriggerConditionsProps
> = ({ triggerCondition, onChange, isInTable = false, currentEventId }) => {
  const [availableEvents, setAvailableEvents] = useState<Array<Event>>([]);
  const [offset, setOffset] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [hasMore, setHasMore] = useState(true);

  const lastSearchRef = useRef(searchName);

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

      const isNewSearch = lastSearchRef.current !== searchName;
      lastSearchRef.current = searchName;

      if (offset === 0 || isNewSearch) {
        setAvailableEvents(formattedEvents);
      } else {
        setAvailableEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEvents = formattedEvents.filter(e => !existingIds.has(e.id));
          return [...prev, ...newEvents];
        });
      }

      const hasMoreResults = formattedEvents.length >= INITIAL_EVENTS_LIMIT;
      setHasMore(hasMoreResults);
    }
  }, [eventsData, offset, searchName]);

  const handleLoadMore = () => {
    setOffset(prev => prev + INITIAL_EVENTS_LIMIT);
  };

  const handleSearch = (search: string) => {
    setSearchName(search);
    setOffset(0);
    setHasMore(true);
  };

  const expression = triggerCondition.expression || {
    type: COMBINATION_OPERATOR.AND,
    left: { id: "" },
    right: { id: "" },
  };

  const config = getTriggerConditionConfig(EVENT_DETECTION_TYPES.COMBINATION);
  if (!config) return null;

  const statusField = config.fields.find(field => field.id === FIELD_IDS.STATUS);
  const operatorField = config.fields.find(field => field.id === FIELD_IDS.OPERATOR);

  const leafNodePaths = useMemo(() => {
    return flattenExpression(expression)
      .filter(n => isLeafNode(n.node))
      .map(n => n.path);
  }, [expression]);

  // Handle event selection change
  const handleEventChange = (path: string, eventId: string, eventName?: string) => {
    const newExpression = updateNodeAtPath(expression, path, node => {
      const currentStatus = getStatusFromNode(node);
      return buildConditionNode(eventId, currentStatus, eventName);
    });
    onChange(FIELD_IDS.EXPRESSION, newExpression);
  };

  // Handle status change
  const handleStatusChange = (path: string, status: EventStatus) => {
    const newExpression = updateNodeAtPath(expression, path, node => {
      const currentEventId = getEventIdFromNode(node);
      const currentName = node.type === "NOT" ? node.left?.name : node.name;
      return buildConditionNode(currentEventId, status, currentName);
    });
    onChange(FIELD_IDS.EXPRESSION, newExpression);
  };

  // Handle operator change for a group
  const handleOperatorChange = (path: string, operator: CombinationOperator) => {
    const newExpression = updateNodeAtPath(expression, path, node => ({
      ...node,
      type: operator,
    }));
    onChange(FIELD_IDS.EXPRESSION, newExpression);
  };

  // Add a new condition at a specific path (as a sibling)
  const handleAddCondition = (targetPath?: string) => {
    const newCondition: CombinationExpressionNode = { id: "" };

    // If no expression exists, create first condition
    if (!expression || (!expression.id && !expression.type)) {
      onChange(FIELD_IDS.EXPRESSION, {
        type: COMBINATION_OPERATOR.AND,
        left: newCondition,
        right: newCondition,
      });
      return;
    }

    // If single condition exists, create AND with new condition
    if (expression.id && !expression.type) {
      onChange(FIELD_IDS.EXPRESSION, {
        type: COMBINATION_OPERATOR.AND,
        left: expression,
        right: newCondition,
      });
      return;
    }

    // If no specific path provided, add at root level
    if (!targetPath || targetPath === "root") {
      onChange(FIELD_IDS.EXPRESSION, {
        type: COMBINATION_OPERATOR.AND,
        left: expression,
        right: newCondition,
      });
      return;
    }

    // Add as sibling to the node at targetPath using the helper function
    const newExpression = addSiblingAtPath(
      expression,
      targetPath,
      newCondition,
      COMBINATION_OPERATOR.AND,
    );
    onChange(FIELD_IDS.EXPRESSION, newExpression);
  };

  // Delete a condition at path
  const handleDeleteCondition = (path: string) => {
    const newExpression = deleteNodeAtPath(expression, path);
    onChange(FIELD_IDS.EXPRESSION, newExpression);
  };

  // Get filtered events for a specific node
  const getFilteredEvents = (currentPath: string) => {
    const usedEventIds = getAllEventIds(expression).filter(id => {
      // Allow the current node's event ID
      const allNodes = flattenExpression(expression);
      const currentNode = allNodes.find(n => n.path === currentPath);
      return id !== getEventIdFromNode(currentNode?.node);
    });

    return availableEvents
      .filter(event => {
        if (currentEventId && event.id === currentEventId) return false;
        if (usedEventIds.includes(event.id)) return false;
        return true;
      })
      .map(event => ({
        value: event.id,
        label: event.eventCode ? `${event.eventCode} - ${event.name}` : event.name,
      }));
  };

  // Render a single condition row
  const renderConditionRow = (nodeData: {
    node: CombinationExpressionNode;
    path: string;
    depth: number;
  }) => {
    const { node, path, depth } = nodeData;
    const eventId = getEventIdFromNode(node);
    const status = getStatusFromNode(node);

    if (!isLeafNode(node)) return null;

    const leafIndex = leafNodePaths.indexOf(path);
    const canAddBranch = depth < 4;

    return (
      <div key={path} className="flex items-center gap-2 py-1">
        <div className="flex flex-row">
          <span className="text-typography-900 bg-white h-[26px] w-[26px] rounded-[2px] mr-[4px] text-center items-center justify-center border border-border-light flex text-xs">
            {leafIndex !== -1 ? `E${leafIndex + 1}` : ""}
          </span>
          <TriggerConditionDropdown
            value={eventId}
            displayValue={getEventNameFromNode(node)}
            options={getFilteredEvents(path)}
            onChange={(eventId, eventName) => handleEventChange(path, eventId, eventName)}
            onLoadMore={hasMore ? handleLoadMore : undefined}
            onSearch={handleSearch}
            placeholder={en.eventConfiguration.selectEvent}
            searchPlaceholder={en.eventConfiguration.searchEvents}
            isSearchable={true}
            disabled={false}
            className="min-w-[150px] max-w-[250px]"
            isInTable={false}
          />
        </div>

        <span className="text-sm text-typography-500">{en.eventConfiguration.has}</span>

        <TriggerConditionDropdown
          value={status}
          options={statusField?.options || []}
          onChange={status => handleStatusChange(path, status as EventStatus)}
          placeholder={statusField?.placeholder || en.eventConfiguration.occurred}
          disabled={false}
          className={(statusField as any)?.className || ""}
          isInTable={false}
        />

        <Tooltip label="Remove this event" align="top">
          <button
            onClick={() => handleDeleteCondition(path)}
            className="p-[2px] h-[25px] w-[25px] flex items-center justify-center hover:bg-neutral-100 border border-border-light rounded-[2px] transition-colors"
          >
            <Delete className="w-[12px] h-[12px]" />
          </button>
        </Tooltip>
        {canAddBranch && (
          <Tooltip label="Create a group and include a new condition" align="top">
            <button
              onClick={() => handleAddCondition(path)}
              className="p-[5px] flex flex-row gap-1 min-w-[82px] items-center hover:bg-neutral-50 rounded-[2px] transition-colors text-primary-500 h-[25px] border-[0.5px] border-primary-500"
            >
              <AddBlue className="w-[12px] h-[12px]" />
              <span className="text-xs text-primary-500 pr-[4px]">Add Leaf</span>
            </button>
          </Tooltip>
        )}
      </div>
    );
  };

  // Render operator between conditions
  const renderOperator = (operator: CombinationOperator, path: string, depth: number) => {
    return (
      <div key={`op-${path}`} className="flex items-center gap-2 py-1 pl-[30px]">
        <TriggerConditionDropdown
          value={operator}
          options={operatorField?.options || []}
          onChange={op => handleOperatorChange(path, op as CombinationOperator)}
          placeholder={COMBINATION_OPERATOR.AND}
          disabled={false}
          isInTable={false}
          className={`border-[0.5px] ${renderOperatorColor(depth)}`}
        />
      </div>
    );
  };

  // Render the expression tree recursively
  const renderExpressionTree = (
    node: CombinationExpressionNode | undefined,
    path: string = "root",
    depth: number = 0,
  ): React.ReactNode => {
    if (!node) return null;

    if (isLeafNode(node)) {
      return renderConditionRow({ node, path, depth });
    }

    if (isOperatorNode(node)) {
      const isGrouped = depth > 0;

      const borderColor = getBorderColor(depth);

      return (
        <div key={path} className={isGrouped ? `border-[1px] ${borderColor} p-4 my-1` : ""}>
          {renderExpressionTree(node.left, `${path}.${directionMap.LEFT}`, depth + 1)}
          {node.type &&
            (node.type === COMBINATION_OPERATOR.AND || node.type === COMBINATION_OPERATOR.OR) &&
            renderOperator(node.type, path, depth)}
          {renderExpressionTree(node.right, `${path}.${directionMap.RIGHT}`, depth + 1)}
        </div>
      );
    }

    return null;
  };

  // Table view - simplified
  if (isInTable) {
    const firstNode = flattenExpression(expression).find(
      n => !n.node.type || n.node.type === "NOT",
    );

    if (!firstNode) return null;

    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-typography-500">{en.eventConfiguration.if}</span>
        <TriggerConditionDropdown
          value={getEventIdFromNode(firstNode.node)}
          displayValue={getEventNameFromNode(firstNode.node)}
          options={getFilteredEvents(firstNode.path)}
          onChange={(eventId, eventName) => handleEventChange(firstNode.path, eventId, eventName)}
          onLoadMore={hasMore ? handleLoadMore : undefined}
          onSearch={handleSearch}
          placeholder={en.eventConfiguration.selectEvent}
          searchPlaceholder={en.eventConfiguration.searchEvents}
          isSearchable={true}
          disabled={false}
          className="min-w-[150px] max-w-[170px]"
          isInTable={true}
        />
        <span className="text-sm text-typography-500">{en.eventConfiguration.has}</span>
        <TriggerConditionDropdown
          value={getStatusFromNode(firstNode.node)}
          options={statusField?.options || []}
          onChange={status => handleStatusChange(firstNode.path, status as EventStatus)}
          placeholder={statusField?.placeholder || en.eventConfiguration.occurred}
          disabled={false}
          className={(statusField as any)?.className || ""}
          isInTable={true}
        />
        <span className="text-sm text-primary-500">{en.eventConfiguration.more}</span>
      </div>
    );
  }

  return (
    <>
      {/* Add component for render generated expression in text format */}
      <div className="flex flex-row">
        <span className="text-sm text-typography-500 pl-[10px] pt-[6px]">
          {en.eventConfiguration.if}
        </span>
        <div className="flex flex-col gap-1 pl-3">
          <div className="flex flex-col gap-1">{renderExpressionTree(expression)}</div>
          {getTreeDepth(expression) < 5 && (
            <Tooltip label="add new condition branch to this expression" align="top">
              <button
                onClick={() => handleAddCondition()}
                className="flex items-center gap-1 text-primary-500 hover:text-primary-600 text-sm font-normal self-start border-[0.5px] border-primary-500 rounded-[2px] p-[5px]"
              >
                <GroupBranch className="w-[12px] h-[12px]" />
                <span className="text-xs pl-[4px]">{en.eventConfiguration.addBase}</span>
              </button>
            </Tooltip>
          )}
          <GeneratedExpressionView node={expression} leafNodePaths={leafNodePaths} />
        </div>
      </div>
    </>
  );
};
