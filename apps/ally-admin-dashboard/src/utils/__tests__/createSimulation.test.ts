import { describe, it, expect, vi } from "vitest";

import { ExperienceMode, ChecklistType, SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import { extractValidData } from "../common";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
} from "../createSimulation";
import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared/featureFlag";

// Mock feature flags
vi.mock("@ally-ui-mono/ui-shared/featureFlag", () => ({
  FEATURE_FLAGS_MAP: {
    NEW_CREATE_SIMULATION_FLAG: true,
    AUTO_TERMINATION_FIELD_FLAG: true,
    PRIVATE_PUBLIC__SIMULATION_FLAG: true,
  },
}));

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
      expect(section?.label).toBe("Character Identity");
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
      const getBasicSettingsSection = () => getCreateSimulationSubSectionById("basic-settings");
      const overviewFields = [
        {
          id: "genderIdentity",
          label: "Your gender identity",
          type: "select",
        },
        {
          id: "sexualOrientation",
          label: "Your sexual orientation",
          type: "select",
        },
        {
          id: "responseLength",
          label: "Length of your responses",
          type: "select",
        },
      ];
      describe("presence and configuration", () => {
        it.each(overviewFields)(
          "should have $id field correctly configured in overview section",
          ({ id, label, type }) => {
            const section = getOverviewSection();
            const field = section?.fields.find(f => f.id === id);
            expect(field).toBeDefined();
            expect(field?.label).toBe(label);
            expect(field?.type).toBe(type);
            expect(field?.isMandatory).toBe(false);
          },
        );
      });
      describe("absence from basic-settings section", () => {
        it.each(overviewFields)("should NOT have $id field in basic-settings section", ({ id }) => {
          const section = getBasicSettingsSection();
          const field = section?.fields.find(f => f.id === id);
          expect(field).toBeUndefined();
        });
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
        ...(FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG ? { isPublic: false } : {}),
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
        ...(FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG ? { isPublic: false } : {}),
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
        ...(FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG ? { isPublic: false } : {}),
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

    it("should preserve all metadata fields when present", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-123",
        title: "Test",
        description: "Test",
        status: "ACTIVE",
        coverImageUrl: "url",
        isGlobal: true,
        ...(FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG ? { isPublic: true } : {}),
        createdBy: "user-1",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: {
          age: 30,
          name: "Jane",
          context: "context",
          coreMemories: "memories",
          agentGoal: "goal",
          currentLocation: "location",
          emotionalNeeds: "needs",
          gender: "female",
          genderIdentity: "identity",
          lifeHistory: "history",
          openingStatements: ["statements"],
          personality: "personality",
          profession: "profession",
          sessionBehaviorGuidelines: "guidelines",
          sexualOrientation: "orientation",
          startingState: "state",
          tone: "tone",
          languageVoices: {
            1: "voice-123",
          },
          voiceId: "voice-123",
          customFields: [],
          experienceMode: ExperienceMode.CHECKLIST,
          checklistType: ChecklistType.GUIDED,
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      // Check all fields are present (title, description, coverImageUrl, coverVideoUrl, terminationEvents, difficultyLevel, responseLength, prompt, isGlobal, triggerWarningIds, customFields, agentDialogues + 18 metadata fields + experienceMode + checklistType = 33 total, +1 for isPublic when flag is true = 34)
      expect(Object.keys(result)).toHaveLength(
        FEATURE_FLAGS_MAP.PRIVATE_PUBLIC__SIMULATION_FLAG ? 34 : 33,
      );
      expect(result.title).toBe("Test");
      expect(result.description).toBe("Test");
      expect(result.coverImageUrl).toBe("url");
      expect(result.age).toBe(30);
      expect(result.name).toBe("Jane");
      expect(result.voiceId).toBe("voice-123");
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
