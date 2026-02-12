import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  SessionEvent,
  GetSessionEventsQuery,
  SessionEventResponse,
  GetSimulationsQueryParams,
  GetSimulationsResponse,
  CreateSimulationInput,
  CreateSimulationResponse,
  GetSimulationByIdResponse,
  UpdateSimulationByIdInput,
  UpdateSimulationByIdResponse,
  GetCoverImageUrlRequest,
  GetCoverImageUrlResponse,
  DeleteCoverImageRequest,
  GetCoverVideoUrlRequest,
  GetCoverVideoUrlResponse,
  DeleteCoverVideoRequest,
  ScenarioVoice,
  GetScenarioVoicesQuery,
  getTriggerWarningsQueryParams,
  triggerWarningsRequest,
  createTriggerResponse,
  ScenarioLanguage,
  triggerWarning,
  GetLanguagesQuery,
  Language,
  CharacterData,
  DeleteCharacterRequest,
  Prompt,
  GetPromptsQuery,
  GetReportsInput,
  ReportData,
  GenerateReportInput,
  GenerateReportResponse,
} from "@types";

import { baseAPI } from "./baseApi";

const simulationStudioAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Get all simulations available in the Simulation Studio.
     * @returns {Promise<GetSimulationsResponse>} List of simulations
     */
    getSimulations: builder.query<GetSimulationsResponse, GetSimulationsQueryParams>({
      query: (params: GetSimulationsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_SIMULATIONS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get simulation by Id
     */
    getAdminSimulationById: builder.query<GetSimulationByIdResponse, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_ADMIN_SIMULATION_BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Create a new simulation.
     */
    createSimulation: builder.mutation<CreateSimulationResponse, CreateSimulationInput>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CREATE_SIMULATION,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Update simulation.
     */
    updateSimulationById: builder.mutation<UpdateSimulationByIdResponse, UpdateSimulationByIdInput>(
      {
        query: ({ id, simulation: body }) => ({
          url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_SIMULATION_BY_ID(id),
          method: HttpMethod.PUT,
          body,
        }),
        invalidatesTags: [TAG_TYPES.SIMULATION],
      },
    ),

    /**
     * Delete simulation by Id.
     */
    deleteSimulationById: builder.mutation<void, string | number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SIMULATION_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get custom events for a simulation.
     */
    getSessionEvents: builder.query<SessionEventResponse, GetSessionEventsQuery>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Get session event by ID
     */
    getSessionEventById: builder.query<SessionEvent, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_SESSION_EVENT_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Create Session Event
     */
    createSessionEvent: builder.mutation<void, { event: SessionEvent }>({
      query: ({ event }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.POST,
        body: event,
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Create Session Events (bulk)
     */
    createSessionEvents: builder.mutation<Array<{ id?: string }>, { events: SessionEvent[] }>({
      query: ({ events }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENTS,
        method: HttpMethod.POST,
        body: { events },
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Update Events
     */
    updateSessionEvent: builder.mutation<
      { messages?: string[] },
      { id: string; event: SessionEvent }
    >({
      query: ({ id, event }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_SESSION_EVENT(id),
        method: HttpMethod.PUT,
        body: event,
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Delete Session Events
     */
    deleteSessionEvents: builder.mutation<void, { eventIds: string[] }>({
      query: ({ eventIds }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_SESSION_EVENTS,
        method: HttpMethod.DELETE,
        body: { eventIds },
      }),
      invalidatesTags: [TAG_TYPES.SESSION_EVENTS],
    }),

    /**
     * Get session event tags with optional search
     */
    getSessionEventTags: builder.query<{ data: string[] }, { search?: string } | undefined>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SESSION_EVENT_TAGS,
        method: HttpMethod.GET,
        params: params || {},
      }),
      providesTags: [TAG_TYPES.SESSION_EVENT_TAGS],
    }),

    /**
     * Get presigned URL for S3 upload
     */
    getCoverImageUrl: builder.mutation<GetCoverImageUrlResponse, GetCoverImageUrlRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_COVER_IMAGE_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover image from S3
     */
    deleteCoverImage: builder.mutation<void, DeleteCoverImageRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_COVER_IMAGE,
        method: HttpMethod.DELETE,
        body,
      }),
    }),

    /**
     * Get presigned URL for cover video S3 upload
     */
    getCoverVideoUrl: builder.mutation<GetCoverVideoUrlResponse, GetCoverVideoUrlRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_COVER_VIDEO_URL,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /**
     * Delete cover video from S3
     */
    deleteCoverVideo: builder.mutation<void, DeleteCoverVideoRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DELETE_COVER_VIDEO,
        method: HttpMethod.DELETE,
        body,
      }),
    }),

    /**
     * Get all scenario voices
     */
    getScenarioVoices: builder.query<ScenarioVoice[], GetScenarioVoicesQuery>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VOICES,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SCENARIO_VOICES],
    }),

    /**
     * Create a new scenario voice
     */

    createScenarioVoice: builder.mutation<ScenarioVoice[], { voices: ScenarioVoice[] }>({
      query: ({ voices }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CREATE_SCENARIO_VOICE,
        method: HttpMethod.POST,
        body: { voices },
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VOICES],
    }),

    /**
     * Update a scenario voice
     */
    updateScenarioVoice: builder.mutation<
      ScenarioVoice,
      { id: string; voice: Omit<ScenarioVoice, "id" | "createdAt" | "updatedAt"> }
    >({
      query: ({ id, voice: body }) => ({
        url: `${ApiEndpoints.SIMULATION_STUDIO.UPDATE_SCENARIO_VOICE(id)}`,
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VOICES],
    }),

    /**
     * Get all available scenario languages
     */
    getAvailableLanguageVoices: builder.query<
      ScenarioLanguage[],
      { active?: boolean; voicesNeeded: boolean }
    >({
      query: (params = { active: true, voicesNeeded: true }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VOICE_LANGUAGES,
        method: HttpMethod.GET,
        params: params, // This will pass through any params you provide
      }),
    }),

    /**
     * Map scenario events
     */
    mapScenarioEvents: builder.mutation<void, { scenarioId: number; events: any[] }>({
      query: ({ scenarioId, events }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.MAP_SCENARIO_EVENTS,
        method: HttpMethod.POST,
        body: { scenarioId, events },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION, TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Map scenario events
     */
    getMappedScenarioEvents: builder.query<{ data: any[] }, { id: string }>({
      query: ({ id }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_MAPPED_SCENARIO_EVENTS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Delete scenario events
     */
    deleteScenarioEvents: builder.mutation<void, { scenarioId: number; eventIds: string[] }>({
      query: ({ scenarioId, eventIds }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_EVENTS,
        method: HttpMethod.DELETE,
        body: { scenarioId, eventIds },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION, TAG_TYPES.SIMULATION_EVENTS],
    }),

    /**
     * Get scenario preview
     */
    scenarioPreview: builder.mutation<any, { scenarioId: number; languageId?: number }>({
      query: ({ scenarioId, languageId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PREVIEW,
        method: HttpMethod.POST,
        body: {
          scenarioId,
          languageId,
        },
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get scenario languages
     */
    getScenarioLanguages: builder.query<
      ScenarioLanguage[],
      { active?: boolean; hasVoices?: boolean }
    >({
      query: (params = {}) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_LANGUAGES,
        method: HttpMethod.GET,
        params: params, // This will pass through any params you provide
      }),
    }),

    /**
     * End scenario preview
     */
    endScenarioPreview: builder.mutation<void, { roomName: string }>({
      query: ({ roomName }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.END_SCENARIO_PREVIEW(roomName),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    //Trigger warnings
    getTriggerWarnings: builder.query<triggerWarning[], getTriggerWarningsQueryParams>({
      query: (params: GetSimulationsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.TRIGGER_WARNINGS,
        params,
      }),
      providesTags: [TAG_TYPES.TRIGGER_WARNINGS],
    }),

    createTriggerWarning: builder.mutation<createTriggerResponse, triggerWarningsRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.TRIGGER_WARNINGS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.TRIGGER_WARNINGS],
    }),

    duplicateSimulation: builder.mutation<{ success: boolean }, string | number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DUPLICATE_SIMULATION(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SIMULATION],
    }),

    /**
     * Get all scenario languages with pagination and search
     */
    getLanguages: builder.query<Language[], GetLanguagesQuery>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_LANGUAGES,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.SCENARIO_LANGUAGES],
    }),

    /**
     * Create a new scenario language
     */
    createLanguage: builder.mutation<Language[], { languages: Language[] }>({
      query: ({ languages }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CREATE_LANGUAGE,
        method: HttpMethod.POST,
        body: { languages },
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_LANGUAGES],
    }),

    /**
     * Update a scenario language
     */
    updateLanguage: builder.mutation<
      Language,
      { id: number; language: Omit<Language, "id" | "createdAt" | "updatedAt"> }
    >({
      query: ({ id, language: body }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_LANGUAGE(id),
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_LANGUAGES],
    }),

    /**
     * Get all prompts with pagination and search
     */
    getPrompts: builder.query<Prompt[], GetPromptsQuery>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_PROMPTS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Create a new prompt
     */
    createPrompt: builder.mutation<Prompt, { prompts: Prompt[] }>({
      query: ({ prompts }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CREATE_PROMPT,
        method: HttpMethod.POST,
        body: { prompts },
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Update a prompt
     */
    updatePrompt: builder.mutation<
      Prompt,
      { id: string; prompt: Omit<Prompt, "id" | "createdAt" | "updatedAt"> }
    >({
      query: ({ id, prompt: body }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(id),
        method: HttpMethod.PUT,
        body,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    getDynamicBranchingInstruction: builder.query<string[], number | void>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DYNAMIC_BRANCHING_INSTRUCTIONS,
        method: HttpMethod.GET,
        params: id ? { scenarioId: id } : undefined,
      }),
    }),

    /**
     * Get all characters
     */
    getCharacters: builder.query<
      { characters: CharacterData[]; count: number },
      { limit?: number; offset?: number; search?: string; sortBy?: string; order?: string }
    >({
      query: params => ({
        url: ApiEndpoints.CHARACTERS.GET_CHARACTERS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.CHARACTERS],
    }),

    /**
     * Get character by ID
     */
    getCharacterById: builder.query<CharacterData, string>({
      query: id => ({
        url: ApiEndpoints.CHARACTERS.GET_CHARACTER_BY_ID(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.CHARACTERS],
    }),

    /**
     * Create a new character
     */
    createCharacter: builder.mutation<
      CharacterData,
      Omit<CharacterData, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">
    >({
      query: body => ({
        url: ApiEndpoints.CHARACTERS.CREATE_CHARACTER,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CHARACTERS],
    }),

    /**
     * Update a character
     */
    updateCharacter: builder.mutation<
      CharacterData,
      {
        id: string;
        data: Omit<CharacterData, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">;
      }
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.CHARACTERS.UPDATE_CHARACTER(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.CHARACTERS],
    }),

    /**
     * Delete a character
     */
    deleteCharacter: builder.mutation<{ success: boolean }, DeleteCharacterRequest>({
      query: body => ({
        url: ApiEndpoints.CHARACTERS.DELETE_CHARACTER,
        method: HttpMethod.DELETE,
        body,
      }),
      invalidatesTags: [TAG_TYPES.CHARACTERS],
    }),

    getBehavioursInstruction: builder.query<
      any[],
      { limit: number; offset: number; searchName?: string }
    >({
      async queryFn(params) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const DUMMY_BEHAVIOURS_INSTRUCTION_DATA = [
          {
            id: "1",
            category: "HELPER SHOULD DO",
            behaviours: [{ id: "1", name: "Behaviours 1" }],
            response: "Response 1",
          },
          {
            id: "2",
            category: "HELPER SHOULD NOT DO",
            behaviours: [{ id: "2", name: "Behaviours 2" }],
            response: "Response 2",
          },
          {
            id: "3",
            category: "HELPER SHOULD DO",
            behaviours: [{ id: "3", name: "Behaviours 3" }],
            response: "Response 3",
          },
          {
            id: "4",
            category: "HELPER SHOULD NOT DO",
            behaviours: [{ id: "4", name: "Behaviours 4" }],
            response: "Response 4",
          },
        ];
        let filteredData = [...DUMMY_BEHAVIOURS_INSTRUCTION_DATA];

        // Filter by search name if provided
        if (params.searchName) {
          filteredData = filteredData.filter(behaviours =>
            behaviours.category.toLowerCase().includes(params.searchName.toLowerCase()),
          );
        }

        // Paginate
        const start = params.offset;
        const end = start + params.limit;
        const data = filteredData.slice(start, end);

        return { data };
      },
    }),
    getTags: builder.query<any[], { limit: number; offset: number; searchName?: string }>({
      async queryFn(params) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const DUMMY_TAGS_DATA = [
          { id: "1", name: "Tag 1" },
          { id: "2", name: "Tag 2" },
          { id: "3", name: "Tag 3" },
          { id: "4", name: "Tag 4" },
          { id: "5", name: "Tag 5" },
          { id: "6", name: "Tag 6" },
          { id: "7", name: "Tag 7" },
          { id: "8", name: "Tag 8" },
          { id: "9", name: "Tag 9" },
          { id: "10", name: "Tag 10" },
        ];

        let filteredData = [...DUMMY_TAGS_DATA];

        // Filter by search name if provided
        if (params.searchName) {
          filteredData = filteredData.filter(tag =>
            tag.name.toLowerCase().includes(params.searchName.toLowerCase()),
          );
        }

        // Paginate
        const start = params.offset;
        const end = start + params.limit;
        const data = filteredData.slice(start, end);

        return { data };
      },
    }),
    getStatesInstruction: builder.query<
      any[],
      { limit: number; offset: number; searchName?: string }
    >({
      async queryFn(params) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const DUMMY_STATES_INSTRUCTION_DATA = [
          {
            id: "1",
            states: "State 1",
            instruction: "Provide an initial greeting and introduce the system.",
            dialogue: "Hello! I’m here to assist you. How can I help?",
          },
          {
            id: "2",
            states: "State 2",
            instruction: "Ask the user for the required information.",
            dialogue: "Could you please share more details?",
          },
          {
            id: "3",
            states: "State 3",
            instruction: "Process the user input and give a relevant response.",
            dialogue: "Thanks! Here’s what I found based on your input.",
          },
          {
            id: "4",
            states: "State 4",
            instruction: "Close the conversation politely.",
            dialogue: "You're all set! Let me know if you need anything else 😊",
          },
        ];

        let filteredData = [...DUMMY_STATES_INSTRUCTION_DATA];

        // Filter by search name if provided
        if (params.searchName) {
          filteredData = filteredData.filter(state =>
            state.states.toLowerCase().includes(params.searchName.toLowerCase()),
          );
        }

        // Paginate
        const start = params.offset;
        const end = start + params.limit;
        const data = filteredData.slice(start, end);

        return { data };
      },
    }),
    getImageLibrary: builder.query<any[], { limit: number; offset: number; searchName?: string }>({
      async queryFn(params) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const DUMMY_IMAGE_LIBRARY_DATA = [
          {
            coverImageUrl:
              "https://cdn.midjourney.com/bc22b877-4ced-4811-90cc-6bb5bda9455b/0_3.png",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1770181717405-cropped-pexels-pixabay-247314.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768280282530-cropped-pexels-geralt-23180.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1770120421467-cropped-pexels-pixabay-247314.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1769747362725-screenshot-from-2025._imresizer.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1764239561786-abcdef-809089898979abcdef-809089898979abcdef-809089898979abcdef-809089898979abcdef-809089898979abcdef-809089898979abcdef-8090898",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1765254652523-112ef58778fad94852fe9c290ec77a90_t-1.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1769148521715-112ef58778fad94852fe9c290ec77a90_t-1.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1770028203658-screenshot-from-2025._imresizer-8.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768280282530-cropped-pexels-geralt-23180.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1763359595536-test.jpg",
          },
          {
            coverImageUrl:
              "https://cdn.midjourney.com/bc22b877-4ced-4811-90cc-6bb5bda9455b/0_3.png",
          },
          { coverImageUrl: null },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1761813802760-simulation-header-image.png",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1769000658013-1766120268341-custom.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1761813802760-simulation-header-image.png",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768280282530-cropped-pexels-geralt-23180.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768974667508-premium_photo-1701693533734-bc279bdd0c80.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768970470899-frustrated_employee.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1767179755995-1766120268341-custom.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1766981056323-112ef58778fad94852fe9c290ec77a90_t-1.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1766037411514-kelly-sikkema-jn0suctoig0-unsplash_cropped_processed_by_imagy.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1764582182735-screenshot-from-2025._imresizer-5.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1761829046169-cropped-pexels-pixabay-247314.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768466588451-screenshot-from-2025._imresizer-9.jpg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768467100668-112ef58778fad94852fe9c290ec77a90_t-1.jpeg",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1767782881926-screenshot-from-2025._imresizer-9.jpg",
          },
          { coverImageUrl: null },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1761813802760-simulation-header-image.png",
          },
          {
            coverImageUrl:
              "https://ally-dev-s3-learn-media-public.s3.ap-southeast-1.amazonaws.com/scenario-cover-images/1768392948268-premium_photo-1701693533734-bc279bdd0c80.jpeg",
          },
        ];

        let filteredData = [...DUMMY_IMAGE_LIBRARY_DATA];

        // Filter by search name if provided
        if (params.searchName) {
          filteredData = filteredData.filter(image =>
            image.coverImageUrl.toLowerCase().includes(params.searchName.toLowerCase()),
          );
        }

        // Paginate
        const start = params.offset;
        const end = start + params.limit;
        const data = filteredData.slice(start, end);

        return { data };
      },
    }),

    /**
     * Get reports for a specific scenario.
     * @param {string} scenarioId - Scenario identifier
     * @returns {Promise<ReportData[]>} List of reports
     */
    getReports: builder.query<{ data: ReportData[] }, { input: GetReportsInput }>({
      query: ({ input }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_REPORTS(input.scenarioId),
        method: HttpMethod.GET,
        params: {
          status: input.status,
        },
      }),
    }),

    /**
     * Get report by ID.
     * @param {string} id - Report identifier
     * @returns {Promise<ReportData>} Report data
     */
    getReportById: builder.query<ReportData, { id: string }>({
      query: ({ id }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_REPORT_BY_ID(id),
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Generate a report for a specific scenario.
     * @param {string} scenarioId - Scenario identifier
     * @returns {Promise<ReportData>} Report data
     */
    generateReport: builder.mutation<GenerateReportResponse, { input: GenerateReportInput }>({
      query: ({ input }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_REPORT(input.scenarioId),
        method: HttpMethod.POST,
        body: {
          languageId: input.config.languageId,
          turns: input.config.turns,
          helperAgentPrompt: input.config.helperAgentPrompt,
        },
      }),
    }),

    /**
     * Cancel a report generation.
     * @param {Object} params - Cancel report parameters
     * @param {string} params.reportId - Report identifier
     * @returns {Promise<{ success: boolean }>} Success response
     */
    cancelReportGeneration: builder.mutation<{ success: boolean }, { reportId: string }>({
      query: ({ reportId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CANCEL_REPORT_GENERATION(reportId),
        method: HttpMethod.POST,
      }),
    }),
  }),
});

export const {
  useGetSimulationsQuery,
  useLazyGetAdminSimulationByIdQuery,
  useCreateSimulationMutation,
  useUpdateSimulationByIdMutation,
  useDeleteSimulationByIdMutation,
  useGetSessionEventsQuery,
  useLazyGetSessionEventsQuery,
  useGetSessionEventByIdQuery,
  useCreateSessionEventMutation,
  useCreateSessionEventsMutation,
  useUpdateSessionEventMutation,
  useDeleteSessionEventsMutation,
  useGetSessionEventTagsQuery,
  useGetCoverImageUrlMutation,
  useDeleteCoverImageMutation,
  useGetCoverVideoUrlMutation,
  useDeleteCoverVideoMutation,
  useGetScenarioVoicesQuery,
  useCreateScenarioVoiceMutation,
  useUpdateScenarioVoiceMutation,
  useGetAvailableLanguageVoicesQuery,
  useGetScenarioLanguagesQuery,
  useScenarioPreviewMutation,
  useEndScenarioPreviewMutation,
  useMapScenarioEventsMutation,
  useDeleteScenarioEventsMutation,
  useGetMappedScenarioEventsQuery,
  useGetTriggerWarningsQuery,
  useCreateTriggerWarningMutation,
  useDuplicateSimulationMutation,
  useGetLanguagesQuery,
  useCreateLanguageMutation,
  useUpdateLanguageMutation,
  useGetPromptsQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useGetDynamicBranchingInstructionQuery,
  useGetCharactersQuery,
  useGetCharacterByIdQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useGetBehavioursInstructionQuery,
  useGetTagsQuery,
  useGetStatesInstructionQuery,
  useGetImageLibraryQuery,
  useGetReportsQuery,
  useGetReportByIdQuery,
  useLazyGetReportByIdQuery,
  useGenerateReportMutation,
  useCancelReportGenerationMutation,
} = simulationStudioAPI;
