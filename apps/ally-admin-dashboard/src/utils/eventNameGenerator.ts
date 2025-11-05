import { EventType, EVENT_TYPE_OPTIONS } from "@components/event-type-selection-dialog";

/**
 * Generates a sequential event name based on event type and existing events
 * @param eventType - The type of event (SENTENCE_SIMILARITY, TIME_BASED, etc.)
 * @param existingEvents - Array of existing event names (can include "- Test Event" suffix)
 * @returns Sequential event name (e.g., SS001, TB002, etc.)
 */
export const generateSequentialEventName = (
  eventType: EventType,
  existingEvents: string[],
): string => {
  const typeOption = EVENT_TYPE_OPTIONS.find(opt => opt.value === eventType);
  if (!typeOption) {
    return "EVENT001";
  }

  const prefix = typeOption.prefix;
  // Updated pattern to handle names with "- Test Event" suffix
  const pattern = new RegExp(`^${prefix}(\\d+)(\\s*-\\s*Test\\s*Event)?$`, "i");

  // Find all existing event names with the same prefix (strip "- Test Event" suffix)
  const matchingNames = existingEvents
    .map(name => {
      const match = name.match(pattern);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(num => num !== null) as number[];

  // Get the next sequential number
  const nextNumber = matchingNames.length > 0 ? Math.max(...matchingNames) + 1 : 1;

  // Format with leading zeros (001, 002, etc.)
  const formattedNumber = nextNumber.toString().padStart(3, "0");

  return `${prefix}${formattedNumber}`;
};
