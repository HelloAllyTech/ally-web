import { describe, it, expect } from "vitest";

import { SIMULATION_CREATOR_FIELD_GROUPS } from "@constants";
import { GetSimulationByIdResponse } from "@types";

import {
  getCreateSimulationSubSectionById,
  formatSimulationResponseData,
  extractValidData,
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

      // Check all fields are present (title, description, coverImageUrl + 18 metadata fields = 21 total)
      expect(Object.keys(result)).toHaveLength(21);
      expect(result.title).toBe("Test");
      expect(result.description).toBe("Test");
      expect(result.coverImageUrl).toBe("url");
      expect(result.age).toBe("30");
      expect(result.name).toBe("Jane");
      expect(result.voiceId).toBe("voice");
    });
  });

  describe("extractValidData", () => {
    it("should extract only valid data (non-empty and non-undefined)", () => {
      const formData = {
        name: "John",
        age: "25",
        email: "",
        phone: undefined,
        address: "123 Main St",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        name: "John",
        age: "25",
        address: "123 Main St",
      });
    });

    it("should keep zero values", () => {
      const formData = {
        count: 0,
        score: 0,
        name: "Test",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        count: 0,
        score: 0,
        name: "Test",
      });
    });

    it("should keep false boolean values", () => {
      const formData = {
        isActive: false,
        isEnabled: true,
        name: "Test",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        isActive: false,
        isEnabled: true,
        name: "Test",
      });
    });

    it("should keep null values", () => {
      const formData = {
        name: "Test",
        value: null,
        description: "Description",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        name: "Test",
        value: null,
        description: "Description",
      });
    });

    it("should handle empty object", () => {
      const result = extractValidData({});

      expect(result).toEqual({});
    });

    it("should handle object with all empty values", () => {
      const formData = {
        field1: "",
        field2: undefined,
        field3: "",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({});
    });

    it("should handle object with nested objects", () => {
      const formData = {
        name: "Test",
        nested: { key: "value" },
        empty: "",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        name: "Test",
        nested: { key: "value" },
      });
    });

    it("should handle object with arrays", () => {
      const formData = {
        name: "Test",
        items: ["item1", "item2"],
        emptyItems: [],
        description: "",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        name: "Test",
        items: ["item1", "item2"],
        emptyItems: [],
      });
    });

    it("should remove only undefined and empty string values", () => {
      const formData = {
        a: "value",
        b: 0,
        c: false,
        d: null,
        e: "",
        f: undefined,
        g: "another value",
      };

      const result = extractValidData(formData);

      expect(result).toEqual({
        a: "value",
        b: 0,
        c: false,
        d: null,
        g: "another value",
      });
    });
  });
});
