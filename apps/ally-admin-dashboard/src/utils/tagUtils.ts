import { SessionEvent } from "@types";

/**
 * Extract unique tags from session events
 */
export const extractUniqueTags = (sessionEvents: SessionEvent[]): string[] => {
  const tagsSet = new Set<string>();

  sessionEvents.forEach(event => {
    if (event.tags && Array.isArray(event.tags)) {
      event.tags.forEach(tag => {
        if (tag && typeof tag === "string" && tag.trim()) {
          tagsSet.add(tag.trim());
        }
      });
    }
  });

  return Array.from(tagsSet).sort();
};

/**
 * Filter events that have at least one of the selected tags
 */
export const filterEventsByTags = (
  sessionEvents: SessionEvent[],
  selectedTags: string[],
): SessionEvent[] => {
  if (selectedTags.length === 0) return [];

  return sessionEvents.filter(event => {
    if (!event.tags || !Array.isArray(event.tags)) return false;

    // Check if event has ANY of the selected tags
    return selectedTags.some(selectedTag => event.tags?.includes(selectedTag));
  });
};
