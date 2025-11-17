import React, { useMemo } from "react";

import { useGetSessionEventsQuery } from "@api";
import { SESSION_EVENT_STATUS_OPTIONS, SORT_BY, SORT_ORDER } from "@constants";
import { getTriggerConditionConfig } from "@constants/TriggerConditionsConfig";

import { TriggerConditionDropdown } from "./TriggerConditionDropdown";
import { CombinationTriggerCondition } from "../../types/triggerConditions";

interface CombinationTriggerConditionsProps {
  triggerCondition: CombinationTriggerCondition;
  onChange: (field: string, value: string | number | string[]) => void;
  isInTable?: boolean;
}

export const CombinationTriggerConditions: React.FC<CombinationTriggerConditionsProps> = ({
  triggerCondition,
  onChange,
  isInTable = false,
}) => {
  // Fetch events for combination event dropdowns
  const { data: eventsData } = useGetSessionEventsQuery({
    visibilityType: SESSION_EVENT_STATUS_OPTIONS.ACTIVE,
    limit: 100,
    offset: 0,
    sortBy: SORT_BY.CREATED_AT,
    order: SORT_ORDER.DESC,
    searchName: "",
  });

  const availableEvents = useMemo(() => {
    return (eventsData?.data || []).map(event => ({
      id: event.id,
      name: event.name || "",
    }));
  }, [eventsData]);

  const config = getTriggerConditionConfig("COMBINATION");
  if (!config) return null;

  const conditions = triggerCondition.conditions || [];
  const displayConditions =
    conditions.length >= 2
      ? conditions.slice(0, 2)
      : [
          { eventId: "", status: "OCCURRED" as const },
          { eventId: "", status: "OCCURRED" as const, operator: "AND" as const },
        ];

  const handleConditionChange = (index: number, field: string, value: string) => {
    const updatedConditions = [...displayConditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      [field]: value,
    };
    onChange("conditions", updatedConditions);
  };

  const handleOperatorChange = (index: number, operator: "AND" | "OR") => {
    const updatedConditions = [...displayConditions];
    updatedConditions[index] = {
      ...updatedConditions[index],
      operator,
    };
    onChange("conditions", updatedConditions);
  };

  const statusField = config.fields.find(f => f.id === "status");
  const operatorField = config.fields.find(f => f.id === "operator");

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="relative flex flex-col gap-2">
          {/* Vertical blue line - hide in table */}
          {!isInTable && <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-blue-500"></div>}
          <div className="flex flex-col gap-2">
            {displayConditions.map((condition, index) => (
              <div key={index} className={`flex items-center gap-2 ${isInTable ? "" : "pl-3"}`}>
                {index === 0 ? (
                  <span className="text-sm text-gray-500">if</span>
                ) : (
                  <TriggerConditionDropdown
                    value={condition.operator || operatorField?.defaultValue || ""}
                    options={operatorField?.options || []}
                    onChange={operator => handleOperatorChange(index, operator as "AND" | "OR")}
                    placeholder="AND"
                    disabled={false}
                  />
                )}
                <TriggerConditionDropdown
                  value={condition.eventId || ""}
                  options={availableEvents.map(event => ({
                    value: event.id,
                    label: event.name,
                  }))}
                  onChange={eventId => {
                    handleConditionChange(index, "eventId", eventId);
                  }}
                  placeholder="Select an event"
                  searchPlaceholder="Search events..."
                  isSearchable={true}
                  disabled={false}
                  className="min-w-[200px]"
                />
                <span className="text-sm text-gray-500">has</span>
                <TriggerConditionDropdown
                  value={condition.status || statusField?.defaultValue || ""}
                  options={statusField?.options || []}
                  onChange={status => handleConditionChange(index, "status", status)}
                  placeholder={statusField?.placeholder || "Occurred"}
                  disabled={false}
                  className={(statusField as any)?.className || ""}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      {!isInTable && <div className="border-t border-gray-300 mt-2"></div>}
    </>
  );
};
