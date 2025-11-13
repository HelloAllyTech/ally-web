import { describe, it, expect, vi } from "vitest";

import { SessionEvent, UpdateScenarioEventDataParam } from "@types";

// Mock the MappedEventSidePanel component to prevent circular dependency issues during testing
vi.mock("@components/mapped-event-side-panel/MappedEventSidePanel", () => ({
  MappedEventSidePanel: vi.fn(),
}));

import {
  MAPPED_EVENT_FIELDS,
  DEFAULT_EVENT_VALUES,
  createCell,
  createNewEvent,
  getDisabledState,
  formatToMappedEvent,
  convertToApiFormat,
  formatApiResponseToMappedEvent,
  createSessionEventsMap,
} from "../eventMapping";

describe("eventMapping utils", () => {
  describe("MAPPED_EVENT_FIELDS", () => {
    it("should have all required field constants", () => {
      expect(MAPPED_EVENT_FIELDS.ID).toBe("id");
      expect(MAPPED_EVENT_FIELDS.NAME).toBe("name");
      expect(MAPPED_EVENT_FIELDS.SCORE).toBe("score");
      expect(MAPPED_EVENT_FIELDS.EMOJI).toBe("emoji");
      expect(MAPPED_EVENT_FIELDS.MESSAGE).toBe("message");
      expect(MAPPED_EVENT_FIELDS.FEEDBACK_STATUS).toBe("feedbackStatus");
      expect(MAPPED_EVENT_FIELDS.BRANCHING_STATUS).toBe("branchingStatus");
      expect(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION).toBe("branchInstruction");
    });
  });

  describe("DEFAULT_EVENT_VALUES", () => {
    it("should have all default values", () => {
      expect(DEFAULT_EVENT_VALUES.EMOJI).toBe("🫥");
      expect(DEFAULT_EVENT_VALUES.SCORE).toBe(0);
      expect(DEFAULT_EVENT_VALUES.MESSAGE).toBe("");
      expect(DEFAULT_EVENT_VALUES.BRANCH_INSTRUCTION).toBe("");
      expect(DEFAULT_EVENT_VALUES.FEEDBACK_STATUS).toBe(false);
      expect(DEFAULT_EVENT_VALUES.BRANCHING_STATUS).toBe(false);
    });
  });

  describe("createCell", () => {
    it("should create a cell with value, disabled, and rowId", () => {
      const cell = createCell("test value", false, "row-1");

      expect(cell).toEqual({
        value: "test value",
        disabled: false,
        rowId: "row-1",
      });
    });

    it("should handle different value types", () => {
      expect(createCell(123, true, "row-1")).toEqual({
        value: 123,
        disabled: true,
        rowId: "row-1",
      });

      expect(createCell(true, false, "row-2")).toEqual({
        value: true,
        disabled: false,
        rowId: "row-2",
      });

      expect(createCell(null, true, "row-3")).toEqual({
        value: null,
        disabled: true,
        rowId: "row-3",
      });
    });

    it("should handle empty strings", () => {
      const cell = createCell("", false, "");

      expect(cell).toEqual({
        value: "",
        disabled: false,
        rowId: "",
      });
    });
  });

  describe("createNewEvent", () => {
    it("should create a new event with default values", () => {
      const event = createNewEvent();

      expect(event.id.value).toBe("");
      expect(event.name.value).toBe("");
      expect(event.score.value).toBe(0);
      expect(event.emoji.value).toBe("🫥");
      expect(event.message.value).toBe("");
      expect(event.feedbackStatus.value).toBe(false);
      expect(event.branchingStatus.value).toBe(false);
      expect(event.branchInstruction.value).toBe("");
    });

    it("should create cells with correct disabled states", () => {
      const event = createNewEvent();

      expect(event.id.disabled).toBe(false);
      expect(event.name.disabled).toBe(false);
      expect(event.score.disabled).toBe(true);
      expect(event.emoji.disabled).toBe(true);
      expect(event.message.disabled).toBe(true);
      expect(event.feedbackStatus.disabled).toBe(false);
      expect(event.branchingStatus.disabled).toBe(false);
      expect(event.branchInstruction.disabled).toBe(true);
    });

    it("should create cells with empty rowId", () => {
      const event = createNewEvent();

      expect(event.id.rowId).toBe("");
      expect(event.name.rowId).toBe("");
      expect(event.score.rowId).toBe("");
    });
  });

  describe("getDisabledState", () => {
    describe("feedback fields", () => {
      it("should disable feedback fields when feedbackStatus is false", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.SCORE, false, false)).toBe(true);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, false, false)).toBe(true);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, false, false)).toBe(true);
      });

      it("should enable feedback fields when feedbackStatus is true", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.SCORE, true, false)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, true, false)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, true, false)).toBe(false);
      });

      it("should not be affected by branchingStatus", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.SCORE, true, true)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.EMOJI, true, true)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.MESSAGE, true, true)).toBe(false);
      });
    });

    describe("branch instruction field", () => {
      it("should disable branch instruction when branchingStatus is false", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, false, false)).toBe(true);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, true, false)).toBe(true);
      });

      it("should enable branch instruction when branchingStatus is true", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, false, true)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.BRANCH_INSTRUCTION, true, true)).toBe(false);
      });
    });

    describe("other fields", () => {
      it("should never disable id and name fields", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.ID, false, false)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.NAME, false, false)).toBe(false);
      });

      it("should never disable status fields", () => {
        expect(getDisabledState(MAPPED_EVENT_FIELDS.FEEDBACK_STATUS, false, false)).toBe(false);
        expect(getDisabledState(MAPPED_EVENT_FIELDS.BRANCHING_STATUS, false, false)).toBe(false);
      });
    });
  });

  describe("formatToMappedEvent", () => {
    it("should format a complete SessionEvent", () => {
      const sessionEvent: SessionEvent = {
        id: "event-1",
        name: "Test Event",
        score: 10,
        emoji: "😊",
        message: "Great job!",
        branchInstruction: "Continue to next step",
      };

      const result = formatToMappedEvent(sessionEvent);

      expect(result.id.value).toBe("event-1");
      expect(result.name.value).toBe("Test Event");
      expect(result.score.value).toBe(10);
      expect(result.emoji.value).toBe("😊");
      expect(result.message.value).toBe("Great job!");
      expect(result.branchInstruction.value).toBe("Continue to next step");
      expect(result.feedbackStatus.value).toBe(true);
      expect(result.branchingStatus.value).toBe(true);
    });

    it("should use default values for missing fields", () => {
      const sessionEvent: SessionEvent = {
        id: "event-1",
      };

      const result = formatToMappedEvent(sessionEvent);

      expect(result.id.value).toBe("event-1");
      expect(result.name.value).toBe("event-1"); // Falls back to id
      expect(result.score.value).toBe(0);
      expect(result.emoji.value).toBe("🫥");
      expect(result.message.value).toBe("");
      expect(result.branchInstruction.value).toBe("");
    });

    it("should set correct disabled states", () => {
      const sessionEvent: SessionEvent = {
        id: "event-1",
        name: "Test Event",
      };

      const result = formatToMappedEvent(sessionEvent);

      // Feedback and branching are always true in formatToMappedEvent
      expect(result.score.disabled).toBe(false);
      expect(result.emoji.disabled).toBe(false);
      expect(result.message.disabled).toBe(false);
      expect(result.branchInstruction.disabled).toBe(false);
    });

    it("should use event name when provided, otherwise use id", () => {
      const eventWithName: SessionEvent = {
        id: "event-1",
        name: "Custom Name",
      };

      const eventWithoutName: SessionEvent = {
        id: "event-2",
      };

      expect(formatToMappedEvent(eventWithName).name.value).toBe("Custom Name");
      expect(formatToMappedEvent(eventWithoutName).name.value).toBe("event-2");
    });

    it("should set all rowIds to event id", () => {
      const sessionEvent: SessionEvent = {
        id: "event-123",
        name: "Test",
      };

      const result = formatToMappedEvent(sessionEvent);

      expect(result.id.rowId).toBe("event-123");
      expect(result.name.rowId).toBe("event-123");
      expect(result.score.rowId).toBe("event-123");
      expect(result.emoji.rowId).toBe("event-123");
      expect(result.message.rowId).toBe("event-123");
      expect(result.feedbackStatus.rowId).toBe("event-123");
      expect(result.branchingStatus.rowId).toBe("event-123");
      expect(result.branchInstruction.rowId).toBe("event-123");
    });
  });

  describe("convertToApiFormat", () => {
    it("should convert UpdateScenarioEventDataParam array to API format", () => {
      const events: UpdateScenarioEventDataParam[] = [
        {
          id: createCell("event-1", false, "event-1"),
          name: createCell("Test Event", false, "event-1"),
          score: createCell(10, false, "event-1"),
          emoji: createCell("😊", false, "event-1"),
          message: createCell("Great!", false, "event-1"),
          feedbackStatus: createCell(true, false, "event-1"),
          branchingStatus: createCell(true, false, "event-1"),
          branchInstruction: createCell("Next step", false, "event-1"),
        },
      ];

      const result = convertToApiFormat(events);

      expect(result).toEqual([
        {
          id: "event-1",
          name: "Test Event",
          score: 10,
          emoji: "😊",
          message: "Great!",
          feedbackStatus: true,
          branchingStatus: true,
          branchInstruction: "Next step",
        },
      ]);
    });

    it("should handle multiple events", () => {
      const events: UpdateScenarioEventDataParam[] = [
        {
          id: createCell("event-1", false, "event-1"),
          name: createCell("Event 1", false, "event-1"),
          score: createCell(5, false, "event-1"),
          emoji: createCell("😊", false, "event-1"),
          message: createCell("Message 1", false, "event-1"),
          feedbackStatus: createCell(true, false, "event-1"),
          branchingStatus: createCell(false, false, "event-1"),
          branchInstruction: createCell("", false, "event-1"),
        },
        {
          id: createCell("event-2", false, "event-2"),
          name: createCell("Event 2", false, "event-2"),
          score: createCell(10, false, "event-2"),
          emoji: createCell("🎉", false, "event-2"),
          message: createCell("Message 2", false, "event-2"),
          feedbackStatus: createCell(false, false, "event-2"),
          branchingStatus: createCell(true, false, "event-2"),
          branchInstruction: createCell("Branch 2", false, "event-2"),
        },
      ];

      const result = convertToApiFormat(events);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("event-1");
      expect(result[1].id).toBe("event-2");
    });

    it("should handle empty array", () => {
      const result = convertToApiFormat([]);

      expect(result).toEqual([]);
    });

    it("should extract values from cells", () => {
      const events: UpdateScenarioEventDataParam[] = [
        {
          id: createCell("id-1", true, "row-1"),
          name: createCell("name-1", true, "row-1"),
          score: createCell(0, true, "row-1"),
          emoji: createCell("🫥", true, "row-1"),
          message: createCell("", true, "row-1"),
          feedbackStatus: createCell(false, false, "row-1"),
          branchingStatus: createCell(false, false, "row-1"),
          branchInstruction: createCell("", true, "row-1"),
        },
      ];

      const result = convertToApiFormat(events);

      expect(result[0]).toEqual({
        id: "id-1",
        name: "name-1",
        score: 0,
        emoji: "🫥",
        message: "",
        feedbackStatus: false,
        branchingStatus: false,
        branchInstruction: "",
      });
    });
  });

  describe("formatApiResponseToMappedEvent", () => {
    it("should format API response to UpdateScenarioEventDataParam", () => {
      const apiResponse = {
        eventId: "event-1",
        name: "event-1",
        score: 10,
        emoji: "😊",
        message: "Great job!",
        feedbackStatus: true,
        branchingStatus: true,
        branchInstruction: "Continue",
      };

      const result = formatApiResponseToMappedEvent(apiResponse);

      expect(result.id.value).toBe("event-1");
      expect(result.name.value).toBe("event-1");
      expect(result.score.value).toBe(10);
      expect(result.emoji.value).toBe("😊");
      expect(result.message.value).toBe("Great job!");
      expect(result.feedbackStatus.value).toBe(true);
      expect(result.branchingStatus.value).toBe(true);
      expect(result.branchInstruction.value).toBe("Continue");
    });

    it("should set correct disabled states based on status flags", () => {
      const apiResponse = {
        eventId: "event-1",
        name: "Event Name",
        score: 10,
        emoji: "😊",
        message: "Message",
        feedbackStatus: true,
        branchingStatus: true,
        branchInstruction: "Instruction",
      };

      const result = formatApiResponseToMappedEvent(apiResponse);

      expect(result.score.disabled).toBe(false);
      expect(result.emoji.disabled).toBe(false);
      expect(result.message.disabled).toBe(false);
      expect(result.branchInstruction.disabled).toBe(false);
    });

    it("should disable feedback fields when feedbackStatus is false", () => {
      const apiResponse = {
        eventId: "event-1",
        name: "event-1",
        score: 0,
        emoji: "🫥",
        message: "",
        feedbackStatus: false,
        branchingStatus: true,
        branchInstruction: "Instruction",
      };

      const result = formatApiResponseToMappedEvent(apiResponse);

      expect(result.score.disabled).toBe(false);
      expect(result.emoji.disabled).toBe(true);
      expect(result.message.disabled).toBe(true);
      expect(result.branchInstruction.disabled).toBe(false);
    });

    it("should disable branch instruction when branchingStatus is false", () => {
      const apiResponse = {
        eventId: "event-1",
        name: "event-1",
        score: 10,
        emoji: "😊",
        message: "Message",
        feedbackStatus: true,
        branchingStatus: false,
        branchInstruction: "",
      };

      const result = formatApiResponseToMappedEvent(apiResponse);

      expect(result.score.disabled).toBe(false);
      expect(result.emoji.disabled).toBe(false);
      expect(result.message.disabled).toBe(false);
      expect(result.branchInstruction.disabled).toBe(true);
    });

    it("should set all rowIds to eventId", () => {
      const apiResponse = {
        eventId: "event-123",
        name: "event-123",
        score: 0,
        emoji: "🫥",
        message: "",
        feedbackStatus: false,
        branchingStatus: false,
        branchInstruction: "",
      };

      const result = formatApiResponseToMappedEvent(apiResponse);

      expect(result.id.rowId).toBe("event-123");
      expect(result.name.rowId).toBe("event-123");
      expect(result.score.rowId).toBe("event-123");
      expect(result.emoji.rowId).toBe("event-123");
      expect(result.message.rowId).toBe("event-123");
      expect(result.feedbackStatus.rowId).toBe("event-123");
      expect(result.branchingStatus.rowId).toBe("event-123");
      expect(result.branchInstruction.rowId).toBe("event-123");
    });
  });

  describe("createSessionEventsMap", () => {
    it("should create a Map from SessionEvent array", () => {
      const events: SessionEvent[] = [
        { id: "event-1", name: "Event 1" },
        { id: "event-2", name: "Event 2" },
        { id: "event-3", name: "Event 3" },
      ];

      const result = createSessionEventsMap(events);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      expect(result.get("event-1")).toEqual({ id: "event-1", name: "Event 1" });
      expect(result.get("event-2")).toEqual({ id: "event-2", name: "Event 2" });
      expect(result.get("event-3")).toEqual({ id: "event-3", name: "Event 3" });
    });

    it("should handle empty array", () => {
      const result = createSessionEventsMap([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it("should allow quick lookup by id", () => {
      const events: SessionEvent[] = [
        { id: "event-1", name: "Event 1", score: 10 },
        { id: "event-2", name: "Event 2", score: 20 },
      ];

      const map = createSessionEventsMap(events);

      expect(map.has("event-1")).toBe(true);
      expect(map.has("event-2")).toBe(true);
      expect(map.has("event-3")).toBe(false);
    });

    it("should handle duplicate ids (last one wins)", () => {
      const events: SessionEvent[] = [
        { id: "event-1", name: "First" },
        { id: "event-1", name: "Second" },
      ];

      const map = createSessionEventsMap(events);

      expect(map.size).toBe(1);
      expect(map.get("event-1")?.name).toBe("Second");
    });

    it("should preserve all event properties", () => {
      const events: SessionEvent[] = [
        {
          id: "event-1",
          name: "Event 1",
          score: 10,
          emoji: "😊",
          message: "Great!",
          branchInstruction: "Next",
        },
      ];

      const map = createSessionEventsMap(events);
      const event = map.get("event-1");

      expect(event?.id).toBe("event-1");
      expect(event?.name).toBe("Event 1");
      expect(event?.score).toBe(10);
      expect(event?.emoji).toBe("😊");
      expect(event?.message).toBe("Great!");
      expect(event?.branchInstruction).toBe("Next");
    });
  });
});
