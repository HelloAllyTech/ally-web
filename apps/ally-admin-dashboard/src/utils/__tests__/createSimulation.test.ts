import { describe, it, expect, vi } from "vitest";

import { SIMULATION_CREATOR_FIELD_GROUPS, SIMULATION_CREATOR_FIELD_GROUPS_OLD } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import { extractValidData } from "../common";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
} from "../createSimulation";

describe("createSimulation utils", () => {
  describe("getCreateSimulationSubSectionById", () => {
    it("should return the correct section for valid id", () => {
      const section = getCreateSimulationSubSectionById("overview");

      expect(section).toBeDefined();
      expect(section?.id).toBe("overview");
      expect(section?.label).toBe("Overview");
    });

    it("should return the basic settings section", () => {
      const section = getCreateSimulationSubSectionById("basic-settings");

      expect(section).toBeDefined();
      expect(section?.id).toBe("basic-settings");
      expect(section?.label).toBe("Basic Settings");
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
      const section = getCreateSimulationSubSectionById("OVERVIEW");

      expect(section).toBeUndefined();
    });

    it("should return section with all fields", () => {
      const section = getCreateSimulationSubSectionById("overview");

      expect(section?.fields).toBeDefined();
      expect(Array.isArray(section?.fields)).toBe(true);
      expect(section?.fields.length).toBeGreaterThan(0);
    });
    describe("overview section fields", () => {
      const getOverviewSection = () => getCreateSimulationSubSectionById("overview");

      it("should have title field correctly configured in overview section", () => {
        const section = getOverviewSection();
        const field = section?.fields.find(f => f.id === "title");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Title");
        expect(field?.type).toBe("text");
        expect(field?.isMandatory).toBe(true);
      });

      it("should have difficultyLevel field correctly configured in overview section", () => {
        const section = getOverviewSection();
        const field = section?.fields.find(f => f.id === "difficultyLevel");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Difficulty Level");
        expect(field?.type).toBe("select");
        expect(field?.isMandatory).toBe(true);
      });

      it("should have coverImageUrl field correctly configured in overview section", () => {
        const section = getOverviewSection();
        const field = section?.fields.find(f => f.id === "coverImageUrl");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Cover Image");
        expect(field?.type).toBe("image_upload");
        expect(field?.isMandatory).toBe(true);
      });
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
        isPublic: false,
        coverImageUrl: "https://example.com/image.jpg",
        createdBy: "user-1",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: {
          age: 25,
          name: "John Doe",
          context: "Test context",
          coreMemories: "Test memories",
          agentGoal: "Test goal",
          currentLocation: "New York",
          emotionalNeeds: "Test needs",
          gender: "male",
          genderIdentity: "Male/Man",
          lifeHistory: "Test history",
          openingStatements: ["Hello, how are you?"],
          personality: "Friendly",
          profession: "Engineer",
          sessionBehaviorGuidelines: "Be supportive",
          sexualOrientation: "Heterosexual",
          startingState: "Calm",
          tone: "Casual",
          languageVoices: {
            1: "voice-123",
          },
          voiceId: "voice-123",
          agentDialogues: ["Sample dialogues"],
          customFields: [],
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result).toEqual({
        title: "Test Simulation",
        description: "Test Description",
        age: 25,
        name: "John Doe",
        context: "Test context",
        coreMemories: "Test memories",
        isGlobal: false,
        isPublic: false,
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
        coverImageUrl: "https://example.com/image.jpg",
        coverVideoUrl: undefined,
        terminationEvents: undefined,
        languageVoices: {
          1: "voice-123",
        },
        voiceId: "voice-123",
        difficultyLevel: "medium",
        responseLength: undefined,
        prompt: undefined,
        triggerWarningIds: [],
        agentDialogues: "Sample dialogues",
        customFields: [],
      });
    });

    it("should handle missing metadata fields", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test Simulation",
        description: "Test Description",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/image.jpg",
        createdBy: "user-1",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: {
          name: "John Doe",
          age: 25,
          customFields: [],
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.title).toBe("Test Simulation");
      expect(result.description).toBe("Test Description");
      expect(result.name).toBe("John Doe");
      expect(result.age).toBe(25);
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

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, formData);
      expect(result.gender).toBeNull();
    });

    it("should keep non-empty select field as is", () => {
      const formData = {
        gender: "female",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, formData);
      expect(result.gender).toBe("female");
    });

    it("should parse number fields correctly", () => {
      const formData = {
        age: "25",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, formData);
      expect(result.age).toBe(25);
    });

    it("should convert empty number fields to null", () => {
      const formData = {
        age: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, formData);
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

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS_OLD, formData);

      expect(result).toEqual({
        name: "John", // trimmed
        age: 30, // parsed
        gender: null, // empty select
        coverImageUrl: null, // empty string returns null
      });
    });
  });
});
