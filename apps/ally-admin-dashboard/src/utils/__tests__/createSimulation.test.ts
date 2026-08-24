import { describe, it, expect, vi } from "vitest";

import { FORM_FIELD_TYPES, SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import { extractValidData } from "../common";
import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
  buildFeedbackTabsPayload,
  buildToggleDefaultValues,
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

      it("should keep enableFeedback's field id stable while its label describes the whole post-session experience", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const field = section?.fields.find(f => f.id === "enableFeedback");
        expect(field).toBeDefined();
        expect(field?.label).toBe("Post-Session Feedback");
      });

      it("should nest the three feedback-tab toggles under enableFeedback, hidden until it's on", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const tabFieldIds = ["feedbackTabDebrief", "feedbackTabSkills", "feedbackTabTranscript"];

        tabFieldIds.forEach(id => {
          const field = section?.fields.find(f => f.id === id);
          expect(field).toBeDefined();
          expect(field?.dependsOn).toBe("enableFeedback");
          expect(field?.visibleWhen?.({ enableFeedback: true })).toBe(true);
          expect(field?.visibleWhen?.({ enableFeedback: false })).toBe(false);
          expect(field?.visibleWhen?.({})).toBe(false);
        });
      });

      it("should give each feedback-tab toggle its own tooltip location, not a reused one", () => {
        const section = getCreateSimulationSubSectionById("basic-settings");
        const locations = ["feedbackTabDebrief", "feedbackTabSkills", "feedbackTabTranscript"].map(
          id => section?.fields.find(f => f.id === id)?.tooltipLocation,
        );

        expect(locations).toEqual(["feedback_tab_debrief", "feedback_tab_skills", "feedback_tab_transcript"]);
        expect(new Set(locations).size).toBe(3);
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
        // Response's metadata has no feedbackTabs at all — absent reads as
        // all three ON, mirroring the backend resolver.
        feedbackTabDebrief: true,
        feedbackTabSkills: true,
        feedbackTabTranscript: true,
        pauseEnabled: false,
        // Opt-in: a roleplay saved before live supervisor notes existed
        // hydrates as off, which is also the default for new ones.
        supervisorNotesEnabled: false,
        // Opt-out, unlike supervisorNotesEnabled above: absent in metadata
        // hydrates as ON (only an explicit false turns it off).
        liveTabEnabled: true,
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
        // Absent in metadata hydrates as ON: thinking filler is on by
        // default across every scenario.
        fillerEnabled: true,
        // Absent in metadata hydrates as ON, mirroring the backend's
        // default-ON glossary read (`!== false`).
        languageGlossaryEnabled: true,
        comfortAudioEnabled: false,
        comfortAudioUrl: "",
        comfortAudioVolume: 0.3,
        historyTrimEnabled: true,
        continuousBackchanneling: false,
        currentState: false,
        checklistType: "GUIDED",
        experienceMode: "CHECKLIST",
        summaryChecklistEnabled: false,
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

  describe("buildFeedbackTabsPayload (write side)", () => {
    // The bug this locks in: on a brand-new simulation the form's
    // TOGGLE_BUTTON defaultValue never reaches the controller, so all three
    // arrive undefined. Coerced with Boolean() that saved as all-false and the
    // learner finished a session to a blank post-session screen.
    it("should treat an untouched (undefined) toggle as ON", () => {
      expect(buildFeedbackTabsPayload({})).toEqual({
        debrief: true,
        skills: true,
        transcript: true,
      });
    });

    it("should honor an explicit false while untouched siblings stay ON", () => {
      expect(buildFeedbackTabsPayload({ feedbackTabSkills: false })).toEqual({
        debrief: true,
        skills: false,
        transcript: true,
      });
    });

    it("should send all three off when the author turned every tab off", () => {
      expect(
        buildFeedbackTabsPayload({
          feedbackTabDebrief: false,
          feedbackTabSkills: false,
          feedbackTabTranscript: false,
        }),
      ).toEqual({ debrief: false, skills: false, transcript: false });
    });

    it("should round-trip with formatSimulationResponseData", () => {
      const written = buildFeedbackTabsPayload({ feedbackTabTranscript: false });
      const rehydrated = formatSimulationResponseData({
        id: "sim-1",
        title: "T",
        description: "D",
        status: "DRAFT",
        metadata: { feedbackTabs: written },
      } as any);

      expect(rehydrated.feedbackTabDebrief).toBe(true);
      expect(rehydrated.feedbackTabSkills).toBe(true);
      expect(rehydrated.feedbackTabTranscript).toBe(false);
    });
  });

    describe("feedbackTabs (post-session tab visibility)", () => {
      it("should hydrate all three tabs as ON when metadata has no feedbackTabs at all", () => {
        const mockResponse = {
          id: "sim-1",
          title: "T",
          description: "D",
          status: "DRAFT",
          metadata: {},
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.feedbackTabDebrief).toBe(true);
        expect(result.feedbackTabSkills).toBe(true);
        expect(result.feedbackTabTranscript).toBe(true);
      });

      it("should hydrate all three tabs as ON when metadata itself is absent", () => {
        const mockResponse = {
          id: "sim-1",
          title: "T",
          description: "D",
          status: "DRAFT",
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.feedbackTabDebrief).toBe(true);
        expect(result.feedbackTabSkills).toBe(true);
        expect(result.feedbackTabTranscript).toBe(true);
      });

      it("should honor an explicit false on a single tab while the others default ON", () => {
        const mockResponse = {
          id: "sim-1",
          title: "T",
          description: "D",
          status: "DRAFT",
          metadata: { feedbackTabs: { skills: false } },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.feedbackTabDebrief).toBe(true);
        expect(result.feedbackTabSkills).toBe(false);
        expect(result.feedbackTabTranscript).toBe(true);
      });

      it("should read all three as OFF when every key is explicitly false", () => {
        const mockResponse = {
          id: "sim-1",
          title: "T",
          description: "D",
          status: "DRAFT",
          metadata: { feedbackTabs: { debrief: false, skills: false, transcript: false } },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.feedbackTabDebrief).toBe(false);
        expect(result.feedbackTabSkills).toBe(false);
        expect(result.feedbackTabTranscript).toBe(false);
      });

      it("should read all three as ON when every key is explicitly true", () => {
        const mockResponse = {
          id: "sim-1",
          title: "T",
          description: "D",
          status: "DRAFT",
          metadata: { feedbackTabs: { debrief: true, skills: true, transcript: true } },
        } as any;

        const result = formatSimulationResponseData(mockResponse);

        expect(result.feedbackTabDebrief).toBe(true);
        expect(result.feedbackTabSkills).toBe(true);
        expect(result.feedbackTabTranscript).toBe(true);
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

  describe("buildToggleDefaultValues (create path — no simulationId)", () => {
    const defaults = buildToggleDefaultValues(SIMULATION_CREATOR_FIELD_GROUPS);
    const toggleIds = SIMULATION_CREATOR_FIELD_GROUPS.flatMap(group => group.fields)
      .filter(field => field.type === FORM_FIELD_TYPES.TOGGLE_BUTTON)
      .map(field => field.id);

    it("should cover every TOGGLE_BUTTON field and nothing else", () => {
      expect(toggleIds.length).toBeGreaterThan(0);
      expect(Object.keys(defaults).sort()).toEqual([...toggleIds].sort());
    });

    it("should give every toggle an explicit boolean — never undefined", () => {
      // This is the whole point: `extractValidData` coerces with
      // `Boolean(value)`, so any toggle missing from form state on a
      // brand-new roleplay saves as `false` no matter what its config says.
      Object.entries(defaults).forEach(([id, value]) => {
        expect(typeof value, `${id} should default to a boolean`).toBe("boolean");
      });
    });

    it("should turn the ON-by-default toggles on", () => {
      // Every toggle whose config declares `defaultValue: true`. Listed
      // explicitly rather than derived from the same config the function
      // reads, so a default silently flipped in SimulationCreator.ts fails
      // here instead of quietly agreeing with itself.
      expect(defaults.enableFeedback).toBe(true);
      expect(defaults.feedbackTabDebrief).toBe(true);
      expect(defaults.feedbackTabSkills).toBe(true);
      expect(defaults.feedbackTabTranscript).toBe(true);
      expect(defaults.optGuardrails).toBe(true);
      expect(defaults.languageGlossaryEnabled).toBe(true);
      expect(defaults.historyTrimEnabled).toBe(true);
      expect(defaults.interimReplyEnabled).toBe(true);
      expect(defaults.fillerEnabled).toBe(true);
    });

    it("should leave the OFF-by-default and undeclared toggles off", () => {
      expect(defaults.summaryChecklistEnabled).toBe(false);
      expect(defaults.pauseEnabled).toBe(false);
      expect(defaults.comfortAudioEnabled).toBe(false);
      expect(defaults.continuousBackchanneling).toBe(false);
      // No `defaultValue` in the config at all — absent reads as OFF.
      expect(defaults.isGlobal).toBe(false);
      expect(defaults.isPublic).toBe(false);
      expect(defaults.timerMode).toBe(false);
      expect(defaults.showScoreMeter).toBe(false);
      expect(defaults.currentState).toBe(false);
    });

    it("should survive extractValidData with the declared defaults intact", () => {
      // The create-path payload is `extractValidData(groups, getValues())`.
      // Feeding it the seeded baseline is the closest unit-level stand-in for
      // "author opens the creator, types a title, saves" — before the fix the
      // ON-by-default toggles reached this point as `undefined` and came out
      // `false`.
      const saved = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, {
        title: "First Save",
        ...defaults,
      });

      expect(saved.enableFeedback).toBe(true);
      expect(saved.historyTrimEnabled).toBe(true);
      expect(saved.interimReplyEnabled).toBe(true);
      expect(saved.languageGlossaryEnabled).toBe(true);
      expect(saved.optGuardrails).toBe(true);
      expect(saved.pauseEnabled).toBe(false);
      expect(saved.isGlobal).toBe(false);
    });

    it("should round-trip: a first save then reloaded keeps the same toggle states", () => {
      const saved = extractValidData(SIMULATION_CREATOR_FIELD_GROUPS, {
        title: "First Save",
        ...defaults,
      });

      const reloaded = formatSimulationResponseData({
        id: "sim-1",
        title: "First Save",
        description: "D",
        status: "DRAFT",
        metadata: saved,
      } as any);

      expect(reloaded.enableFeedback).toBe(true);
      expect(reloaded.historyTrimEnabled).toBe(true);
      expect(reloaded.interimReplyEnabled).toBe(true);
      expect(reloaded.languageGlossaryEnabled).toBe(true);
      expect(reloaded.pauseEnabled).toBe(false);
    });

    it("should ignore groups with no toggles at all", () => {
      expect(
        buildToggleDefaultValues([
          { id: "g", label: "G", fields: [{ id: "title", label: "T", type: "text" } as any] },
        ]),
      ).toEqual({});
      expect(buildToggleDefaultValues([])).toEqual({});
    });
  });

  describe("Conversational Guardrails toggle config", () => {
    const guardrailsField = SIMULATION_CREATOR_FIELD_GROUPS.flatMap(group => group.fields).find(
      field => field.id === "optGuardrails",
    );

    it("should be a toggle that is ON by default", () => {
      expect(guardrailsField).toBeDefined();
      expect(guardrailsField?.type).toBe(FORM_FIELD_TYPES.TOGGLE_BUTTON);
      expect(guardrailsField?.defaultValue).toBe(true);
    });

    it("should carry no read-only marker — the toggle is author-editable", () => {
      // This field used to declare `disabled: true`, left over from when
      // `optGuardrails` was decorative (ally-be read it nowhere). The flag was
      // dead in three places at once — absent from FormFieldConfig, never
      // forwarded by FormField's TOGGLE_BUTTON case, never accepted by
      // ToggleSection — so the switch was always clickable and the config was
      // simply lying.
      //
      // ally-be now honours the value: `false` skips USER guardrail sampling
      // for the session, and the creator is the only surface that sets it.
      // Re-adding a read-only marker here would make that gate unreachable;
      // the non-disableable part (the mandatory SYSTEM guardrail) is enforced
      // in the backend regardless of this toggle.
      expect(guardrailsField).not.toHaveProperty("disabled");
      expect(guardrailsField).not.toHaveProperty("readOnly");
    });
  });
});
