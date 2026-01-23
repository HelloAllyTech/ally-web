import { describe, it, expect } from "vitest";

import { SessionEvent } from "@types";

import { extractUniqueTags, filterEventsByTags } from "../tagUtils";

describe("tagUtils", () => {
  describe("extractUniqueTags", () => {
    it("should extract tags from events with valid tags", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["urgent", "customer"] },
        { id: "e2", name: "Event 2", tags: ["bug", "high-priority"] },
        { id: "e3", name: "Event 3", tags: ["feature"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["bug", "customer", "feature", "high-priority", "urgent"]);
    });

    it("should handle events without tags field", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1" },
        { id: "e2", name: "Event 2", tags: ["feature"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["feature"]);
    });

    it("should handle events with empty tags array", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: [] },
        { id: "e2", name: "Event 2", tags: ["feature"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["feature"]);
    });

    it("should handle duplicate tags across events", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["urgent", "bug"] },
        { id: "e2", name: "Event 2", tags: ["bug", "feature"] },
        { id: "e3", name: "Event 3", tags: ["urgent"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["bug", "feature", "urgent"]);
      expect(result.length).toBe(3);
    });

    it("should handle invalid tag values (null, undefined, empty strings, whitespace)", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["valid", null as any, undefined as any, "", "  "] },
        { id: "e2", name: "Event 2", tags: ["another"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["another", "valid"]);
    });

    it("should verify alphabetical sorting", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["zebra", "apple", "monkey"] },
        { id: "e2", name: "Event 2", tags: ["banana", "cat"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["apple", "banana", "cat", "monkey", "zebra"]);
    });

    it("should handle mixed valid and invalid tags", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["valid1", "", "valid2", "   ", null as any] },
        { id: "e2", name: "Event 2", tags: [undefined as any, "valid3"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["valid1", "valid2", "valid3"]);
    });

    it("should handle empty input array", () => {
      const result = extractUniqueTags([]);

      expect(result).toEqual([]);
    });

    it("should trim whitespace from tags", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: ["  urgent  ", "bug", "  feature  "] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["bug", "feature", "urgent"]);
    });

    it("should handle tags that are not strings", () => {
      const sessionEvents: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: [123 as any, true as any, "valid"] },
      ];

      const result = extractUniqueTags(sessionEvents);

      expect(result).toEqual(["valid"]);
    });
  });

  describe("filterEventsByTags", () => {
    const mockEvents: SessionEvent[] = [
      { id: "e1", name: "Event 1", tags: ["urgent", "bug"] },
      { id: "e2", name: "Event 2", tags: ["feature", "enhancement"] },
      { id: "e3", name: "Event 3", tags: ["urgent", "feature"] },
      { id: "e4", name: "Event 4", tags: ["bug", "critical"] },
    ];

    it("should filter by single tag", () => {
      const result = filterEventsByTags(mockEvents, ["urgent"]);

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toEqual(["e1", "e3"]);
    });

    it("should filter by multiple tags (OR logic)", () => {
      const result = filterEventsByTags(mockEvents, ["urgent", "critical"]);

      expect(result).toHaveLength(3);
      expect(result.map(e => e.id)).toEqual(["e1", "e3", "e4"]);
    });

    it("should return empty array when no tags selected", () => {
      const result = filterEventsByTags(mockEvents, []);

      expect(result).toEqual([]);
    });

    it("should handle events without tags field", () => {
      const eventsWithoutTags: SessionEvent[] = [
        { id: "e1", name: "Event 1" },
        { id: "e2", name: "Event 2", tags: ["feature"] },
      ];

      const result = filterEventsByTags(eventsWithoutTags, ["feature"]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e2");
    });

    it("should handle events with empty tags array", () => {
      const eventsWithEmptyTags: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: [] },
        { id: "e2", name: "Event 2", tags: ["feature"] },
      ];

      const result = filterEventsByTags(eventsWithEmptyTags, ["feature"]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e2");
    });

    it("should match events with at least one selected tag", () => {
      const result = filterEventsByTags(mockEvents, ["bug", "feature"]);

      expect(result).toHaveLength(4);
      expect(result.map(e => e.id)).toEqual(["e1", "e2", "e3", "e4"]);
    });

    it("should handle empty input array", () => {
      const result = filterEventsByTags([], ["urgent"]);

      expect(result).toEqual([]);
    });

    it("should handle non-existent tag selection", () => {
      const result = filterEventsByTags(mockEvents, ["non-existent-tag"]);

      expect(result).toEqual([]);
    });

    it("should not filter events when tags is null or undefined", () => {
      const eventsWithNullTags: SessionEvent[] = [
        { id: "e1", name: "Event 1", tags: null as any },
        { id: "e2", name: "Event 2", tags: undefined as any },
        { id: "e3", name: "Event 3", tags: ["feature"] },
      ];

      const result = filterEventsByTags(eventsWithNullTags, ["feature"]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e3");
    });

    it("should match events that have ANY of the selected tags", () => {
      const result = filterEventsByTags(
        [
          { id: "e1", name: "Event 1", tags: ["urgent"] },
          { id: "e2", name: "Event 2", tags: ["feature"] },
          { id: "e3", name: "Event 3", tags: ["critical"] },
        ],
        ["urgent", "feature"],
      );

      expect(result).toHaveLength(2);
      expect(result.map(e => e.id)).toEqual(["e1", "e2"]);
    });
  });
});
