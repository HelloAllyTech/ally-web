import { describe, it, expect, beforeEach } from "vitest";

import { SimulationSummary } from "@types";

import { getFormattedFeedbackSection } from "../utils";

describe("getFormattedFeedbackSection", () => {
  const mockSummary: SimulationSummary = {
    id: "test-summary-123",
    createdAt: "2024-01-01T10:00:00Z",
    endedAt: "2024-01-01T10:30:00Z",
    score: 85,
    events: [
      {
        id: "event-1",
        createdAt: "2024-01-01T10:05:00Z",
        events: {
          message: "Session started",
          score: 5,
        },
      },
      {
        id: "event-2",
        createdAt: "2024-01-01T10:15:00Z",
        events: {
          message: "First interaction",
          score: 8,
        },
      },
      {
        id: "event-3",
        createdAt: "2024-01-01T10:25:00Z",
        events: {
          message: "Session ended",
          score: 7,
        },
      },
    ],
    details: {
      summary: {
        feedback: {
          improvements: ["More practice needed", "Focus on timing"],
          positives: ["Good communication", "Clear explanations"],
        },
      },
    },
  };

  describe("Basic Functionality", () => {
    it("should return formatted feedback section", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      expect(result).toHaveProperty("keyEvents");
      expect(result).toHaveProperty("improvements");
      expect(result).toHaveProperty("positives");
    });

    it("should format key events with correct structure", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      expect(result.keyEvents).toHaveLength(3);
      expect(result.keyEvents[0]).toHaveProperty("time");
      expect(result.keyEvents[0]).toHaveProperty("event");
      expect(result.keyEvents[0]).toHaveProperty("score");
    });

    it("should extract improvements from details", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      expect(result.improvements).toEqual(["More practice needed", "Focus on timing"]);
    });

    it("should extract positives from details", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      expect(result.positives).toEqual(["Good communication", "Clear explanations"]);
    });
  });

  describe("Time Calculation", () => {
    it("should calculate correct time differences", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      // First event: 5 minutes after start
      expect(result.keyEvents[0].time).toBe("05:00");

      // Second event: 15 minutes after start
      expect(result.keyEvents[1].time).toBe("15:00");

      // Third event: 25 minutes after start
      expect(result.keyEvents[2].time).toBe("25:00");
    });

    it("should handle events at exact start time", () => {
      const summaryWithStartEvent = {
        ...mockSummary,
        events: [
          {
            id: "event-start",
            createdAt: "2024-01-01T10:00:00Z", // Same as session start
            events: {
              message: "Session started",
              score: 5,
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(summaryWithStartEvent);

      expect(result.keyEvents[0].time).toBe("00:00");
    });

    it("should handle events with seconds", () => {
      const summaryWithSeconds = {
        ...mockSummary,
        events: [
          {
            id: "event-seconds",
            createdAt: "2024-01-01T10:01:30Z", // 1 minute 30 seconds
            events: {
              message: "Event with seconds",
              score: 5,
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(summaryWithSeconds);

      expect(result.keyEvents[0].time).toBe("01:30");
    });
  });

  describe("Event Sorting", () => {
    it("should sort events by creation time", () => {
      const unsortedSummary = {
        ...mockSummary,
        events: [
          {
            id: "event-3",
            createdAt: "2024-01-01T10:25:00Z",
            events: { message: "Last event", score: 7 },
          },
          {
            id: "event-1",
            createdAt: "2024-01-01T10:05:00Z",
            events: { message: "First event", score: 5 },
          },
          {
            id: "event-2",
            createdAt: "2024-01-01T10:15:00Z",
            events: { message: "Middle event", score: 8 },
          },
        ],
      };

      const result = getFormattedFeedbackSection(unsortedSummary);

      expect(result.keyEvents[0].event).toBe("First event");
      expect(result.keyEvents[1].event).toBe("Middle event");
      expect(result.keyEvents[2].event).toBe("Last event");
    });

    it("should maintain original events array", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      // Should not modify original events array
      expect(mockSummary.events).toHaveLength(3);
      expect(mockSummary.events[0].events.message).toBe("Session started");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty events array", () => {
      const emptyEventsSummary = {
        ...mockSummary,
        events: [],
      };

      const result = getFormattedFeedbackSection(emptyEventsSummary);

      expect(result.keyEvents).toEqual([]);
    });

    it("should handle null events", () => {
      const nullEventsSummary = {
        ...mockSummary,
        events: null,
      };

      const result = getFormattedFeedbackSection(nullEventsSummary);

      expect(result.keyEvents).toBeUndefined();
    });

    it("should handle undefined events", () => {
      const undefinedEventsSummary = {
        ...mockSummary,
        events: undefined,
      };

      const result = getFormattedFeedbackSection(undefinedEventsSummary);

      expect(result.keyEvents).toBeUndefined();
    });

    it("should handle missing details", () => {
      const noDetailsSummary = {
        ...mockSummary,
        details: null,
      };

      const result = getFormattedFeedbackSection(noDetailsSummary);

      expect(result.improvements).toBeUndefined();
      expect(result.positives).toBeUndefined();
    });

    it("should handle missing feedback in details", () => {
      const noFeedbackSummary = {
        ...mockSummary,
        details: {
          summary: {
            feedback: null,
          },
        },
      };

      const result = getFormattedFeedbackSection(noFeedbackSummary);

      expect(result.improvements).toBeUndefined();
      expect(result.positives).toBeUndefined();
    });

    it("should handle missing summary in details", () => {
      const noSummaryDetails = {
        ...mockSummary,
        details: {
          summary: null,
        },
      };

      const result = getFormattedFeedbackSection(noSummaryDetails);

      expect(result.improvements).toBeUndefined();
      expect(result.positives).toBeUndefined();
    });
  });

  describe("Data Integrity", () => {
    it("should preserve event data", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      expect(result.keyEvents[0].event).toBe("Session started");
      expect(result.keyEvents[0].score).toBe(5);
      expect(result.keyEvents[1].event).toBe("First interaction");
      expect(result.keyEvents[1].score).toBe(8);
    });

    it("should handle events without score", () => {
      const summaryWithoutScore = {
        ...mockSummary,
        events: [
          {
            id: "event-no-score",
            createdAt: "2024-01-01T10:05:00Z",
            events: {
              message: "Event without score",
              score: null,
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(summaryWithoutScore);

      expect(result.keyEvents[0].event).toBe("Event without score");
      expect(result.keyEvents[0].score).toBeNull();
    });

    it("should handle events without message", () => {
      const summaryWithoutMessage = {
        ...mockSummary,
        events: [
          {
            id: "event-no-message",
            createdAt: "2024-01-01T10:05:00Z",
            events: {
              message: null,
              score: 5,
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(summaryWithoutMessage);

      expect(result.keyEvents[0].event).toBeNull();
      expect(result.keyEvents[0].score).toBe(5);
    });
  });

  describe("Time Formatting", () => {
    it("should format time with leading zeros", () => {
      const result = getFormattedFeedbackSection(mockSummary);

      // All times should be in MM:SS format
      result.keyEvents.forEach(event => {
        expect(event.time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it("should handle large time differences", () => {
      const longSessionSummary = {
        ...mockSummary,
        events: [
          {
            id: "event-long",
            createdAt: "2024-01-01T11:30:00Z", // 1 hour 30 minutes
            events: {
              message: "Long session event",
              score: 5,
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(longSessionSummary);

      expect(result.keyEvents[0].time).toBe("90:00");
    });
  });
});
