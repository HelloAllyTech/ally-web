import React, { useState, useCallback, useMemo, useEffect } from "react";

import { useGetSessionEventsQuery } from "@api";
import { ArrowDownFilled } from "@assets";
import { AutoExpandableTextarea } from "@components";
import { EventType } from "@components/event-type-selection-dialog";
import { NumberInput } from "@components/notion-table";
import { SPEAKER_OPTIONS, SESSION_EVENT_STATUS_OPTIONS, SORT_BY, SORT_ORDER } from "@constants";

interface TriggerConditionsProps {
  eventType: EventType | string | undefined;
  triggerCondition: any;
  sentences?: string[];
  onChange: (field: string, value: string | number | string[]) => void;
}

export const TriggerConditions: React.FC<TriggerConditionsProps> = ({
  eventType,
  triggerCondition,
  sentences = [],
  onChange,
}) => {
  const [isTriggerOperatorDropdownOpen, setIsTriggerOperatorDropdownOpen] = useState(false);
  const [isTriggerSpeakerDropdownOpen, setIsTriggerSpeakerDropdownOpen] = useState(false);
  const [isTriggerScoreDropdownOpen, setIsTriggerScoreDropdownOpen] = useState(false);

  // State for combination event dropdowns
  const [openDropdowns, setOpenDropdowns] = useState<{
    [key: string]: "event" | "status" | "operator" | null;
  }>({});
  const [searchQueries, setSearchQueries] = useState<{ [key: string]: string }>({});

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

  const toggleDropdown = useCallback(
    (conditionIndex: number, type: "event" | "status" | "operator") => {
      const key = `${conditionIndex}-${type}`;
      setOpenDropdowns(prev => ({
        ...prev,
        [key]: prev[key] === type ? null : type,
      }));
      // Clear search query when closing dropdown
      if (type === "event" && openDropdowns[key] === type) {
        setSearchQueries(prev => {
          const newQueries = { ...prev };
          delete newQueries[key];
          return newQueries;
        });
      }
    },
    [openDropdowns],
  );

  const closeAllDropdowns = useCallback(() => {
    setOpenDropdowns({});
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".trigger-condition-dropdown")) {
        closeAllDropdowns();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeAllDropdowns]);

  const handleChange = useCallback(
    (field: string, value: string | number | string[]) => {
      setIsTriggerOperatorDropdownOpen(false);
      setIsTriggerSpeakerDropdownOpen(false);
      setIsTriggerScoreDropdownOpen(false);
      closeAllDropdowns();
      onChange(field, value);
    },
    [onChange, closeAllDropdowns],
  );

  if (!eventType) return null;

  // Render function for the condition content
  const renderConditionContent = () => {
    // Time-based: "if Time Less than 00:20:00"
    if (eventType === "TIME_BASED") {
      return (
        <>
          <div className="flex items-center gap-2">
            {/* Vertical blue line indicator */}
            <div className="w-[2px] h-8 bg-blue-500"></div>
            {/* "if" keyword */}
            <span className="text-sm text-gray-500">if</span>
            {/* "Time" label */}
            <span className="text-sm">Time</span>
            {/* Operator dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTriggerOperatorDropdownOpen(!isTriggerOperatorDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50"
              >
                <span>
                  {triggerCondition?.operator === "LESS_THAN" ? "Less than" : "Greater than"}
                </span>
                <ArrowDownFilled />
              </button>
              {isTriggerOperatorDropdownOpen && (
                <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                  <div
                    onClick={() => handleChange("operator", "LESS_THAN")}
                    className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                  >
                    Less than
                  </div>
                  <div
                    onClick={() => handleChange("operator", "GREATER_THAN")}
                    className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                  >
                    Greater than
                  </div>
                </div>
              )}
            </div>
            {/* Time input */}
            <input
              type="text"
              value={triggerCondition?.value || "00:20:00"}
              onChange={e => handleChange("value", e.target.value)}
              placeholder="00:20:00"
              pattern="^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$"
              className="px-3 py-2 text-sm border border-gray-300 rounded-md w-[120px] bg-gray-50 focus:outline-none focus:border-blue-500"
            />
          </div>
          {/* Horizontal grey line below if condition */}
          <div className="border-t border-gray-300 mt-2"></div>
        </>
      );
    }

    // Score-based: "if Score Greater than 80"
    if (eventType === "SCORE_BASED") {
      return (
        <>
          <div className="flex items-center gap-2">
            {/* Vertical blue line indicator */}
            <div className="w-[2px] h-8 bg-blue-500"></div>
            {/* "if" keyword */}
            <span className="text-sm text-gray-500">if</span>
            {/* "Score" dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTriggerScoreDropdownOpen(!isTriggerScoreDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50"
              >
                <span>Score</span>
                <ArrowDownFilled />
              </button>
              {isTriggerScoreDropdownOpen && (
                <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                  <div
                    onClick={() => handleChange("score", "SCORE")}
                    className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                  >
                    Score
                  </div>
                </div>
              )}
            </div>
            {/* Operator dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTriggerOperatorDropdownOpen(!isTriggerOperatorDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50"
              >
                <span>
                  {triggerCondition?.operator === "GREATER_THAN" ? "Greater than" : "Less than"}
                </span>
                <ArrowDownFilled />
              </button>
              {isTriggerOperatorDropdownOpen && (
                <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                  <div
                    onClick={() => handleChange("operator", "GREATER_THAN")}
                    className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                  >
                    Greater than
                  </div>
                  <div
                    onClick={() => handleChange("operator", "LESS_THAN")}
                    className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                  >
                    Less than
                  </div>
                </div>
              )}
            </div>
            {/* Number input */}
            <NumberInput
              value={triggerCondition?.value || 0}
              onChange={value => handleChange("value", value)}
            />
          </div>
          {/* Horizontal grey line below if condition */}
          <div className="border-t border-gray-300 mt-2"></div>
        </>
      );
    }

    // Sentence Similarity: "if Care giver says" + AutoExpandableTextarea with sentences
    if (eventType === "SENTENCE_SIMILARITY") {
      const sentencesArray = sentences || [];
      const sentencesText = Array.isArray(sentencesArray) ? sentencesArray.join("\n") : "";

      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            {/* Vertical blue line indicator */}
            <div className="w-[2px] h-8 bg-blue-500 flex-shrink-0"></div>
            {/* "if" keyword */}
            <span className="text-sm text-gray-500 flex-shrink-0">if</span>
            {/* Speaker dropdown */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsTriggerSpeakerDropdownOpen(!isTriggerSpeakerDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50"
              >
                <span>
                  {triggerCondition?.speaker
                    ? (SPEAKER_OPTIONS.find(opt => opt.value === triggerCondition.speaker)?.label ??
                      "Care giver")
                    : "Care giver"}
                </span>
                <ArrowDownFilled />
              </button>
              {isTriggerSpeakerDropdownOpen && (
                <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                  {SPEAKER_OPTIONS.map(option => (
                    <div
                      key={option.value}
                      onClick={() => handleChange("speaker", option.value)}
                      className={`px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100 ${
                        triggerCondition?.speaker === option.value ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* "says" keyword */}
            <span className="text-sm text-gray-500 flex-shrink-0">says</span>
            {/* AutoExpandableTextarea aligned right after "says" */}
            <div className="flex-1 relative">
              <div className="ml-3">
                <AutoExpandableTextarea
                  value={sentencesText}
                  onChange={value => {
                    const sentencesArray = value.split("\n").filter(line => line.trim().length > 0);
                    handleChange("sentences", sentencesArray);
                  }}
                  placeholder="Enter phrases, one per line..."
                  minHeight={80}
                  maxLines={20}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          {/* Horizontal grey line below if condition */}
          <div className="border-t border-gray-300 mt-2"></div>
        </div>
      );
    }

    // Combination events
    if (eventType === "COMBINATION") {
      const conditions = triggerCondition?.conditions || [];

      // Always show exactly 2 conditions
      const displayConditions =
        conditions.length >= 2
          ? conditions.slice(0, 2)
          : [
              { eventId: "", status: "OCCURRED" },
              { eventId: "", status: "OCCURRED", operator: "AND" },
            ];

      const handleConditionChange = (index: number, field: string, value: string) => {
        const updatedConditions = [...displayConditions];
        updatedConditions[index] = {
          ...updatedConditions[index],
          [field]: value,
        };
        handleChange("conditions", updatedConditions);
      };

      const handleOperatorChange = (index: number, operator: "AND" | "OR") => {
        const updatedConditions = [...displayConditions];
        updatedConditions[index] = {
          ...updatedConditions[index],
          operator,
        };
        handleChange("conditions", updatedConditions);
      };

      // Filter events based on search query
      const getFilteredEvents = (conditionIndex: number) => {
        const searchKey = `${conditionIndex}-event`;
        const query = searchQueries[searchKey] || "";
        if (!query.trim()) return availableEvents;
        return availableEvents.filter(event =>
          event.name.toLowerCase().includes(query.toLowerCase()),
        );
      };

      return (
        <>
          <div className="flex flex-col gap-2">
            {/* Continuous vertical blue line container */}
            <div className="relative flex flex-col gap-2 pl-[2px]">
              {/* Vertical blue line that spans both conditions */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-blue-500"></div>
              {/* Conditions container */}
              <div className="flex flex-col gap-2">
                {displayConditions.map((condition, index) => {
                  const selectedEvent = availableEvents.find(e => e.id === condition.eventId);
                  const eventName = selectedEvent?.name || "Select an event";
                  const status = condition.status || "OCCURRED";
                  const operator = condition.operator || "AND";
                  const searchKey = `${index}-event`;
                  const searchQuery = searchQueries[searchKey] || "";
                  const filteredEvents = getFilteredEvents(index);

                  return (
                    <div key={index} className="flex items-center gap-2 pl-3">
                      {index === 0 ? (
                        <>
                          {/* "if" keyword */}
                          <span className="text-sm text-gray-500">if</span>
                        </>
                      ) : (
                        <>
                          {/* Operator dropdown between conditions */}
                          <div className="relative trigger-condition-dropdown">
                            <button
                              type="button"
                              onClick={() => toggleDropdown(index, "operator")}
                              className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50 font-medium"
                            >
                              <span>{operator}</span>
                              <ArrowDownFilled />
                            </button>
                            {openDropdowns[`${index}-operator`] === "operator" && (
                              <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[100px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                                <div
                                  onClick={() => {
                                    handleOperatorChange(index, "AND");
                                    toggleDropdown(index, "operator");
                                  }}
                                  className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                                >
                                  AND
                                </div>
                                <div
                                  onClick={() => {
                                    handleOperatorChange(index, "OR");
                                    toggleDropdown(index, "operator");
                                  }}
                                  className="px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100"
                                >
                                  OR
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {/* Event dropdown */}
                      <div className="relative trigger-condition-dropdown">
                        <button
                          type="button"
                          onClick={() => toggleDropdown(index, "event")}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50 min-w-[200px] justify-between"
                        >
                          <span className="truncate">{eventName}</span>
                          <ArrowDownFilled />
                        </button>
                        {openDropdowns[`${index}-event`] === "event" && (
                          <div className="absolute z-10 bg-white border border-gray-300 rounded-[6px] left-[0px] top-[40px] shadow-lg min-w-[300px] max-h-[300px] flex flex-col">
                            {/* Search bar */}
                            <div className="sticky top-0 bg-white p-2 border-b border-gray-300">
                              <div className="relative">
                                <svg
                                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                  />
                                </svg>
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={e =>
                                    setSearchQueries(prev => ({
                                      ...prev,
                                      [searchKey]: e.target.value,
                                    }))
                                  }
                                  placeholder="Search"
                                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-100"
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            {/* Event list */}
                            <div className="overflow-y-auto max-h-[240px]">
                              {filteredEvents.length > 0 ? (
                                filteredEvents.map(event => (
                                  <div
                                    key={event.id}
                                    onClick={() => {
                                      handleConditionChange(index, "eventId", event.id);
                                      toggleDropdown(index, "event");
                                      setSearchQueries(prev => {
                                        const newQueries = { ...prev };
                                        delete newQueries[searchKey];
                                        return newQueries;
                                      });
                                    }}
                                    className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                                      condition.eventId === event.id ? "bg-gray-100" : ""
                                    }`}
                                  >
                                    <span className="text-sm text-gray-900">{event.name}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-gray-500">
                                  No events found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* "has" keyword */}
                      <span className="text-sm text-gray-500">has</span>
                      {/* Status dropdown */}
                      <div className="relative trigger-condition-dropdown">
                        <button
                          type="button"
                          onClick={() => toggleDropdown(index, "status")}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-md flex items-center space-x-2 cursor-pointer hover:border-gray-400 bg-gray-50"
                        >
                          <span>{status === "OCCURRED" ? "Occurred" : "Not Occurred"}</span>
                          <ArrowDownFilled />
                        </button>
                        {openDropdowns[`${index}-status`] === "status" && (
                          <div className="absolute z-10 bg-white p-1 border border-gray-300 min-w-[150px] rounded-[6px] left-[0px] top-[40px] space-y-1 shadow-lg">
                            <div
                              onClick={() => {
                                handleConditionChange(index, "status", "OCCURRED");
                                toggleDropdown(index, "status");
                              }}
                              className={`px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100 ${
                                status === "OCCURRED" ? "bg-gray-100" : ""
                              }`}
                            >
                              Occurred
                            </div>
                            <div
                              onClick={() => {
                                handleConditionChange(index, "status", "NOT_OCCURRED");
                                toggleDropdown(index, "status");
                              }}
                              className={`px-3 py-2 cursor-pointer rounded-[6px] hover:bg-blue-100 ${
                                status === "NOT_OCCURRED" ? "bg-gray-100" : ""
                              }`}
                            >
                              Not Occurred
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Horizontal grey line below if condition */}
          <div className="border-t border-gray-300 mt-2"></div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col">
      {/* Label with horizontal grey line */}
      <div className="flex items-center mb-2">
        <span className="text-sm font-medium text-gray-600 mr-2">Trigger conditions</span>
        <div className="flex-1 border-t border-gray-300"></div>
      </div>
      <div className="flex items-start relative">
        <div className="flex-1 pl-3">{renderConditionContent()}</div>
      </div>
    </div>
  );
};
