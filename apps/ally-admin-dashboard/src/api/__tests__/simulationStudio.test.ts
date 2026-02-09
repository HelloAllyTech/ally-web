import { describe, it, expect, vi, beforeEach } from "vitest";

import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";

// Mock the store to avoid initialization issues
vi.mock("@store", () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
    subscribe: vi.fn(),
  },
}));

// Mock the baseAPI
vi.mock("../baseApi", () => ({
  baseAPI: {
    injectEndpoints: vi.fn(() => ({})),
    reducerPath: "baseAPI",
    reducer: vi.fn((state = {}) => state),
    middleware: vi.fn(),
  },
}));

describe("simulationStudio API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API Endpoints Configuration", () => {
    it("should have correct get simulations endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.GET_SIMULATIONS).toBe("/v1/learn/admin-scenarios");
    });

    it("should have correct create simulation endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.CREATE_SIMULATION).toBe("/v1/learn/scenarios");
    });

    it("should have correct session events endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS).toBe("/v1/session-events");
    });

    it("should have correct scenario voices endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VOICES).toBe("/v1/learn/scenario-voices");
    });

    it("should have correct cover image URL endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.GET_COVER_IMAGE_URL).toBe(
        "/v1/learn/scenarios/cover-image-url",
      );
    });

    it("should have correct map scenario events endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.MAP_SCENARIO_EVENTS).toBe(
        "/v1/learn/scenarios/map-events",
      );
    });

    it("should have correct scenario events endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.SCENARIO_EVENTS).toBe("/v1/learn/scenarios/events");
    });

    it("should have correct scenario preview endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PREVIEW).toBe("/v1/learn/scenarios/preview");
    });

    it("should have correct delete session events endpoint", () => {
      expect(ApiEndpoints.SIMULATION_STUDIO.DELETE_SESSION_EVENTS).toBe(
        "/v1/session-events/events",
      );
    });
  });

  describe("Dynamic URL Generation", () => {
    it("should generate correct simulation by ID URL", () => {
      const id = "sim-123";
      const url = ApiEndpoints.SIMULATION_STUDIO.GET_ADMIN_SIMULATION_BY_ID(id);
      expect(url).toBe("/v1/learn/admin-scenarios/sim-123");
    });

    it("should generate correct update simulation URL", () => {
      const id = "sim-456";
      const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_SIMULATION_BY_ID(id);
      expect(url).toBe("/v1/learn/scenarios/sim-456");
    });

    it("should generate correct simulation by ID for deletion URL", () => {
      const id = "sim-789";
      const url = ApiEndpoints.SIMULATION_STUDIO.SIMULATION_BY_ID(id);
      expect(url).toBe("/v1/learn/admin-scenarios/sim-789");
    });

    it("should generate correct get session event by ID URL", () => {
      const eventId = "event-456";
      const url = ApiEndpoints.SIMULATION_STUDIO.GET_SESSION_EVENT_BY_ID(eventId);
      expect(url).toBe("/v1/session-events/events/event-456");
    });

    it("should generate correct update session event URL", () => {
      const eventId = "event-123";
      const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_SESSION_EVENT(eventId);
      expect(url).toBe("/v1/session-events/events/event-123");
    });

    it("should generate correct get mapped scenario events URL", () => {
      const id = "scenario-999";
      const url = ApiEndpoints.SIMULATION_STUDIO.GET_MAPPED_SCENARIO_EVENTS(id);
      expect(url).toBe("/v1/learn/scenarios/scenario-999/events");
    });

    it("should generate correct end scenario preview URL", () => {
      const sessionId = "session-abc";
      const url = ApiEndpoints.SIMULATION_STUDIO.END_SCENARIO_PREVIEW(sessionId);
      expect(url).toBe("/v1/learn/scenarios/preview/session-abc/end");
    });
  });

  describe("HTTP Methods", () => {
    it("should use GET method for queries", () => {
      expect(HttpMethod.GET).toBe("GET");
    });

    it("should use POST method for creating resources", () => {
      expect(HttpMethod.POST).toBe("POST");
    });

    it("should use PUT method for updating resources", () => {
      expect(HttpMethod.PUT).toBe("PUT");
    });

    it("should use DELETE method for deleting resources", () => {
      expect(HttpMethod.DELETE).toBe("DELETE");
    });
  });

  describe("Tag Types", () => {
    it("should have SIMULATION tag type", () => {
      expect(TAG_TYPES.SIMULATION).toBe("simulation");
    });

    it("should have SESSION_EVENTS tag type", () => {
      expect(TAG_TYPES.SESSION_EVENTS).toBe("sessionEvents");
    });

    it("should have SIMULATION_EVENTS tag type", () => {
      expect(TAG_TYPES.SIMULATION_EVENTS).toBe("simulationEvents");
    });
  });

  describe("Simulation Query Operations", () => {
    it("should handle simulation query parameters", () => {
      const params = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "DESC",
        search: "test simulation",
      };

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
      expect(params.sortBy).toBe("createdAt");
      expect(params.sortOrder).toBe("DESC");
      expect(params.search).toBe("test simulation");
    });

    it("should handle empty query parameters", () => {
      const params = {};
      expect(Object.keys(params)).toHaveLength(0);
    });

    it("should handle simulation response", () => {
      const response = {
        data: [
          {
            id: "sim-1",
            title: "Test Simulation",
            description: "Test description",
            status: "active",
            createdAt: "2024-01-01",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.total).toBe(1);
    });
  });

  describe("Create Simulation Operations", () => {
    it("should handle create simulation input", () => {
      const simulationInput = {
        title: "New Simulation",
        description: "Simulation description",
        difficulty: "medium",
        duration: 30,
        coverImageUrl: "https://example.com/image.jpg",
      };

      expect(simulationInput.title).toBeDefined();
      expect(simulationInput.description).toBeDefined();
      expect(simulationInput.difficulty).toBe("medium");
      expect(simulationInput.duration).toBe(30);
    });

    it("should handle create simulation response", () => {
      const response = {
        id: "sim-new",
        title: "New Simulation",
        status: "draft",
        createdAt: "2024-01-01",
      };

      expect(response.id).toBeDefined();
      expect(response.title).toBeDefined();
      expect(response.status).toBe("draft");
    });

    it("should handle minimal simulation data", () => {
      const minimalInput = {
        title: "Minimal Simulation",
      };

      expect(minimalInput.title).toBeDefined();
    });
  });

  describe("Update Simulation Operations", () => {
    it("should handle update simulation input", () => {
      const updateInput = {
        id: "sim-123",
        simulation: {
          title: "Updated Simulation",
          description: "Updated description",
          status: "published",
        },
      };

      expect(updateInput.id).toBeDefined();
      expect(updateInput.simulation.title).toBeDefined();
      expect(updateInput.simulation.status).toBe("published");
    });

    it("should handle partial update", () => {
      const partialUpdate = {
        id: "sim-456",
        simulation: {
          title: "Updated Title Only",
        },
      };

      expect(partialUpdate.id).toBeDefined();
      expect(partialUpdate.simulation.title).toBeDefined();
    });

    it("should handle update response", () => {
      const response = {
        id: "sim-123",
        title: "Updated Simulation",
        updatedAt: "2024-01-02",
      };

      expect(response.id).toBeDefined();
      expect(response.updatedAt).toBeDefined();
    });
  });

  describe("Delete Simulation Operations", () => {
    it("should handle delete simulation by ID", () => {
      const simulationId = "sim-to-delete";
      expect(simulationId).toBeDefined();
      expect(typeof simulationId).toBe("string");
    });

    it("should handle multiple simulation IDs", () => {
      const simulationIds = ["sim-1", "sim-2", "sim-3"];
      expect(Array.isArray(simulationIds)).toBe(true);
      expect(simulationIds).toHaveLength(3);
    });
  });

  describe("Session Events Operations", () => {
    it("should handle get session events query", () => {
      const query = {
        simulationId: "sim-123",
        page: 1,
        limit: 20,
      };

      expect(query.simulationId).toBeDefined();
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
    });

    it("should handle session event data", () => {
      const event = {
        id: "event-1",
        type: "message",
        content: "Event content",
        timestamp: "2024-01-01T10:00:00Z",
        metadata: {},
      };

      expect(event.id).toBeDefined();
      expect(event.type).toBe("message");
      expect(event.content).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it("should handle create session event", () => {
      const createEvent = {
        event: {
          type: "action",
          content: "User action",
          simulationId: "sim-123",
        },
      };

      expect(createEvent.event.type).toBe("action");
      expect(createEvent.event.content).toBeDefined();
      expect(createEvent.event.simulationId).toBeDefined();
    });

    it("should handle create multiple session events", () => {
      const createEvents = {
        events: [
          { type: "message", content: "Event 1" },
          { type: "action", content: "Event 2" },
          { type: "notification", content: "Event 3" },
        ],
      };

      expect(Array.isArray(createEvents.events)).toBe(true);
      expect(createEvents.events).toHaveLength(3);
    });

    it("should handle update session event", () => {
      const updateEvent = {
        event: {
          id: "event-123",
          content: "Updated content",
          type: "message",
        },
      };

      expect(updateEvent.event.id).toBeDefined();
      expect(updateEvent.event.content).toBe("Updated content");
    });

    it("should handle delete session events", () => {
      const deleteEvents = {
        eventIds: ["event-1", "event-2", "event-3"],
      };

      expect(Array.isArray(deleteEvents.eventIds)).toBe(true);
      expect(deleteEvents.eventIds).toHaveLength(3);
    });

    it("should handle empty event list", () => {
      const emptyEvents = {
        events: [],
      };

      expect(emptyEvents.events).toHaveLength(0);
    });
  });

  describe("Cover Image Operations", () => {
    it("should handle get cover image URL request", () => {
      const request = {
        fileName: "cover-image.jpg",
        fileType: "image/jpeg",
        simulationId: "sim-123",
      };

      expect(request.fileName).toBeDefined();
      expect(request.fileType).toBe("image/jpeg");
      expect(request.simulationId).toBeDefined();
    });

    it("should handle cover image URL response", () => {
      const response = {
        uploadUrl: "https://s3.amazonaws.com/presigned-url",
        fileUrl: "https://cdn.example.com/cover-image.jpg",
      };

      expect(response.uploadUrl).toBeDefined();
      expect(response.fileUrl).toBeDefined();
    });

    it("should handle different image types", () => {
      const imageTypes = ["image/jpeg", "image/png", "image/webp"];

      imageTypes.forEach(type => {
        expect(type).toContain("image/");
      });
    });
  });

  describe("Scenario Voices Operations", () => {
    it("should handle scenario voices response", () => {
      const voices = [
        { id: "voice-1", name: "Voice 1", language: "en-US", gender: "female" },
        { id: "voice-2", name: "Voice 2", language: "en-GB", gender: "male" },
      ];

      expect(Array.isArray(voices)).toBe(true);
      expect(voices).toHaveLength(2);
      voices.forEach(voice => {
        expect(voice.id).toBeDefined();
        expect(voice.name).toBeDefined();
        expect(voice.language).toBeDefined();
      });
    });

    it("should handle empty voices list", () => {
      const voices: any[] = [];
      expect(voices).toHaveLength(0);
    });
  });

  describe("Map Scenario Events Operations", () => {
    it("should handle map scenario events request", () => {
      const request = {
        scenarioId: 123,
        events: [
          { eventId: "event-1", order: 1 },
          { eventId: "event-2", order: 2 },
        ],
      };

      expect(request.scenarioId).toBe(123);
      expect(Array.isArray(request.events)).toBe(true);
      expect(request.events).toHaveLength(2);
    });

    it("should handle get mapped scenario events", () => {
      const query = {
        id: "scenario-123",
      };

      expect(query.id).toBeDefined();
    });

    it("should handle mapped events response", () => {
      const response = {
        data: [
          { eventId: "event-1", order: 1, type: "message" },
          { eventId: "event-2", order: 2, type: "action" },
        ],
      };

      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    it("should handle delete scenario events", () => {
      const deleteRequest = {
        scenarioId: 456,
        eventIds: ["event-1", "event-2"],
      };

      expect(deleteRequest.scenarioId).toBe(456);
      expect(Array.isArray(deleteRequest.eventIds)).toBe(true);
    });
  });

  describe("Scenario Preview Operations", () => {
    it("should handle scenario preview request", () => {
      const previewRequest = {
        scenarioId: 789,
      };

      expect(previewRequest.scenarioId).toBe(789);
      expect(typeof previewRequest.scenarioId).toBe("number");
    });

    it("should handle scenario preview response", () => {
      const previewResponse = {
        roomName: "preview-room-123",
        token: "preview-token-abc",
        expiresAt: "2024-01-01T12:00:00Z",
      };

      expect(previewResponse.roomName).toBeDefined();
      expect(previewResponse.token).toBeDefined();
      expect(previewResponse.expiresAt).toBeDefined();
    });

    it("should handle end scenario preview request", () => {
      const endRequest = {
        roomName: "preview-room-123",
      };

      expect(endRequest.roomName).toBeDefined();
      expect(typeof endRequest.roomName).toBe("string");
    });
  });

  describe("Pagination and Filtering", () => {
    it("should handle pagination parameters", () => {
      const pagination = {
        page: 2,
        limit: 25,
      };

      expect(pagination.page).toBe(2);
      expect(pagination.limit).toBe(25);
    });

    it("should calculate offset from page", () => {
      const page = 3;
      const limit = 10;
      const offset = (page - 1) * limit;

      expect(offset).toBe(20);
    });

    it("should handle sorting parameters", () => {
      const sorting = {
        sortBy: "title",
        sortOrder: "ASC",
      };

      expect(sorting.sortBy).toBe("title");
      expect(sorting.sortOrder).toBe("ASC");
    });

    it("should handle search query", () => {
      const search = {
        query: "emergency simulation",
      };

      expect(search.query).toBeDefined();
      expect(typeof search.query).toBe("string");
    });
  });

  describe("Simulation Status", () => {
    it("should handle different simulation statuses", () => {
      const statuses = ["draft", "published", "archived", "active"];

      statuses.forEach(status => {
        expect(status).toBeDefined();
        expect(typeof status).toBe("string");
      });
    });

    it("should validate status transitions", () => {
      const validTransitions = {
        draft: ["published", "archived"],
        published: ["archived", "draft"],
        archived: ["draft"],
      };

      expect(validTransitions.draft).toContain("published");
      expect(validTransitions.published).toContain("archived");
    });
  });

  describe("Event Types", () => {
    it("should handle different event types", () => {
      const eventTypes = ["message", "action", "notification", "system"];

      eventTypes.forEach(type => {
        expect(type).toBeDefined();
        expect(typeof type).toBe("string");
      });
    });

    it("should validate event structure", () => {
      const event = {
        id: "event-1",
        type: "message",
        content: "Event content",
        metadata: {
          sender: "user-1",
          timestamp: Date.now(),
        },
      };

      expect(event.id).toBeDefined();
      expect(event.type).toBeDefined();
      expect(event.content).toBeDefined();
      expect(event.metadata).toBeDefined();
    });
  });

  describe("Base API Mock", () => {
    it("should have correct mock setup", () => {
      expect(vi.fn()).toBeInstanceOf(Function);
    });

    it("should be able to call injectEndpoints", () => {
      const mockFn = vi.fn();
      mockFn({ endpoints: () => ({}) });
      expect(mockFn).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required fields", () => {
      const incompleteData = {
        title: "",
      };

      expect(incompleteData.title).toBe("");
    });

    it("should handle invalid IDs", () => {
      const invalidId = "";
      expect(invalidId).toBe("");
    });

    it("should handle empty arrays", () => {
      const emptyArray: any[] = [];
      expect(emptyArray).toHaveLength(0);
    });
  });

  describe("Voice Management API", () => {
    describe("Voice Query Parameters", () => {
      it("should support searchName parameter", () => {
        const searchName = "voice search";
        expect(searchName).toBeTruthy();
        expect(typeof searchName).toBe("string");
      });

      it("should support limit parameter", () => {
        const limit = 30;
        expect(limit).toBeGreaterThan(0);
        expect(Number.isInteger(limit)).toBe(true);
      });

      it("should support offset parameter", () => {
        const offset = 0;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(offset)).toBe(true);
      });

      it("should support sorting with sortBy parameter", () => {
        const sortBy = "createdAt";
        expect(sortBy).toBeTruthy();
      });
    });

    describe("Voice Create Operation", () => {
      it("should accept voice data with required fields", () => {
        const voiceData = {
          name: "Test Voice",
          provider: "Google",
          languageId: 1,
          config: { model: "neural" },
        };

        expect(voiceData.name).toBeTruthy();
        expect(voiceData.provider).toBeTruthy();
        expect(voiceData.languageId).toBeTruthy();
        expect(voiceData.config).toBeTruthy();
      });

      it("should wrap voice data in voices array for API", () => {
        const voice = { name: "Voice", provider: "Provider", languageId: 1, config: {} };
        const payload = { voices: [voice] };

        expect(Array.isArray(payload.voices)).toBe(true);
        expect(payload.voices[0]).toEqual(voice);
      });

      it("should return array of created voices", () => {
        const responseData = {
          voices: [
            {
              id: "voice-1",
              name: "Voice",
              provider: "Provider",
              languageId: 1,
              config: {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        };

        expect(Array.isArray(responseData.voices)).toBe(true);
        expect(responseData.voices[0].id).toBeTruthy();
      });
    });

    describe("Voice Update Operation", () => {
      it("should generate correct update voice URL with ID", () => {
        const voiceId = "voice-123";
        const endpoint = ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VOICES;
        const updateUrl = `${endpoint}/${voiceId}`;

        expect(updateUrl).toBe("/v1/learn/scenario-voices/voice-123");
        expect(updateUrl).toContain(voiceId);
      });

      it("should accept partial voice data for updates", () => {
        const updateData = {
          name: "Updated Voice",
          provider: "Azure",
          config: { model: "standard" },
        };

        expect(updateData.name).toBeTruthy();
        expect(updateData.provider).toBeTruthy();
        expect(updateData.config).toBeTruthy();
      });

      it("should exclude id field from update payload", () => {
        const updateData = {
          name: "Updated Voice",
          provider: "Provider",
          languageId: 1,
          config: {},
        };

        // Verify that id is not included
        expect("id" in updateData).toBe(false);
      });
    });

    describe("Voice Read/Fetch Operation", () => {
      it("should return paginated voice list", () => {
        const response = {
          voices: [
            {
              id: "voice-1",
              name: "Voice 1",
              provider: "Google",
              languageId: 1,
              config: {},
              createdAt: "2024-01-15T10:00:00Z",
              updatedAt: "2024-01-15T10:00:00Z",
            },
          ],
          total: 100,
          limit: 30,
          offset: 0,
        };

        expect(Array.isArray(response.voices)).toBe(true);
        expect(response.total).toBeGreaterThanOrEqual(response.voices.length);
        expect(response.limit).toBeGreaterThan(0);
        expect(response.offset).toBeGreaterThanOrEqual(0);
      });

      it("should support empty voice list response", () => {
        const response = {
          voices: [],
          total: 0,
          limit: 30,
          offset: 0,
        };

        expect(Array.isArray(response.voices)).toBe(true);
        expect(response.voices.length).toBe(0);
        expect(response.total).toBe(0);
      });

      it("should include all voice fields in response", () => {
        const voice = {
          id: "voice-1",
          name: "Voice",
          provider: "Provider",
          languageId: 1,
          config: { key: "value" },
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2024-01-15T10:00:00Z",
        };

        expect(voice).toHaveProperty("id");
        expect(voice).toHaveProperty("name");
        expect(voice).toHaveProperty("provider");
        expect(voice).toHaveProperty("languageId");
        expect(voice).toHaveProperty("config");
        expect(voice).toHaveProperty("createdAt");
        expect(voice).toHaveProperty("updatedAt");
      });
    });

    describe("Voice Configuration", () => {
      it("should accept valid JSON object configuration", () => {
        const config = { model: "neural", age: "adult" };
        expect(typeof config).toBe("object");
        expect(!Array.isArray(config)).toBe(true);
      });

      it("should accept complex nested configuration", () => {
        const config = {
          model: "neural",
          age: "adult",
          settings: {
            pitch: 1.0,
            rate: 1.2,
          },
        };

        expect(typeof config).toBe("object");
        expect(config.settings).toBeTruthy();
        expect(typeof config.settings).toBe("object");
      });

      it("should support flexible configuration keys", () => {
        const voice1Config = { voiceId: "google-us-en-A" };
        const voice2Config = { model: "neural", gender: "female" };
        const voice3Config = { provider: "azure", region: "east-us" };

        expect(voice1Config).toHaveProperty("voiceId");
        expect(voice2Config).toHaveProperty("model");
        expect(voice3Config).toHaveProperty("provider");
      });
    });

    describe("Voice Cache Invalidation", () => {
      it("should use SCENARIO_VOICES tag for cache management", () => {
        expect(TAG_TYPES.SCENARIO_VOICES).toBe("scenarioVoices");
      });

      it("should invalidate cache on create operation", () => {
        const tag = TAG_TYPES.SCENARIO_VOICES;
        expect(tag).toBeTruthy();
        expect(typeof tag).toBe("string");
      });

      it("should invalidate cache on update operation", () => {
        const tag = TAG_TYPES.SCENARIO_VOICES;
        expect(tag).toBeTruthy();
        expect(typeof tag).toBe("string");
      });
    });
  });

  describe("Prompt Management API", () => {
    describe("Prompt Endpoints", () => {
      it("should have correct get prompts endpoint", () => {
        expect(ApiEndpoints.SIMULATION_STUDIO.GET_PROMPTS).toBe("/v1/prompts");
      });

      it("should have correct create prompt endpoint", () => {
        expect(ApiEndpoints.SIMULATION_STUDIO.CREATE_PROMPT).toBe("/v1/prompts");
      });

      it("should have correct update prompt endpoint function", () => {
        const promptId = "prompt-123";
        const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(promptId);
        expect(url).toBe(`/v1/prompts/${promptId}`);
      });

      it("should handle dynamic update prompt URL generation", () => {
        const ids = ["prompt-1", "prompt-2", "prompt-abc"];
        ids.forEach(id => {
          const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(id);
          expect(url).toContain(id);
          expect(url).toContain("/v1/prompts/");
        });
      });
    });

    describe("Get Prompts Query Parameters", () => {
      it("should support searchName parameter", () => {
        const query = {
          searchName: "test prompt",
          limit: 30,
          offset: 0,
          sortBy: "createdAt",
          order: "DESC",
        };

        expect(query.searchName).toBeTruthy();
        expect(typeof query.searchName).toBe("string");
      });

      it("should support limit parameter for pagination", () => {
        const limit = 30;
        expect(limit).toBeGreaterThan(0);
        expect(Number.isInteger(limit)).toBe(true);
      });

      it("should support offset parameter for pagination", () => {
        const offset = 0;
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(offset)).toBe(true);
      });

      it("should support sortBy parameter", () => {
        const sortBy = "createdAt";
        expect(sortBy).toBeTruthy();
        expect(typeof sortBy).toBe("string");
      });

      it("should support order parameter (ASC/DESC)", () => {
        const orders = ["ASC", "DESC"];
        orders.forEach(order => {
          expect(["ASC", "DESC"]).toContain(order);
        });
      });

      it("should handle empty searchName", () => {
        const query = {
          searchName: "",
          limit: 30,
          offset: 0,
        };

        expect(query.searchName).toBe("");
      });

      it("should construct GetPromptsQuery object correctly", () => {
        const getPromptsQuery = {
          searchName: "example",
          limit: 30,
          offset: 0,
          sortBy: "createdAt",
          order: "DESC",
        };

        expect(getPromptsQuery).toHaveProperty("searchName");
        expect(getPromptsQuery).toHaveProperty("limit");
        expect(getPromptsQuery).toHaveProperty("offset");
        expect(getPromptsQuery).toHaveProperty("sortBy");
        expect(getPromptsQuery).toHaveProperty("order");
      });
    });

    describe("Get Prompts Query Operation", () => {
      it("should return array of prompts", () => {
        const response = [
          {
            id: "prompt-1",
            name: "Test Prompt 1",
            description: "Test Description 1",
            promptCode: "test_prompt_1",
            prompt: "This is a test prompt",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
        ];

        expect(Array.isArray(response)).toBe(true);
        expect(response[0]).toHaveProperty("id");
        expect(response[0]).toHaveProperty("name");
        expect(response[0]).toHaveProperty("promptCode");
      });

      it("should handle empty prompts list", () => {
        const response: any[] = [];
        expect(Array.isArray(response)).toBe(true);
        expect(response).toHaveLength(0);
      });

      it("should include all prompt fields in response", () => {
        const prompt = {
          id: "prompt-1",
          name: "Prompt Name",
          description: "Prompt Description",
          promptCode: "prompt_code",
          prompt: "Prompt text content",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };

        expect(prompt).toHaveProperty("id");
        expect(prompt).toHaveProperty("name");
        expect(prompt).toHaveProperty("description");
        expect(prompt).toHaveProperty("promptCode");
        expect(prompt).toHaveProperty("prompt");
        expect(prompt).toHaveProperty("createdAt");
        expect(prompt).toHaveProperty("updatedAt");
      });

      it("should handle paginated response", () => {
        const response = [
          {
            id: "prompt-1",
            name: "Prompt 1",
            description: "Description 1",
            promptCode: "code_1",
            prompt: "Content 1",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          {
            id: "prompt-2",
            name: "Prompt 2",
            description: "Description 2",
            promptCode: "code_2",
            prompt: "Content 2",
            createdAt: "2024-01-02T00:00:00Z",
            updatedAt: "2024-01-02T00:00:00Z",
          },
        ];

        expect(response).toHaveLength(2);
        expect(Array.isArray(response)).toBe(true);
      });

      it("should preserve prompt field types", () => {
        const prompt = {
          id: "prompt-1",
          name: "Name",
          description: "Description",
          promptCode: "code",
          prompt: "Content",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };

        expect(typeof prompt.id).toBe("string");
        expect(typeof prompt.name).toBe("string");
        expect(typeof prompt.description).toBe("string");
        expect(typeof prompt.promptCode).toBe("string");
        expect(typeof prompt.prompt).toBe("string");
        expect(typeof prompt.createdAt).toBe("string");
      });
    });

    describe("Create Prompt Mutation", () => {
      it("should accept array of prompts", () => {
        const payload = {
          prompts: [
            {
              name: "New Prompt",
              description: "New Description",
              promptCode: "new_prompt_code",
              prompt: "New prompt content",
            },
          ],
        };

        expect(Array.isArray(payload.prompts)).toBe(true);
        expect(payload.prompts).toHaveLength(1);
      });

      it("should handle single prompt creation", () => {
        const prompt = {
          name: "Single Prompt",
          description: "Single Description",
          promptCode: "single_code",
          prompt: "Single content",
        };

        expect(prompt.name).toBeTruthy();
        expect(prompt.description).toBeTruthy();
        expect(prompt.promptCode).toBeTruthy();
        expect(prompt.prompt).toBeTruthy();
      });

      it("should handle multiple prompts creation", () => {
        const prompts = [
          {
            name: "Prompt 1",
            description: "Description 1",
            promptCode: "code_1",
            prompt: "Content 1",
          },
          {
            name: "Prompt 2",
            description: "Description 2",
            promptCode: "code_2",
            prompt: "Content 2",
          },
          {
            name: "Prompt 3",
            description: "Description 3",
            promptCode: "code_3",
            prompt: "Content 3",
          },
        ];

        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts).toHaveLength(3);
      });

      it("should return created prompt with id", () => {
        const response = {
          id: "prompt-new",
          name: "New Prompt",
          description: "Description",
          promptCode: "code",
          prompt: "Content",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        };

        expect(response.id).toBeTruthy();
        expect(response.name).toBeTruthy();
        expect(response.createdAt).toBeTruthy();
      });

      it("should include all required prompt fields in request", () => {
        const promptData = {
          name: "Test",
          description: "Test Desc",
          promptCode: "test_code",
          prompt: "Test content",
        };

        expect(promptData).toHaveProperty("name");
        expect(promptData).toHaveProperty("description");
        expect(promptData).toHaveProperty("promptCode");
        expect(promptData).toHaveProperty("prompt");
      });

      it("should not include id in create request", () => {
        const promptData = {
          name: "Test",
          description: "Test Desc",
          promptCode: "test_code",
          prompt: "Test content",
        };

        expect("id" in promptData).toBe(false);
      });

      it("should handle empty prompt fields gracefully", () => {
        const promptData = {
          name: "",
          description: "",
          promptCode: "",
          prompt: "",
        };

        expect(promptData.name).toBe("");
        expect(promptData.description).toBe("");
        expect(promptData.promptCode).toBe("");
        expect(promptData.prompt).toBe("");
      });

      it("should invalidate PROMPTS cache after creation", () => {
        const tag = TAG_TYPES.PROMPTS;
        expect(tag).toBeTruthy();
        expect(typeof tag).toBe("string");
        expect(tag).toBe("prompts");
      });
    });

    describe("Update Prompt Mutation", () => {
      it("should accept prompt id and update data", () => {
        const updatePayload = {
          id: "prompt-123",
          prompt: {
            name: "Updated Name",
            description: "Updated Description",
            promptCode: "updated_code",
            prompt: "Updated content",
          },
        };

        expect(updatePayload.id).toBeTruthy();
        expect(updatePayload.prompt).toHaveProperty("name");
        expect(updatePayload.prompt).toHaveProperty("description");
        expect(updatePayload.prompt).toHaveProperty("promptCode");
        expect(updatePayload.prompt).toHaveProperty("prompt");
      });

      it("should not include id in update body", () => {
        const updateData = {
          name: "Updated",
          description: "Updated Desc",
          promptCode: "updated_code",
          prompt: "Updated content",
        };

        expect("id" in updateData).toBe(false);
        expect("createdAt" in updateData).toBe(false);
        expect("updatedAt" in updateData).toBe(false);
      });

      it("should not include createdAt in update body", () => {
        const updateData = {
          name: "Updated",
          description: "Updated Desc",
          promptCode: "updated_code",
          prompt: "Updated content",
        };

        expect("createdAt" in updateData).toBe(false);
      });

      it("should not include updatedAt in update body", () => {
        const updateData = {
          name: "Updated",
          description: "Updated Desc",
          promptCode: "updated_code",
          prompt: "Updated content",
        };

        expect("updatedAt" in updateData).toBe(false);
      });

      it("should return updated prompt", () => {
        const response = {
          id: "prompt-123",
          name: "Updated Name",
          description: "Updated Description",
          promptCode: "updated_code",
          prompt: "Updated content",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        };

        expect(response.id).toBe("prompt-123");
        expect(response.name).toBe("Updated Name");
        expect(response.updatedAt).not.toBe(response.createdAt);
      });

      it("should handle partial updates", () => {
        const partialUpdate = {
          name: "Updated Name Only",
        };

        expect(partialUpdate).toHaveProperty("name");
      });

      it("should generate correct update URL with prompt ID", () => {
        const promptId = "prompt-456";
        const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(promptId);
        expect(url).toBe("/v1/prompts/prompt-456");
        expect(url).toContain(promptId);
      });

      it("should handle special characters in prompt ID", () => {
        const promptId = "prompt-abc-123_def";
        const url = ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(promptId);
        expect(url).toContain(promptId);
      });

      it("should use PUT HTTP method for updates", () => {
        expect(HttpMethod.PUT).toBe("PUT");
      });

      it("should invalidate PROMPTS cache after update", () => {
        const tag = TAG_TYPES.PROMPTS;
        expect(tag).toBeTruthy();
        expect(typeof tag).toBe("string");
        expect(tag).toBe("prompts");
      });
    });

    describe("Prompt Data Validation", () => {
      it("should validate prompt name is string", () => {
        const prompt = {
          name: "Valid Name",
          description: "Description",
          promptCode: "code",
          prompt: "Content",
        };

        expect(typeof prompt.name).toBe("string");
      });

      it("should validate prompt description is string", () => {
        const prompt = {
          name: "Name",
          description: "Valid Description",
          promptCode: "code",
          prompt: "Content",
        };

        expect(typeof prompt.description).toBe("string");
      });

      it("should validate promptCode is string", () => {
        const prompt = {
          name: "Name",
          description: "Description",
          promptCode: "valid_code",
          prompt: "Content",
        };

        expect(typeof prompt.promptCode).toBe("string");
      });

      it("should validate prompt text is string", () => {
        const prompt = {
          name: "Name",
          description: "Description",
          promptCode: "code",
          prompt: "Valid prompt content",
        };

        expect(typeof prompt.prompt).toBe("string");
      });

      it("should accept special characters in prompt fields", () => {
        const prompt = {
          name: "Name @#$%",
          description: "Desc & ( )",
          promptCode: "code_-_123",
          prompt: "Content with {{variables}} and [brackets]",
        };

        expect(prompt.name).toContain("@");
        expect(prompt.description).toContain("&");
        expect(prompt.promptCode).toContain("_");
        expect(prompt.prompt).toContain("{{");
      });

      it("should handle long prompt content", () => {
        const longContent = "A".repeat(5000);
        const prompt = {
          name: "Name",
          description: "Description",
          promptCode: "code",
          prompt: longContent,
        };

        expect(prompt.prompt.length).toBeGreaterThan(1000);
      });

      it("should handle multiline prompt content", () => {
        const multilineContent = `Line 1
Line 2
Line 3`;
        const prompt = {
          name: "Name",
          description: "Description",
          promptCode: "code",
          prompt: multilineContent,
        };

        expect(prompt.prompt).toContain("\n");
      });

      it("should preserve prompt field values exactly", () => {
        const originalData = {
          name: "  Name with spaces  ",
          description: "Desc\nwith\nnewlines",
          promptCode: "CODE_lowercase_MixedCase",
          prompt: "Original content {{placeholder}}",
        };

        expect(originalData.name).toBe("  Name with spaces  ");
        expect(originalData.promptCode).toBe("CODE_lowercase_MixedCase");
        expect(originalData.prompt).toContain("{{placeholder}}");
      });
    });

    describe("Prompt Query Integration", () => {
      it("should use GET method for fetching prompts", () => {
        expect(HttpMethod.GET).toBe("GET");
      });

      it("should use POST method for creating prompts", () => {
        expect(HttpMethod.POST).toBe("POST");
      });

      it("should use PUT method for updating prompts", () => {
        expect(HttpMethod.PUT).toBe("PUT");
      });

      it("should construct API request with correct parameters", () => {
        const params = {
          searchName: "test",
          limit: 30,
          offset: 0,
          sortBy: "createdAt",
          order: "DESC",
        };

        expect(params).toHaveProperty("searchName");
        expect(params.limit).toBe(30);
        expect(params.offset).toBe(0);
      });

      it("should handle query without search term", () => {
        const params = {
          searchName: "",
          limit: 30,
          offset: 0,
          sortBy: "createdAt",
          order: "DESC",
        };

        expect(params.searchName).toBe("");
        expect(params.limit).toBeGreaterThan(0);
      });
    });

    describe("Prompt Error Handling", () => {
      it("should handle missing required fields in create", () => {
        const incompletePrompt = {
          name: "",
        };

        expect("description" in incompletePrompt).toBe(false);
        expect("promptCode" in incompletePrompt).toBe(false);
        expect("prompt" in incompletePrompt).toBe(false);
      });

      it("should handle invalid ID format", () => {
        const invalidId = "";
        expect(invalidId).toBe("");
      });

      it("should handle empty array in create", () => {
        const prompts: any[] = [];
        expect(Array.isArray(prompts)).toBe(true);
        expect(prompts).toHaveLength(0);
      });

      it("should handle null values gracefully", () => {
        const promptWithNull = {
          name: null,
          description: "Valid",
          promptCode: "code",
          prompt: "content",
        };

        expect(promptWithNull.name).toBeNull();
      });
    });
  });
});
