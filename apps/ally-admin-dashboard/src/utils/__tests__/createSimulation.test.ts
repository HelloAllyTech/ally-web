import { describe, it, expect } from "vitest";

import { SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import { extractValidData } from "../common";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
} from "../createSimulation";

describe("createSimulation utils", () => {
  describe("getCreateSimulationSubSectionById", () => {
    it("should return the correct section for valid id", () => {
      const section = getCreateSimulationSubSectionById("basic-info");

      expect(section).toBeDefined();
      expect(section?.id).toBe("basic-info");
      expect(section?.label).toBe("Basic Information");
    });

    it("should return the character identity section", () => {
      const section = getCreateSimulationSubSectionById("character-identity");

      expect(section).toBeDefined();
      expect(section?.id).toBe("character-identity");
      expect(section?.label).toBe("Character Identity");
    });

    it("should return the traits and needs section", () => {
      const section = getCreateSimulationSubSectionById("traits-and-needs");

      expect(section).toBeDefined();
      expect(section?.id).toBe("traits-and-needs");
      expect(section?.label).toBe("Traits & Needs");
    });

    it("should return the conversation style section", () => {
      const section = getCreateSimulationSubSectionById("conversation-style");

      expect(section).toBeDefined();
      expect(section?.id).toBe("conversation-style");
      expect(section?.label).toBe("Conversation Style");
    });

    it("should return undefined for non-existent id", () => {
      const section = getCreateSimulationSubSectionById("non-existent-id");

      expect(section).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      const section = getCreateSimulationSubSectionById("");

      expect(section).toBeUndefined();
    });

    it("should be case-sensitive", () => {
      const section = getCreateSimulationSubSectionById("BASIC-INFO");

      expect(section).toBeUndefined();
    });

    it("should return section with all fields", () => {
      const section = getCreateSimulationSubSectionById("basic-info");

      expect(section?.fields).toBeDefined();
      expect(Array.isArray(section?.fields)).toBe(true);
      expect(section?.fields.length).toBeGreaterThan(0);
    });
  });

  describe("formatSimulationResponseData", () => {
    it("should format complete simulation response data", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test Simulation",
        description: "Test Description",
        status: "ACTIVE",
        isGlobal: false,
        coverImageUrl: "https://example.com/image.jpg",
        metadata: {
          age: "25",
          name: "John Doe",
          context: "Test context",
          coreMemories: "Test memories",
          agentGoal: "Test goal",
          currentLocation: "New York",
          emotionalNeeds: "Test needs",
          gender: "male",
          genderIdentity: "Male/Man",
          lifeHistory: "Test history",
          openingStatements: "Hello, how are you?",
          personality: "Friendly",
          profession: "Engineer",
          sessionBehaviorGuidelines: "Be supportive",
          sexualOrientation: "Heterosexual",
          startingState: "Calm",
          tone: "Casual",
          voiceId: "voice-123",
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result).toEqual({
        title: "Test Simulation",
        description: "Test Description",
        age: "25",
        name: "John Doe",
        context: "Test context",
        coreMemories: "Test memories",
        isGlobal: false,
        agentGoal: "Test goal",
        currentLocation: "New York",
        emotionalNeeds: "Test needs",
        gender: "male",
        genderIdentity: "Male/Man",
        lifeHistory: "Test history",
        openingStatements: "Hello, how are you?",
        personality: "Friendly",
        profession: "Engineer",
        sessionBehaviorGuidelines: "Be supportive",
        sexualOrientation: "Heterosexual",
        startingState: "Calm",
        tone: "Casual",
        voiceId: "voice-123",
        coverImageUrl: "https://example.com/image.jpg",
        coverVideoUrl: undefined,
        autoTerminationStatus: false,
        terminationEventId: undefined,
        terminationMessage: undefined,
      });
    });

    it("should handle missing metadata fields", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test Simulation",
        description: "Test Description",
        status: "DRAFT",
        coverImageUrl: "https://example.com/image.jpg",
        metadata: {
          name: "John Doe",
          age: "25",
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.title).toBe("Test Simulation");
      expect(result.description).toBe("Test Description");
      expect(result.name).toBe("John Doe");
      expect(result.age).toBe("25");
      expect(result.context).toBeUndefined();
      expect(result.coreMemories).toBeUndefined();
      expect(result.agentGoal).toBeUndefined();
    });

    it("should handle null metadata", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test Simulation",
        description: "Test Description",
        status: "DRAFT",
        coverImageUrl: "https://example.com/image.jpg",
        metadata: null,
      } as any;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.title).toBe("Test Simulation");
      expect(result.description).toBe("Test Description");
      expect(result.name).toBeUndefined();
      expect(result.age).toBeUndefined();
    });

    it("should handle undefined metadata", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test Simulation",
        description: "Test Description",
        status: "DRAFT",
        coverImageUrl: "https://example.com/image.jpg",
      } as any;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.title).toBe("Test Simulation");
      expect(result.description).toBe("Test Description");
      expect(result.name).toBeUndefined();
      expect(result.age).toBeUndefined();
    });

    it("should preserve all metadata fields when present", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test",
        description: "Test",
        status: "ACTIVE",
        coverImageUrl: "url",
        isGlobal: true,
        triggerWarnings: [],
        metadata: {
          age: "30",
          name: "Jane",
          context: "context",
          coreMemories: "memories",
          agentGoal: "goal",
          currentLocation: "location",
          emotionalNeeds: "needs",
          gender: "female",
          genderIdentity: "identity",
          lifeHistory: "history",
          openingStatements: "statements",
          personality: "personality",
          profession: "profession",
          sessionBehaviorGuidelines: "guidelines",
          sexualOrientation: "orientation",
          startingState: "state",
          tone: "tone",
          voiceId: "voice",
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      // Check all fields are present (title, description, coverImageUrl, coverVideoUrl, autoTerminationStatus, terminationEventId, terminationMessage + 18 metadata fields = 25 total)
      expect(Object.keys(result)).toHaveLength(28);
      expect(result.title).toBe("Test");
      expect(result.description).toBe("Test");
      expect(result.coverImageUrl).toBe("url");
      expect(result.age).toBe("30");
      expect(result.name).toBe("Jane");
      expect(result.voiceId).toBe("voice");
    });
  });

  describe("extractValidData", () => {
    it("should trim text fields", () => {
      const formData = {
        title: "   Test Simulation   ",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);

      expect(result.title).toBe("Test Simulation");
    });

    it("should convert empty select field to null", () => {
      const formData = {
        gender: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.gender).toBeNull();
    });

    it("should keep non-empty select field as is", () => {
      const formData = {
        gender: "female",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.gender).toBe("female");
    });

    it("should parse number fields correctly", () => {
      const formData = {
        age: "25",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.age).toBe(25);
    });

    it("should convert empty number fields to null", () => {
      const formData = {
        age: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.age).toBeNull();
    });

    it("should handle image upload field with valid URL", () => {
      const formData = {
        coverImageUrl: "https://example.com/image.jpg",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.coverImageUrl).toBe("https://example.com/image.jpg");
    });

    it("should convert empty image upload to empty string", () => {
      const formData = {
        coverImageUrl: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.coverImageUrl).toBeNull();
    });

    it("should convert empty array in image upload to null", () => {
      const formData = {
        coverImageUrl: [],
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.coverImageUrl).toBeNull();
    });

    it("should leave non-schema fields unchanged", () => {
      const formData = {
        customField: "  Hello  ",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.customField).toBe("Hello");
    });

    it("should handle multiple field types together", () => {
      const formData = {
        name: " John ",
        age: "30",
        gender: "",
        coverImageUrl: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);

      expect(result).toEqual({
        name: "John", // trimmed
        age: 30, // parsed
        gender: null, // empty select
        coverImageUrl: null, // empty string returns null
      });
    });
  });
});
