import { describe, it, expect, beforeEach } from "vitest";

import { SimulationSummary } from "@types";

import { getFormattedFeedbackSection } from "../utils";

describe("getFormattedFeedbackSection", () => {
  const mockSummary: SimulationSummary = {
    id: "test-summary-123",
    createdAt: "2024-01-01T10:00:00Z",
    updatedAt: "2024-01-01T10:30:00Z",
    tenantId: "tenant-123",
    roomId: "room-123",
    scenarioId: 1,
    counselorId: 1,
    status: "completed",
    startedAt: "2024-01-01T10:00:00Z",
    endedAt: "2024-01-01T10:30:00Z",
    score: 85,
    metadata: {
      sessionName: "Test Session",
    },
    totalScore: 85,
    events: [
      {
        eventId: "event-1",
        createdAt: "2024-01-01T10:05:00Z",
        events: {
          id: "1",
          name: "Session started",
          description: "Session started",
          score: "5",
          emoji: "🎯",
          message: "Session started",
        },
      },
      {
        eventId: "event-2",
        createdAt: "2024-01-01T10:15:00Z",
        events: {
          id: "2",
          name: "First interaction",
          description: "First interaction",
          score: "8",
          emoji: "💬",
          message: "First interaction",
        },
      },
      {
        eventId: "event-3",
        createdAt: "2024-01-01T10:25:00Z",
        events: {
          id: "3",
          name: "Session ended",
          description: "Session ended",
          score: "7",
          emoji: "🏁",
          message: "Session ended",
        },
      },
    ],
    details: {
      id: "details-123",
      createdAt: "2024-01-01T10:00:00Z",
      updatedAt: "2024-01-01T10:30:00Z",
      tenantId: "tenant-123",
      scenarioSessionId: "session-123",
      callDuration: 1800,
      summary: {
        feedback: {
          improvements: ["More practice needed", "Focus on timing"],
          positives: ["Good communication", "Clear explanations"],
        },
      },
    },
    hasFeedback: true,
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
            eventId: "event-start",
            createdAt: "2024-01-01T10:00:00Z", // Same as session start
            events: {
              id: "1",
              name: "Session started",
              description: "Session started",
              score: "5",
              emoji: "🎯",
              message: "Session started",
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
            eventId: "event-seconds",
            createdAt: "2024-01-01T10:01:30Z", // 1 minute 30 seconds
            events: {
              id: "2",
              name: "Event with seconds",
              description: "Event with seconds",
              score: "5",
              emoji: "⏱️",
              message: "Event with seconds",
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
            eventId: "event-3",
            createdAt: "2024-01-01T10:25:00Z",
            events: {
              id: "3",
              name: "Last event",
              description: "Last event",
              score: "7",
              emoji: "🏁",
              message: "Last event",
            },
          },
          {
            eventId: "event-1",
            createdAt: "2024-01-01T10:05:00Z",
            events: {
              id: "4",
              name: "First event",
              description: "First event",
              score: "5",
              emoji: "🎯",
              message: "First event",
            },
          },
          {
            eventId: "event-2",
            createdAt: "2024-01-01T10:15:00Z",
            events: {
              id: "5",
              name: "Middle event",
              description: "Middle event",
              score: "8",
              emoji: "💬",
              message: "Middle event",
            },
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
          id: "details-123",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:30:00Z",
          tenantId: "tenant-123",
          scenarioSessionId: "session-123",
          callDuration: 1800,
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
          id: "details-123",
          createdAt: "2024-01-01T10:00:00Z",
          updatedAt: "2024-01-01T10:30:00Z",
          tenantId: "tenant-123",
          scenarioSessionId: "session-123",
          callDuration: 1800,
          summary: null,
        },
      };

      const result = getFormattedFeedbackSection(noSummaryDetails);

      expect(result.improvements).toBeUndefined();
      expect(result.positives).toBeUndefined();
    });
  });

  describe("Data Integrity", () => {
    it("should handle events without score", () => {
      const summaryWithoutScore = {
        ...mockSummary,
        events: [
          {
            eventId: "event-no-score",
            createdAt: "2024-01-01T10:05:00Z",
            events: {
              id: "6",
              name: "Event without score",
              description: "Event without score",
              score: null,
              emoji: "❓",
              message: "Event without score",
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(summaryWithoutScore);

      expect(result.keyEvents[0].event).toBe("Event without score");
      expect(result.keyEvents[0].score).toBeNull();
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
            eventId: "event-long",
            createdAt: "2024-01-01T11:30:00Z", // 1 hour 30 minutes
            events: {
              id: "8",
              name: "Long session event",
              description: "Long session event",
              score: "5",
              emoji: "⏰",
              message: "Long session event",
            },
          },
        ],
      };

      const result = getFormattedFeedbackSection(longSessionSummary);

      expect(result.keyEvents[0].time).toBe("90:00");
    });
  });
});
