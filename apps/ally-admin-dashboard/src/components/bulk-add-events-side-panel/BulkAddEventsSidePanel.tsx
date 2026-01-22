import React, { useState, useMemo, useRef, useCallback } from "react";

import { DoubleArrowRight } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { useClickOutside } from "@hooks";
import { SessionEvent, UpdateScenarioEventDataParam } from "@types";
import { extractUniqueTags, filterEventsByTags, formatToMappedEvent } from "@utils";

interface BulkAddEventsSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessionEvents: SessionEvent[];
  mappedEvents: UpdateScenarioEventDataParam[];
  onBulkAdd: (events: UpdateScenarioEventDataParam[]) => void;
}

const PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="flex items-center justify-between p-6 border-b border-border-light">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-800 hover:text-neutral-800"
    >
      <span className="inline-flex w-[14px] h-[14px]">
        <DoubleArrowRight />
      </span>
      <span className="text-sm">{en.simulation.bulkAddEventsTitle}</span>
    </button>
  </div>
);

const TagMultiSelect: React.FC<{
  availableTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
}> = ({ availableTags, selectedTags, onTagToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const filteredTags = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableTags;
    return availableTags.filter(tag => tag.toLowerCase().includes(query));
  }, [availableTags, searchQuery]);

  const handleToggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleTagToggle = useCallback(
    (tag: string) => {
      onTagToggle(tag);
    },
    [onTagToggle],
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggleDropdown}
        className="w-full px-4 py-2 text-left border border-border-light rounded-md hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
      >
        <span className="text-sm text-typography-800">
          {selectedTags.length > 0
            ? `${selectedTags.length} tag${selectedTags.length !== 1 ? "s" : ""} selected`
            : en.simulation.selectTags}
        </span>
      </button>

      {/* Selected tags chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTags.map(tag => (
            <div
              key={tag}
              className="flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
            >
              <span>{tag}</span>
              <button onClick={() => handleTagToggle(tag)} className="hover:text-primary-900 ml-1">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-10 bg-white border border-border-light w-full max-h-[300px] overflow-y-auto rounded-md left-0 top-[46px] shadow-lg custom-scrollbar mt-1">
          <div className="sticky top-0 bg-white p-2 border-b">
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full px-3 py-2 border border-border-light rounded focus:outline-none focus:ring-2 focus:ring-primary-100 text-sm"
              type="text"
            />
          </div>
          {filteredTags.length > 0 ? (
            <div className="py-1">
              {filteredTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <div
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-4 py-2 cursor-pointer hover:bg-primary-50 transition-colors flex items-center gap-2 ${
                      isSelected ? "bg-primary-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm">{tag}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-typography-600">No tags found</div>
          )}
        </div>
      )}
    </div>
  );
};

export const BulkAddEventsSidePanel: React.FC<BulkAddEventsSidePanelProps> = ({
  isOpen,
  onClose,
  sessionEvents,
  mappedEvents,
  onBulkAdd,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Extract unique tags from session events
  const availableTags = useMemo(() => extractUniqueTags(sessionEvents), [sessionEvents]);

  // Filter events by selected tags
  const filteredEvents = useMemo(
    () => filterEventsByTags(sessionEvents, selectedTags),
    [sessionEvents, selectedTags],
  );

  // Get already mapped event IDs
  const alreadyMappedIds = useMemo(
    () => new Set(mappedEvents.map(e => e.id?.value).filter(Boolean)),
    [mappedEvents],
  );

  // Get new events (not already mapped)
  const newEvents = useMemo(
    () => filteredEvents.filter(event => event.id && !alreadyMappedIds.has(event.id)),
    [filteredEvents, alreadyMappedIds],
  );

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      }
      return [...prev, tag];
    });
  }, []);

  const handleAddEvents = useCallback(() => {
    const eventsToAdd = newEvents.map(event => formatToMappedEvent(event));
    onBulkAdd(eventsToAdd);
    // Reset selected tags after adding
    setSelectedTags([]);
  }, [newEvents, onBulkAdd]);

  // Reset selected tags when panel closes
  const handleClose = useCallback(() => {
    setSelectedTags([]);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />

      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light">
        <PanelHeader onClose={handleClose} />

        <div className="h-[calc(100vh-100px)] px-10 pt-6 overflow-y-auto custom-scrollbar">
          {/* Tag Selection Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-typography-900 mb-3">
              {en.simulation.selectTags}
            </h3>
            {availableTags.length > 0 ? (
              <TagMultiSelect
                availableTags={availableTags}
                selectedTags={selectedTags}
                onTagToggle={handleTagToggle}
              />
            ) : (
              <div className="text-sm text-typography-600">{en.simulation.noTagsAvailable}</div>
            )}
          </div>

          {/* Filtered Events Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-typography-900 mb-3">Filtered Events</h3>
            {selectedTags.length === 0 ? (
              <div className="text-sm text-typography-600 bg-neutral-50 p-4 rounded-md">
                {en.simulation.noTagsSelected}
              </div>
            ) : newEvents.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-typography-800 bg-primary-50 p-4 rounded-md">
                  {en.simulation.filteredEventsCount(newEvents.length)}
                </div>
                {/* Event list */}
                <div className="border border-border-light rounded-md max-h-[300px] overflow-y-auto custom-scrollbar">
                  {newEvents.map((event, index) => (
                    <div
                      key={event.id || index}
                      className="px-4 py-3 border-b border-border-light last:border-b-0 hover:bg-neutral-50"
                    >
                      <div className="text-sm font-medium text-typography-900">
                        {event.eventCode ? `${event.eventCode} - ${event.name}` : event.name}
                      </div>
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {event.tags.map(tag => (
                            <span
                              key={tag}
                              className={`text-xs px-2 py-0.5 rounded ${
                                selectedTags.includes(tag)
                                  ? "bg-primary-100 text-primary-700"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-typography-600 bg-neutral-50 p-4 rounded-md">
                {filteredEvents.length > 0
                  ? "All filtered events are already added"
                  : en.simulation.noEventsMatchTags}
              </div>
            )}
          </div>

          {/* Add Button */}
          {newEvents.length > 0 && (
            <div className="mt-6">
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleAddEvents}
                className="h-12 w-fit px-8"
              >
                {en.simulation.addSelectedEvents}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
