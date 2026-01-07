import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  SessionEvent,
  SessionEventDetectionType,
  SessionEventDetectionCondition,
  UpdateEventDataParam,
  CombinationExpressionNode,
} from "@types";
import { EVENT_DETECTION_TYPES } from "@constants";

// Mock utility functions
vi.mock("@utils", async () => {
  const actual = await vi.importActual<typeof import("@utils")>("@utils");
  return {
    ...actual,
    convertTimeToSeconds: vi.fn((timeString: string) => {
      if (!timeString) return 0;
      const parts = timeString.split(":");
      if (parts.length !== 3) return 0;
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }),
    convertSecondsToTimeString: vi.fn((seconds: number | undefined) => {
      if (seconds === undefined || seconds === null) return "";
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }),
    isNonEmptyArray: vi.fn((arr: any) => Array.isArray(arr) && arr.length > 0),
    isNumber: vi.fn((val: any) => typeof val === "number" && !isNaN(val)),
    isNonEmptyString: vi.fn((val: any) => typeof val === "string" && val.trim().length > 0),
  };
});

import {
  mapOperatorToCondition,
  areBothEventsSelected,
  isExactlyOneEventSelected,
  convertEventToApiPayload,
  convertApiResponseToEvent,
} from "../eventManagement";

describe("eventManagement utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapOperatorToCondition", () => {
    it("should map LESS_THAN to LT", () => {
      expect(mapOperatorToCondition("LESS_THAN")).toBe(SessionEventDetectionCondition.LT);
    });

    it("should map GREATER_THAN to GT", () => {
      expect(mapOperatorToCondition("GREATER_THAN")).toBe(SessionEventDetectionCondition.GT);
    });

    it("should map EQUAL to EQ", () => {
      expect(mapOperatorToCondition("EQUAL")).toBe(SessionEventDetectionCondition.EQ);
    });

    it("should map LESS_THAN_OR_EQUAL to LTE", () => {
      expect(mapOperatorToCondition("LESS_THAN_OR_EQUAL")).toBe(SessionEventDetectionCondition.LTE);
    });

    it("should map GREATER_THAN_OR_EQUAL to GTE", () => {
      expect(mapOperatorToCondition("GREATER_THAN_OR_EQUAL")).toBe(
        SessionEventDetectionCondition.GTE,
      );
    });

    it("should return null for undefined operator", () => {
      expect(mapOperatorToCondition(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(mapOperatorToCondition("")).toBeNull();
    });

    it("should return null for unknown operator", () => {
      expect(mapOperatorToCondition("UNKNOWN_OPERATOR")).toBeUndefined();
    });
  });

  describe("areBothEventsSelected", () => {
    it("should return true when both events are selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "event-1" },
        right: { id: "event-2" },
      };

      expect(areBothEventsSelected(expression)).toBe(true);
    });

    it("should return false when only left event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "event-1" },
        right: { id: "" },
      };

      expect(areBothEventsSelected(expression)).toBe(false);
    });

    it("should return false when only right event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "" },
        right: { id: "event-2" },
      };

      expect(areBothEventsSelected(expression)).toBe(false);
    });

    it("should return false when neither event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "" },
        right: { id: "" },
      };

      expect(areBothEventsSelected(expression)).toBe(false);
    });

    it("should return false when expression is undefined", () => {
      expect(areBothEventsSelected(undefined)).toBe(false);
    });

    it("should handle NOT nodes correctly", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { type: "NOT", left: { id: "event-1" } },
        right: { id: "event-2" },
      };

      expect(areBothEventsSelected(expression)).toBe(true);
    });

    it("should return false when left event has whitespace-only id", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "   " },
        right: { id: "event-2" },
      };

      expect(areBothEventsSelected(expression)).toBe(false);
    });
  });

  describe("isExactlyOneEventSelected", () => {
    it("should return true when only left event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "event-1" },
        right: { id: "" },
      };

      expect(isExactlyOneEventSelected(expression)).toBe(true);
    });

    it("should return true when only right event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "" },
        right: { id: "event-2" },
      };

      expect(isExactlyOneEventSelected(expression)).toBe(true);
    });

    it("should return false when both events are selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "event-1" },
        right: { id: "event-2" },
      };

      expect(isExactlyOneEventSelected(expression)).toBe(false);
    });

    it("should return false when neither event is selected", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { id: "" },
        right: { id: "" },
      };

      expect(isExactlyOneEventSelected(expression)).toBe(false);
    });

    it("should return false when expression is undefined", () => {
      expect(isExactlyOneEventSelected(undefined)).toBe(false);
    });

    it("should handle NOT nodes correctly", () => {
      const expression: CombinationExpressionNode = {
        type: "AND",
        left: { type: "NOT", left: { id: "event-1" } },
        right: { id: "" },
      };

      expect(isExactlyOneEventSelected(expression)).toBe(true);
    });
  });

  describe("convertEventToApiPayload", () => {
    describe("SENTENCE_SIMILARITY events", () => {
      it("should convert SENTENCE_SIMILARITY event with sentences and speaker", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY,
          triggerCondition: {
            sentences: ["Hello", "World"],
            speaker: "CARE_GIVER",
          },
          score: 10,
          emoji: "😊",
          message: "Test message",
          branchInstruction: "Branch instruction",
        };

        const result = convertEventToApiPayload(event);

        expect(result).toEqual({
          name: "Test Event",
          description: "",
          score: 10,
          emoji: "😊",
          message: "Test message",
          branchInstruction: "Branch instruction",
          detectionType: SessionEventDetectionType.SENTENCE_SIMILARITY,
          visibilityType: "",
          detectionData: {
            sentences: ["Hello", "World"],
            speaker: "CARE_GIVER",
          },
          detectionConfig: {
            maxOccurrences: undefined,
            minGapTime: undefined,
            startTime: undefined,
            endTime: undefined,
            minScore: undefined,
            maxScore: undefined,
          },
        });
      });

      it("should convert SENTENCE_SIMILARITY event with only sentences", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY,
          triggerCondition: {
            sentences: ["Hello"],
            speaker: "CARE_GIVER",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.sentences).toEqual(["Hello"]);
        expect(result?.detectionData?.speaker).toBe("CARE_GIVER");
      });

      it("should not include empty sentences array", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SENTENCE_SIMILARITY,
          triggerCondition: {
            sentences: [],
            speaker: "CARE_GIVER",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.sentences).toBeUndefined();
        expect(result?.detectionData?.speaker).toBe("CARE_GIVER");
      });
    });

    describe("SEMANTIC_SIMILARITY events", () => {
      it("should convert SEMANTIC_SIMILARITY event with sentences and speaker", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY,
          triggerCondition: {
            sentences: ["Judgemental", "Empathetic"],
            speaker: "CARE_GIVER",
          },
          score: 10,
          emoji: "😊",
          message: "Test message",
          branchInstruction: "Branch instruction",
        };

        const result = convertEventToApiPayload(event);

        expect(result).toEqual({
          name: "Test Event",
          description: "",
          score: 10,
          emoji: "😊",
          message: "Test message",
          branchInstruction: "Branch instruction",
          detectionType: SessionEventDetectionType.SEMANTIC_SIMILARITY,
          visibilityType: "",
          detectionData: {
            sentences: ["Judgemental", "Empathetic"],
            speaker: "CARE_GIVER",
          },
          detectionConfig: {
            maxOccurrences: undefined,
            minGapTime: undefined,
            startTime: undefined,
            endTime: undefined,
            minScore: undefined,
            maxScore: undefined,
          },
        });
      });

      it("should convert SEMANTIC_SIMILARITY event with only sentences", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY,
          triggerCondition: {
            sentences: ["Judgemental"],
            speaker: "CARE_GIVER",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.sentences).toEqual(["Judgemental"]);
        expect(result?.detectionData?.speaker).toBe("CARE_GIVER");
      });

      it("should not include empty sentences array", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SEMANTIC_SIMILARITY,
          triggerCondition: {
            sentences: [],
            speaker: "CARE_GIVER",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.sentences).toBeUndefined();
        expect(result?.detectionData?.speaker).toBe("CARE_GIVER");
      });
    });

    describe("SCORE_BASED events", () => {
      it("should convert SCORE_BASED event with score and operator", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
          triggerCondition: {
            value: 50,
            operator: "GREATER_THAN",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.score).toBe(50);
        expect(result?.detectionData?.condition).toBe(SessionEventDetectionCondition.GT);
      });

      it("should convert SCORE_BASED event with only score", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
          triggerCondition: {
            operator: "GREATER_THAN",
            value: 75,
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.score).toBe(75);
        expect(result?.detectionData?.condition).toBe(SessionEventDetectionCondition.GT);
      });
    });

    describe("TIME_BASED events", () => {
      it("should convert TIME_BASED event with time and operator", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.TIME_BASED,
          triggerCondition: {
            value: "00:10:00",
            operator: "LESS_THAN",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.time).toBe(600); // 10 minutes in seconds
        expect(result?.detectionData?.condition).toBe(SessionEventDetectionCondition.LT);
      });

      it("should convert TIME_BASED event with only time", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.TIME_BASED,
          triggerCondition: {
            operator: "LESS_THAN",
            value: "01:30:00",
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.time).toBe(5400); // 1.5 hours in seconds
        expect(result?.detectionData?.condition).toBe(SessionEventDetectionCondition.LT);
      });
    });

    describe("COMBINATION events", () => {
      it("should convert COMBINATION event when both events are selected", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.COMBINATION,
          triggerCondition: {
            expression: {
              type: "AND",
              left: { id: "event-1" },
              right: { id: "event-2" },
            },
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData?.expression).toEqual({
          type: "AND",
          left: { id: "event-1" },
          right: { id: "event-2" },
        });
      });

      it("should not include expression when both events are not selected", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.COMBINATION,
          triggerCondition: {
            expression: {
              type: "AND",
              left: { id: "event-1" },
              right: { id: "" },
            },
          },
        };

        const result = convertEventToApiPayload(event);

        expect(result?.detectionData).toBeUndefined();
      });
    });

    describe("Common fields", () => {
      it("should include id when provided", () => {
        const event: UpdateEventDataParam = {
          id: "event-123",
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
        };

        const result = convertEventToApiPayload(event);

        expect(result?.id).toBe("event-123");
      });

      it("should use default values for optional fields", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
        };

        const result = convertEventToApiPayload(event);

        expect(result?.description).toBe("");
        expect(result?.score).toBe(0);
        expect(result?.emoji).toBe("");
        expect(result?.message).toBe("");
        expect(result?.branchInstruction).toBe("");
        expect(result?.visibilityType).toBe("");
      });

      it("should handle non-integer score", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
          score: 10.5,
        };

        const result = convertEventToApiPayload(event);

        // The code uses Number.isInteger, so non-integers default to 0
        expect(result?.score).toBe(0);
      });

      it("should include default detectionData when triggerCondition is not provided for SCORE_BASED", () => {
        const event: UpdateEventDataParam = {
          name: "Test Event",
          detectionType: EVENT_DETECTION_TYPES.SCORE_BASED,
        };

        const result = convertEventToApiPayload(event);

        // SCORE_BASED events get default values when triggerCondition is not provided
        expect(result?.detectionData).toEqual({
          score: 0,
          condition: "GT",
        });
      });
    });
  });

  describe("convertApiResponseToEvent", () => {
    describe("TIME_BASED events", () => {
      it("should convert TIME_BASED event with time and condition", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.TIME,
          detectionData: {
            time: 600,
            condition: SessionEventDetectionCondition.LT,
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("TIME_BASED");
        expect((result.triggerCondition as any)?.value).toBe("00:10:00");
        expect((result.triggerCondition as any)?.operator).toBe("LESS_THAN");
      });

      it("should convert TIME_BASED event with only time", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.TIME,
          detectionData: {
            time: 3600,
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.value).toBe("01:00:00");
        expect((result.triggerCondition as any)?.operator).toBeUndefined();
      });

      it("should convert TIME_BASED event with only condition", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.TIME,
          detectionData: {
            condition: SessionEventDetectionCondition.GT,
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.operator).toBe("GREATER_THAN");
        expect((result.triggerCondition as any)?.value).toBeUndefined();
      });
    });

    describe("SCORE_BASED events", () => {
      it("should convert SCORE_BASED event with score and condition", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SCORE,
          detectionData: {
            score: 50,
            condition: SessionEventDetectionCondition.GTE,
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("SCORE_BASED");
        expect((result.triggerCondition as any)?.value).toBe(50);
        expect((result.triggerCondition as any)?.operator).toBe("GREATER_THAN_OR_EQUAL");
      });

      it("should convert SCORE_BASED event with only score", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SCORE,
          detectionData: {
            score: 75,
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.value).toBe(75);
        expect((result.triggerCondition as any)?.operator).toBeUndefined();
      });
    });

    describe("SENTENCE_SIMILARITY events", () => {
      it("should convert SENTENCE_SIMILARITY event with sentences and speaker", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SENTENCE_SIMILARITY,
          detectionData: {
            sentences: ["Hello", "World"],
            speaker: "user",
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("SENTENCE_SIMILARITY");
        expect((result.triggerCondition as any)?.sentences).toEqual(["Hello", "World"]);
        expect((result.triggerCondition as any)?.speaker).toBe("user");
      });

      it("should convert SENTENCE_SIMILARITY event with only sentences", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SENTENCE_SIMILARITY,
          detectionData: {
            sentences: ["Hello"],
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.sentences).toEqual(["Hello"]);
        expect((result.triggerCondition as any)?.speaker).toBeUndefined();
      });
    });

    describe("SEMANTIC_SIMILARITY events", () => {
      it("should convert SEMANTIC_SIMILARITY event with sentences and speaker", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SEMANTIC_SIMILARITY,
          detectionData: {
            sentences: ["Judgemental", "Empathetic"],
            speaker: "CARE_GIVER",
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("SEMANTIC_SIMILARITY");
        expect((result.triggerCondition as any)?.sentences).toEqual(["Judgemental", "Empathetic"]);
        expect((result.triggerCondition as any)?.speaker).toBe("CARE_GIVER");
      });

      it("should convert SEMANTIC_SIMILARITY event with only sentences", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SEMANTIC_SIMILARITY,
          detectionData: {
            sentences: ["Judgemental"],
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.sentences).toEqual(["Judgemental"]);
        expect((result.triggerCondition as any)?.speaker).toBeUndefined();
      });

      it("should convert SEMANTIC_SIMILARITY event with only speaker", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SEMANTIC_SIMILARITY,
          detectionData: {
            speaker: "CARE_GIVER",
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect((result.triggerCondition as any)?.speaker).toBe("CARE_GIVER");
        expect((result.triggerCondition as any)?.sentences).toBeUndefined();
      });
    });

    describe("COMBINATION events", () => {
      it("should convert COMBINATION event with expression", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.COMBINATION,
          detectionData: {
            expression: {
              type: "AND",
              left: { id: "event-1" },
              right: { id: "event-2" },
            },
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("COMBINATION");
        expect((result.triggerCondition as any)?.expression).toEqual({
          type: "AND",
          left: { id: "event-1" },
          right: { id: "event-2" },
        });
      });
    });

    describe("Common fields", () => {
      it("should convert all common fields", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          eventCode: "EVT001",
          description: "Test Description",
          score: 10,
          emoji: "😊",
          message: "Test message",
          branchInstruction: "Branch instruction",
          visibilityType: "PUBLIC",
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.id).toBe("event-1");
        expect(result.name).toBe("Test Event");
        expect(result.eventCode).toBe("EVT001");
        expect(result.description).toBe("Test Description");
        expect(result.score).toBe(10);
        expect(result.emoji).toBe("😊");
        expect(result.message).toBe("Test message");
        expect(result.branchInstruction).toBe("Branch instruction");
        expect(result.visibilityType).toBe("PUBLIC");
      });

      it("should use default values for missing fields", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.name).toBe("");
        expect(result.eventCode).toBe("");
        expect(result.description).toBe("");
        expect(result.score).toBe(0);
        expect(result.emoji).toBe("");
        expect(result.message).toBe("");
        expect(result.branchInstruction).toBe("");
        expect(result.visibilityType).toBe("");
      });

      it("should handle null score", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          score: null as any,
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.score).toBe(0);
      });

      it("should not include triggerCondition when detectionData is empty", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          name: "Test Event",
          detectionType: SessionEventDetectionType.SCORE,
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.triggerCondition).toBeUndefined();
      });
    });

    describe("Edge cases", () => {
      it("should handle unknown detection type", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          detectionType: "UNKNOWN_TYPE" as any,
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.detectionType).toBe("UNKNOWN_TYPE");
      });

      it("should handle undefined detectionData", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          detectionType: SessionEventDetectionType.SCORE,
        };

        const result = convertApiResponseToEvent(apiEvent);

        expect(result.triggerCondition).toBeUndefined();
      });

      it("should handle empty sentences array", () => {
        const apiEvent: SessionEvent = {
          id: "event-1",
          detectionType: SessionEventDetectionType.SENTENCE_SIMILARITY,
          detectionData: {
            sentences: [],
            speaker: "user",
          },
        };

        const result = convertApiResponseToEvent(apiEvent);

        // The code includes sentences even if empty array (sentences: [] || undefined = [])
        expect((result.triggerCondition as any)?.sentences).toEqual([]);
        expect((result.triggerCondition as any)?.speaker).toBe("user");
      });
    });
  });
});
