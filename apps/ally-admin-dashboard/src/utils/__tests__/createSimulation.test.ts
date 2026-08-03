import { describe, it, expect, vi } from "vitest";

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
      const section = getCreateSimulationSubSectionById("basic-settings");

      expect(section).toBeDefined();
      expect(section?.id).toBe("basic-settings");
      expect(section?.label).toBe("Basic Settings");
    });

    it("should return the basic settings section", () => {
      const section = getCreateSimulationSubSectionById("basic-settings");

      expect(section).toBeDefined();
      expect(section?.id).toBe("basic-settings");
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
      const section = getCreateSimulationSubSectionById("basic-settings");

      expect(section?.fields).toBeDefined();
      expect(Array.isArray(section?.fields)).toBe(true);
      expect(section?.fields.length).toBeGreaterThan(0);
    });
    describe("basic settings section fields", () => {
      const getBasicSettingsSection = () => getCreateSimulationSubSectionById("basic-settings");

      it("should have title field correctly configured in basic settings section", () => {
        const section = getBasicSettingsSection();
        const field = section?.fields.find(f => f.id === "title");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Title");
        expect(field?.type).toBe("title_panel");
        expect(field?.isMandatory).toBe(true);
      });

      it("should no longer expose the difficultyLevel field (deprecated from the UI)", () => {
        const section = getBasicSettingsSection();
        const field = section?.fields.find(f => f.id === "difficultyLevel");
        expect(field).toBeUndefined();
      });

      it("should have challenge description field in basic settings section", () => {
        const section = getBasicSettingsSection();
        const field = section?.fields.find(f => f.id === "description");

        expect(field).toBeDefined();
        expect(field?.label).toBe("Challenge Description");
        expect(field?.placeholder).toBe("What is the primary learning goal?");
        expect(field?.type).toBe("challenge_description");
        expect(field?.isMandatory).toBe(false);
      });

      it("should have characterProfileText (Character Backstory) as optional", () => {
        const section = getBasicSettingsSection();
        const field = section?.fields.find(f => f.id === "characterProfileText");
        expect(field).toBeDefined();
        expect(field?.isMandatory).toBe(false);
      });

      it("should place challenge description before character backstory in basic settings section", () => {
        const section = getBasicSettingsSection();
        const fieldIds = section?.fields.map(field => field.id) ?? [];

        expect(fieldIds.indexOf("characterProfileText")).toBeGreaterThan(-1);
        expect(fieldIds.indexOf("description")).toBeLessThan(
          fieldIds.indexOf("characterProfileText"),
        );
      });

      it("should have coverImageUrl field correctly configured in basic settings section", () => {
        const section = getBasicSettingsSection();
        const field = section?.fields.find(f => f.id === "coverImageUrl");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Cover Image");
        expect(field?.type).toBe("image_upload");
        expect(field?.isMandatory).toBe(false);
      });

      it("should have selectedMainPromptCode (Skill Version) as first field", () => {
        const section = getBasicSettingsSection();
        expect(section?.fields[0]?.id).toBe("selectedMainPromptCode");
        expect(section?.fields[0]?.label).toBe("Skill Version");
      });

      it("should have prompt (Role instruction) as mandatory", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const field = section?.fields.find(f => f.id === "prompt");
        expect(field).toBeDefined();
        expect(field?.isMandatory).toBe(true);
      });

      it("should have behaviorInstructions (Behaviour Instructions) as optional", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const field = section?.fields.find(f => f.id === "behaviorInstructions");
        expect(field).toBeDefined();
        expect(field?.isMandatory).toBe(false);
      });

      it("should have linguisticStyleSamples (Linguistic Style Samples) as optional", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const field = section?.fields.find(f => f.id === "linguisticStyleSamples");
        expect(field).toBeDefined();
        expect(field?.isMandatory).toBe(false);
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
          currentLocation: "New York",
          gender: "male",
          genderIdentity: "Male/Man",
          openingStatements: ["Hello, how are you?"],
          reminders: ["Maintain eye contact"],
          profession: "Engineer",
          sexualOrientation: "Heterosexual",
          languageVoices: {
            1: "voice-123",
          },
          agentDialogues: ["Sample dialogues"],
          customFields: [],
          optGuardrails: false,
          currentState: false,
          checklistType: "GUIDED",
          experienceMode: "CHECKLIST",
          maxTimeValue: "00:10:00",
          timerMode: true,
          stateInstructions: [
            {
              stateId: 1,
              name: "test name",
              instruction: "test instruction",
              dialogues: ["test dialogue"],
            },
          ],
        },
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result).toEqual({
        title: "Test Simulation",
        description: "Test Description",
        age: 25,
        name: "John Doe",
        context: "Test context",
        isGlobal: false,
        isPublic: false,
        knowledgeSources: undefined,
        allowedFillerWords: undefined,
        behaviorInstructions: [],
        characterProfileText: undefined,
        competency: undefined,
        currentLocation: "New York",
        gender: "male",
        genderIdentity: "Male/Man",
        linguisticStyleSamples: undefined,
        openingStatements: "Hello, how are you?",
        translationOpeningStatements: {},
        openingDialoguePrimaryLanguageId: null,
        translationDescription: {},
        challengeDescriptionPrimaryLanguageId: null,
        translationTitle: {},
        reminders: "Maintain eye contact",
        translationReminders: {},
        remindersPrimaryLanguageId: null,
        profession: "Engineer",
        sexualOrientation: "Heterosexual",
        agentTestCaseIds: [],
        showScoreMeter: undefined,
        enableFeedback: true,
        pauseEnabled: false,
        coverImageUrl: "https://example.com/image.jpg",
        coverVideoUrl: undefined,
        category: "",
        partnerOrgName: "",
        terminationEvents: undefined,
        languageVoices: {
          1: "voice-123",
        },
        difficultyLevel: "medium",
        prompt: undefined,
        triggerWarningIds: [],
        agentDialogues: "Sample dialogues",
        customFields: [],
        optGuardrails: false,
        temperature: 0.7,
        fillerEnabled: false,
        comfortAudioEnabled: false,
        comfortAudioUrl: "",
        comfortAudioVolume: 0.3,
        historyTrimEnabled: true,
        inputCompressionEnabled: false,
        continuousBackchanneling: false,
        currentState: false,
        checklistType: "GUIDED",
        experienceMode: "CHECKLIST",
        maxTimeValue: "00:10:00",
        timerMode: true,
        stateInstructions: [
          {
            stateId: 1,
            name: "test name",
            instruction: "test instruction",
            dialogues: ["test dialogue"],
          },
        ],
        stateNames: [],
        selectedMainPromptCode: undefined,
        selectedEvaluatorPromptCode: undefined,
        mainPromptVariantByLanguage: {},
        helperAgentPrompt: undefined,
        agentBuilderDescription: undefined,
        agentBuilderPrompt: undefined,
        interimReplyEnabled: true,
        languageCharacteristics: undefined,
        states: [],
        // No picks stored → every language inherits its own STT default.
        sttConfigByLanguage: {},
      });
    });

    it("should map translationDescription and challengeDescriptionPrimaryLanguageId when backend provides them", () => {
      const mockResponse = {
        id: "sim-translated",
        title: "T",
        description: "Primary description",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [] },
        translationDescription: { "7": "Descripción en español" },
        challengeDescriptionPrimaryLanguageId: 1,
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.description).toBe("Primary description");
      expect(result.translationDescription).toEqual({
        "7": "Descripción en español",
      });
      expect(result.challengeDescriptionPrimaryLanguageId).toBe(1);
    });

    it("should map translationReminders and remindersPrimaryLanguageId, joining each language's lines", () => {
      const mockResponse = {
        id: "sim-reminders-translated",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [], reminders: ["Stay calm", "Listen actively"] },
        translationReminders: { "7": ["Mantén la calma", "Escucha activamente"] },
        remindersPrimaryLanguageId: 1,
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.reminders).toBe("Stay calm\nListen actively");
      expect(result.translationReminders).toEqual({
        "7": "Mantén la calma\nEscucha activamente",
      });
      expect(result.remindersPrimaryLanguageId).toBe(1);
    });

    it("should default reminders fields to empty when backend omits them", () => {
      const mockResponse = {
        id: "sim-no-reminders",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [] },
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.reminders).toBe("");
      expect(result.translationReminders).toEqual({});
      expect(result.remindersPrimaryLanguageId).toBeNull();
    });

    it("should map translationTitle when backend provides it", () => {
      const mockResponse = {
        id: "sim-translated-title",
        title: "Primary title",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [] },
        translationTitle: { "7": "Título en español" },
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.title).toBe("Primary title");
      expect(result.translationTitle).toEqual({
        "7": "Título en español",
      });
    });

    it("should default translationTitle to {} when backend omits it", () => {
      const mockResponse = {
        id: "sim-no-translation-title",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [] },
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.translationTitle).toEqual({});
    });

    it("should default translationDescription to {} and challengeDescriptionPrimaryLanguageId to null when backend omits them", () => {
      const mockResponse = {
        id: "sim-no-translation",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: { customFields: [] },
      } as unknown as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.translationDescription).toEqual({});
      expect(result.challengeDescriptionPrimaryLanguageId).toBeNull();
    });

    it("should drop state instructions with invalid state ids (e.g. legacy state 4)", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-legacy",
        title: "Legacy",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: {
          stateInstructions: [
            { stateId: -1, name: "", instruction: "a", dialogues: ["d"] },
            { stateId: 4, name: "", instruction: "legacy", dialogues: ["x"] },
          ],
        },
        competency: undefined,
        behaviorInstructions: [
          {
            category: "c",
            behaviors: [],
            instructions: [],
            stateInstructions: [
              { stateId: "1", instruction: "ok" },
              { stateId: "99", instruction: "bad" },
            ],
          },
        ],
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);

      expect(result.stateInstructions).toEqual([
        { stateId: -1, name: "", instruction: "a", dialogues: ["d"] },
      ]);
      expect(result.behaviorInstructions?.[0]?.stateInstructions).toEqual([
        { stateId: "1", instruction: "ok" },
      ]);
    });

    it("should strip legacy state 4 when backend sends string stateIds", () => {
      const mockResponse: GetSimulationByIdResponse = {
        id: "sim-api-shape",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/i.jpg",
        createdBy: "u",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "medium",
        metadata: {},
        competency: undefined,
        behaviorInstructions: [
          {
            category: "SHOULD_DO" as any,
            behaviors: [],
            instructions: [],
            stateInstructions: [
              { stateId: "1", instruction: "Say your husband's name as Gautham" },
              { stateId: "2", instruction: "More reflective but still hesitant" },
              { stateId: "3", instruction: "Emotionally open and self-aware" },
              { stateId: "4", instruction: "Emotionally open and constructive" },
              { stateId: "-1", instruction: "Be rude" },
            ],
          },
        ],
      } as GetSimulationByIdResponse;

      const result = formatSimulationResponseData(mockResponse);
      expect(result.behaviorInstructions?.[0]?.stateInstructions).toEqual([
        { stateId: "1", instruction: "Say your husband's name as Gautham" },
        { stateId: "2", instruction: "More reflective but still hesitant" },
        { stateId: "3", instruction: "Emotionally open and self-aware" },
        { stateId: "-1", instruction: "Be rude" },
      ]);
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

    describe("customFields useInDefaultPrompt toggle (issue #108)", () => {
      const baseResponse = {
        id: "sim-1",
        title: "T",
        description: "D",
        status: "DRAFT",
        isGlobal: false,
        isPublic: false,
        coverImageUrl: "https://example.com/img.jpg",
        createdBy: "u1",
        lastModified: "2024-01-01T00:00:00Z",
        triggerWarnings: [],
        difficultyLevel: "easy",
      } as const;

      it("should map useInDefaultPrompt: true when API field has useInDefaultPrompt: true", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: {
            customFields: [{ name: "Field A", value: "val", useInDefaultPrompt: true }],
          },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields?.[0].useInDefaultPrompt).toBe(true);
      });

      it("should map useInDefaultPrompt: false when API field has useInDefaultPrompt: false", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: {
            customFields: [{ name: "Field B", value: "hello", useInDefaultPrompt: false }],
          },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields?.[0].useInDefaultPrompt).toBe(false);
      });

      it("should default useInDefaultPrompt to true when API field does not include it (backward compat)", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: {
            customFields: [{ name: "Legacy Field", value: "legacy value" }],
          },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields?.[0].useInDefaultPrompt).toBe(true);
      });

      it("should handle mixed fields — some with useInDefaultPrompt, some without", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: {
            customFields: [
              { name: "Field 1", value: "v1", useInDefaultPrompt: false },
              { name: "Field 2", value: "v2" }, // no useInDefaultPrompt
              { name: "Field 3", value: "v3", useInDefaultPrompt: true },
            ],
          },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields?.[0].useInDefaultPrompt).toBe(false);
        expect(result.customFields?.[1].useInDefaultPrompt).toBe(true); // defaulted
        expect(result.customFields?.[2].useInDefaultPrompt).toBe(true);
      });

      it("should return empty array when customFields is empty", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: { customFields: [] },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields).toEqual([]);
      });

      it("should assign sequential id to each mapped custom field", () => {
        const mockResponse = {
          ...baseResponse,
          metadata: {
            customFields: [
              { name: "A", value: "1" },
              { name: "B", value: "2" },
            ],
          },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.customFields?.[0].id).toContain("customFields");
        expect(result.customFields?.[1].id).toContain("customFields");
        expect(result.customFields?.[0].id).not.toBe(result.customFields?.[1].id);
      });
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
        difficultyLevel: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.difficultyLevel).toBeNull();
    });

    it("should keep non-empty select field as is", () => {
      const formData = {
        difficultyLevel: "MEDIUM",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.difficultyLevel).toBe("MEDIUM");
    });

    it("should keep slider value as a float (not truncate to int)", () => {
      const formData = {
        temperature: 0.7,
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.temperature).toBe(0.7);
    });

    it("should parse a stringified slider value to a float", () => {
      const formData = {
        temperature: "1.3",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.temperature).toBe(1.3);
    });

    it("should convert empty slider value to null", () => {
      const formData = {
        temperature: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);
      expect(result.temperature).toBeNull();
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
        title: "  Test Title  ",
        difficultyLevel: "",
        coverImageUrl: "",
      };

      const result = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, formData);

      expect(result).toEqual({
        title: "Test Title", // trimmed
        difficultyLevel: null, // empty select
        coverImageUrl: null, // empty string returns null
      });
    });
  });
});
