import { ApiEndpoints, HttpMethod, TAG_TYPES } from "@constants";
import {
  GlossaryListResponse,
  LanguageGlossarySection,
  UpsertGlossarySectionPayload,
  GenerateGlossaryResult,
  ConsolidateGlossaryResult,
  BackfillGlossariesOutcome,
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
  PromptTranslation,
  TranslatePromptResult,
  GetPromptsQuery,
  LlmModelInfo,
  GetReportsInput,
  ReportData,
  GenerateReportInput,
  GenerateReportResponse,
  ScenarioVersion,
  CreateScenarioVersionInput,
  UpdateScenarioVersionInput,
  GetImageLibraryQueryParams,
  GetImageLibraryResponse,
  GetFillerTagsQueryParams,
  GetHelperTagsQueryParams,
  HelperTagInput,
  FillerTagListResponse,
  CreateFillerTagResponse,
  CompetenciesResponse,
  GetCompetenciesArgs,
  Competency,
  CreateCompetencyRequest,
  UpdateCompetencyRequest,
  CompetencyBehavioursResponse,
  SetCompetencyBehavioursRequest,
  AgentTestCase,
  AgentTestCasesResponse,
  CreateAgentTestCaseRequest,
  UpdateAgentTestCaseRequest,
  AutofillModelOption,
  EnhanceFieldRequest,
  EnhanceFieldResponse,
  GetReportTranscriptInput,
  GetReportTranscriptResponse,
  GenerateCoverImageRequest,
  GenerateCoverImageResponse,
  SttConfig,
  SttConfigPayload,
  LlmConfig,
  LlmConfigPayload,
  LlmPreviewResult,
  LlmCatalogModel,
  LlmCatalogModelPayload,
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
     * Named STT configurations. `activeOnly` is what the pickers pass —
     * a retired config must stay resolvable for whatever already points at it,
     * but must not be offered as a new choice.
     */
    getSttConfigs: builder.query<SttConfig[], { activeOnly?: boolean } | void>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.STT_CONFIGS,
        method: HttpMethod.GET,
        ...(params && params.activeOnly ? { params: { activeOnly: true } } : {}),
      }),
      providesTags: [TAG_TYPES.STT_CONFIGS],
    }),

    createSttConfig: builder.mutation<SttConfig, SttConfigPayload>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.STT_CONFIGS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.STT_CONFIGS],
    }),

    updateSttConfig: builder.mutation<
      SttConfig,
      { id: string; sttConfig: Partial<SttConfigPayload> }
    >({
      query: ({ id, sttConfig }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_STT_CONFIG(id),
        method: HttpMethod.PUT,
        body: sttConfig,
      }),
      invalidatesTags: [TAG_TYPES.STT_CONFIGS],
    }),

    deleteSttConfig: builder.mutation<{ deleted: true }, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_STT_CONFIG(id),
        method: HttpMethod.DELETE,
      }),
      // Languages also change when a config they referenced is removed.
      invalidatesTags: [TAG_TYPES.STT_CONFIGS, TAG_TYPES.SCENARIO_LANGUAGES],
    }),

    /** Named LLM configurations — the registry behind the Language Model tab. */
    getLlmConfigs: builder.query<LlmConfig[], { activeOnly?: boolean } | void>({
      query: params => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_CONFIGS,
        method: HttpMethod.GET,
        ...(params && params.activeOnly ? { params: { activeOnly: true } } : {}),
      }),
      providesTags: [TAG_TYPES.LLM_CONFIGS],
    }),

    createLlmConfig: builder.mutation<LlmConfig, LlmConfigPayload>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_CONFIGS,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.LLM_CONFIGS],
    }),

    updateLlmConfig: builder.mutation<
      LlmConfig,
      { id: string; llmConfig: Partial<LlmConfigPayload> }
    >({
      query: ({ id, llmConfig }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_LLM_CONFIG(id),
        method: HttpMethod.PUT,
        body: llmConfig,
      }),
      invalidatesTags: [TAG_TYPES.LLM_CONFIGS],
    }),

    deleteLlmConfig: builder.mutation<{ deleted: true }, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_LLM_CONFIG(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.LLM_CONFIGS, TAG_TYPES.SCENARIO_LANGUAGES],
    }),

    /**
     * The LLM model catalog as stored, inactive rows included. Distinct from
     * getLlmModels (the pickers' feed), which hides inactive rows and falls
     * back to the in-code list.
     */
    getLlmModelCatalog: builder.query<LlmCatalogModel[], void>({
      query: () => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_MODEL_CATALOG,
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.LLM_MODEL_CATALOG],
    }),

    createLlmModel: builder.mutation<LlmCatalogModel, LlmCatalogModelPayload>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_MODEL_CATALOG,
        method: HttpMethod.POST,
        body,
      }),
      // LLM_MODELS is the pickers' feed, so it has to refresh too.
      invalidatesTags: [TAG_TYPES.LLM_MODEL_CATALOG, TAG_TYPES.LLM_MODELS],
    }),

    updateLlmModel: builder.mutation<
      LlmCatalogModel,
      { id: string; model: Partial<LlmCatalogModelPayload> }
    >({
      query: ({ id, model: body }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_MODEL_CATALOG_BY_ID(id),
        method: HttpMethod.PATCH,
        body,
      }),
      invalidatesTags: [TAG_TYPES.LLM_MODEL_CATALOG, TAG_TYPES.LLM_MODELS],
    }),

    deleteLlmModel: builder.mutation<{ deleted: true }, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.LLM_MODEL_CATALOG_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.LLM_MODEL_CATALOG, TAG_TYPES.LLM_MODELS],
    }),

    /**
     * Run a one-line completion against a saved LLM config to check the model
     * still answers. Invalidates nothing — it reads from the provider, not us.
     */
    previewLlmConfig: builder.mutation<LlmPreviewResult, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.PREVIEW_LLM_CONFIG(id),
        method: HttpMethod.POST,
      }),
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
    scenarioPreview: builder.mutation<
      any,
      { scenarioId: number; languageId?: number; scenarioVersionId?: string }
    >({
      query: ({ scenarioId, languageId, scenarioVersionId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_PREVIEW,
        method: HttpMethod.POST,
        body: {
          scenarioId,
          languageId,
          ...(scenarioVersionId && { scenarioVersionId }),
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
     * Dispatch agent to preview room (local dev only, when webhook unreachable)
     */
    dispatchPreviewAgent: builder.mutation<void, { roomName: string }>({
      query: ({ roomName }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DISPATCH_PREVIEW_AGENT,
        method: HttpMethod.POST,
        body: { roomName },
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
     * Canonical LLM model registry (single source of truth for the
     * Prompt Management model picker). Optionally filtered to a runtime.
     */
    getLlmModels: builder.query<LlmModelInfo[], string | void>({
      query: runtime => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_LLM_MODELS,
        method: HttpMethod.GET,
        ...(runtime ? { params: { runtime } } : {}),
      }),
      // Now that the catalog is editable, adding or retiring a model has to
      // reach every picker fed by this query without a page reload.
      providesTags: [TAG_TYPES.LLM_MODELS],
    }),

    /**
     * List prompt variants by promptType (e.g. 'main_agent').
     * Powers the studio prompt picker and the prompt-management Type filter.
     */
    getPromptsByType: builder.query<Prompt[], string>({
      query: promptType => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_PROMPTS_BY_TYPE(promptType),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Duplicate an existing prompt to start a new variant. Returns the new
     * Prompt row with useDashboardOverride=true and an initial v1 version
     * cloned from the source. Caller typically navigates to the new id.
     */
    duplicatePrompt: builder.mutation<Prompt, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.DUPLICATE_PROMPT(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
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

    /**
     * Revert prompt to codebase default
     */
    revertPrompt: builder.mutation<boolean, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.REVERT_PROMPT(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Delete an obsolete prompt
     */
    deletePrompt: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPDATE_PROMPT(id), // DELETE /prompts/:id
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * In-use count + a small sample of referencing scenarios for a prompt
     * variant. Drives the in-use guard and tooltip on the studio's
     * "Delete variant" button — fetched on demand only when the side panel
     * opens for a duplicated variant.
     */
    getPromptUsage: builder.query<
      { count: number; scenarios: Array<{ id: number; title: string }> },
      string
    >({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_PROMPT_USAGE(id),
        method: HttpMethod.GET,
      }),
      // Re-fetch when a simulation is created/updated (which may change
      // which variant it points at) or when the prompts list refreshes.
      providesTags: [TAG_TYPES.PROMPTS, TAG_TYPES.SIMULATION],
    }),

    /**
     * Read-only: stored translations for a prompt (one row per language).
     * Drives the read-only Translations panel; refreshes when prompts change.
     */
    getPromptTranslations: builder.query<PromptTranslation[], string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_PROMPT_TRANSLATIONS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.PROMPTS],
    }),

    /** Re-translate a prompt into all eligible languages ("Re-translate all"). */
    retranslatePrompt: builder.mutation<TranslatePromptResult, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.RETRANSLATE_PROMPT(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /** Re-translate a prompt into a single language (per-language retry). */
    retranslatePromptLanguage: builder.mutation<unknown, { id: string; languageId: number }>({
      query: ({ id, languageId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.RETRANSLATE_PROMPT_LANGUAGE(id, languageId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Set (or clear, with empty provider/model) the per-language runtime model
     * that runs the main agent when this translated body is served.
     */
    setTranslationRuntimeModel: builder.mutation<
      unknown,
      { id: string; languageId: number; provider?: string; model?: string }
    >({
      query: ({ id, languageId, provider, model }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SET_TRANSLATION_RUNTIME_MODEL(id, languageId),
        method: HttpMethod.PUT,
        body: { provider, model },
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /** Backfill: (re)translate every enabled source across eligible languages. */
    backfillPromptTranslations: builder.mutation<unknown, void>({
      query: () => ({
        url: ApiEndpoints.SIMULATION_STUDIO.BACKFILL_PROMPT_TRANSLATIONS,
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.PROMPTS],
    }),

    /**
     * Per-language glossary sections + Tier 0 token accounting.
     * Sections are the unit of publish; entries render only when published.
     */
    getLanguageGlossary: builder.query<GlossaryListResponse, number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_LANGUAGE_GLOSSARY(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Create/update a glossary section (draft edit; cap-checked when published+always). */
    upsertGlossarySection: builder.mutation<
      LanguageGlossarySection,
      { languageId: number; sectionCode: string; payload: UpsertGlossarySectionPayload }
    >({
      query: ({ languageId, sectionCode, payload }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.UPSERT_GLOSSARY_SECTION(languageId, sectionCode),
        method: HttpMethod.PUT,
        body: payload,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Publish a section (backend blocks when the Tier 0 set would exceed the cap). */
    publishGlossarySection: builder.mutation<
      LanguageGlossarySection,
      { languageId: number; sectionCode: string }
    >({
      query: ({ languageId, sectionCode }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.PUBLISH_GLOSSARY_SECTION(languageId, sectionCode),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    archiveGlossarySection: builder.mutation<
      LanguageGlossarySection,
      { languageId: number; sectionCode: string }
    >({
      query: ({ languageId, sectionCode }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.ARCHIVE_GLOSSARY_SECTION(languageId, sectionCode),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Seed job: LLM-generated DRAFT sections; never overwrites published ones. */
    generateLanguageGlossary: builder.mutation<GenerateGlossaryResult, number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_LANGUAGE_GLOSSARY(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Accept a consolidation proposal — appends its markdown to the section content. */
    acceptGlossaryProposal: builder.mutation<
      LanguageGlossarySection,
      { languageId: number; sectionCode: string; entryId: string }
    >({
      query: ({ languageId, sectionCode, entryId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.ACCEPT_GLOSSARY_PROPOSAL(
          languageId,
          sectionCode,
          entryId,
        ),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    rejectGlossaryProposal: builder.mutation<
      LanguageGlossarySection,
      { languageId: number; sectionCode: string; entryId: string }
    >({
      query: ({ languageId, sectionCode, entryId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.REJECT_GLOSSARY_PROPOSAL(
          languageId,
          sectionCode,
          entryId,
        ),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Consolidation: judge error annotations -> PROPOSED entries (never auto-published). */
    consolidateLanguageGlossary: builder.mutation<ConsolidateGlossaryResult, number>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CONSOLIDATE_LANGUAGE_GLOSSARY(id),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
    }),

    /** Backfill: generate DRAFT glossaries for all active non-English languages (or given ids). */
    backfillLanguageGlossaries: builder.mutation<
      BackfillGlossariesOutcome[],
      { languageIds?: number[] } | void
    >({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.BACKFILL_LANGUAGE_GLOSSARIES,
        method: HttpMethod.POST,
        body: body ?? {},
      }),
      invalidatesTags: [TAG_TYPES.LANGUAGE_GLOSSARY],
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

    /**
     * Generate a scenario cover image with AI. Stateless: the backend renders
     * the managed `cover_image_generation` prompt (editable via Prompt
     * Management) with the given title/description, returns the image URL
     * (already stored in S3 and the shared image library); the client saves
     * it on the scenario through the normal update flow.
     */
    generateCoverImage: builder.mutation<GenerateCoverImageResponse, GenerateCoverImageRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_COVER_IMAGE,
        method: HttpMethod.POST,
        body,
      }),
      // Generated images land in the shared library — refresh the picker.
      invalidatesTags: [TAG_TYPES.IMAGE_LIBRARY],
    }),

    getHelperTags: builder.query<HelperTagInput, GetHelperTagsQueryParams>({
      query: (params: GetHelperTagsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.HELPER_TAGS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.HELPER_TAGS],
    }),

    createHelperTag: builder.mutation<HelperTagInput, { name: string }>({
      query: ({ name }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.HELPER_TAGS,
        method: HttpMethod.POST,
        body: { name },
      }),
      invalidatesTags: [TAG_TYPES.HELPER_TAGS],
    }),

    getFillerTags: builder.query<FillerTagListResponse, GetFillerTagsQueryParams>({
      query: (params: GetFillerTagsQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.FILLER_TAGS,
        method: HttpMethod.GET,
        params,
      }),
      providesTags: [TAG_TYPES.FILLER_TAGS],
    }),

    createFillerTag: builder.mutation<CreateFillerTagResponse, { name: string }>({
      query: ({ name }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.FILLER_TAGS,
        method: HttpMethod.POST,
        body: { name },
      }),
      invalidatesTags: [TAG_TYPES.FILLER_TAGS],
    }),

    getImageLibrary: builder.query<GetImageLibraryResponse, GetImageLibraryQueryParams>({
      query: (params: GetImageLibraryQueryParams) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_COVER_IMAGE_LIBRARY,
        method: HttpMethod.GET,
        params: {
          limit: params.limit,
          offset: params.offset,
          sortBy: params.sortBy || "createdAt",
          sortOrder: params.sortOrder || "desc",
          ...(params.searchName && { searchName: params.searchName }),
        },
      }),
      providesTags: [TAG_TYPES.IMAGE_LIBRARY],
    }),

    /**
     * Get reports for a specific scenario.
     * @param {string} scenarioId - Scenario identifier
     * @returns {Promise<ReportData[]>} List of reports
     */
    getReports: builder.query<{ data: ReportData[]; count?: number }, { input: GetReportsInput }>({
      query: ({ input }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_REPORTS(input.scenarioId),
        method: HttpMethod.GET,
        params: {
          ...(input?.statuses && { statuses: input.statuses }),
          ...(input?.limit != null && { limit: input.limit }),
          ...(input?.offset != null && { offset: input.offset }),
          ...(input?.sortBy && { sortBy: input.sortBy }),
          ...(input?.order && { order: input.order }),
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
          selectedEvaluatorPromptCode: input.config.selectedEvaluatorPromptCode,
          ...(input.scenarioVersionId && {
            scenarioVersionId: input.scenarioVersionId,
          }),
        },
      }),
    }),

    /**
     * List saved versions of a scenario (newest first). The server lazily
     * seeds a v1 from the live scenario if none exist yet.
     */
    getScenarioVersions: builder.query<ScenarioVersion[], { scenarioId: string | number }>({
      query: ({ scenarioId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VERSIONS(scenarioId),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.SCENARIO_VERSIONS],
    }),

    /**
     * Create a new draft version, optionally branched from an existing one.
     */
    createScenarioVersion: builder.mutation<ScenarioVersion, CreateScenarioVersionInput>({
      query: ({ scenarioId, name, fromVersionId, empty }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VERSIONS(scenarioId),
        method: HttpMethod.POST,
        body: {
          ...(name && { name }),
          ...(fromVersionId && { fromVersionId }),
          ...(empty && { empty: true }),
        },
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VERSIONS],
    }),

    /**
     * Autosave a draft version (config and/or name). Does not touch the live
     * scenario; only publish materialises a version.
     */
    updateScenarioVersion: builder.mutation<ScenarioVersion, UpdateScenarioVersionInput>({
      query: ({ scenarioId, versionId, name, config }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VERSION_BY_ID(scenarioId, versionId),
        method: HttpMethod.PUT,
        body: { ...(name !== undefined && { name }), ...(config !== undefined && { config }) },
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VERSIONS],
    }),

    /**
     * Publish a version: materialise its config into the live scenario.
     */
    publishScenarioVersion: builder.mutation<
      ScenarioVersion,
      { scenarioId: string | number; versionId: string }
    >({
      query: ({ scenarioId, versionId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.PUBLISH_SCENARIO_VERSION(scenarioId, versionId),
        method: HttpMethod.POST,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VERSIONS, TAG_TYPES.SIMULATION],
    }),

    /**
     * Soft-delete a draft version (the published version cannot be deleted).
     */
    deleteScenarioVersion: builder.mutation<
      boolean,
      { scenarioId: string | number; versionId: string }
    >({
      query: ({ scenarioId, versionId }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.SCENARIO_VERSION_BY_ID(scenarioId, versionId),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.SCENARIO_VERSIONS],
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

    /**
     * Get transcript for a specific report (paginated).
     * @param {string} reportId - Report identifier
     * @param {number} limit - Page size
     * @param {number} offset - Offset for pagination
     * @returns {Promise<GetReportTranscriptResponse>} Paginated transcript messages
     */
    getReportTranscript: builder.query<GetReportTranscriptResponse, GetReportTranscriptInput>({
      query: ({ reportId, limit, offset }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_REPORT_TRANSCRIPT(reportId),
        method: HttpMethod.GET,
        params:
          limit != null || offset != null
            ? { ...(limit != null && { limit }), ...(offset != null && { offset }) }
            : undefined,
      }),
    }),

    /**
     * Get all competencies
     */
    getCompetencies: builder.query<CompetenciesResponse, GetCompetenciesArgs>({
      query: ({ name, includeOwnCustom } = {}) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCIES,
        method: HttpMethod.GET,
        params: {
          ...(name ? { name } : {}),
          ...(includeOwnCustom ? { includeOwnCustom: true } : {}),
        },
      }),
      providesTags: [TAG_TYPES.COMPETENCIES],
    }),

    /**
     * Create a new competency
     */
    createCompetency: builder.mutation<Competency, CreateCompetencyRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCIES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.COMPETENCIES],
    }),

    /**
     * Update an existing competency
     */
    updateCompetency: builder.mutation<Competency, UpdateCompetencyRequest>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCY_BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.COMPETENCIES],
    }),

    /**
     * Delete a competency
     */
    deleteCompetency: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCY_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.COMPETENCIES],
    }),

    /**
     * Get the helpful/unhelpful behaviours mapped to a competency
     */
    getCompetencyBehaviours: builder.query<CompetencyBehavioursResponse, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCY_BEHAVIOURS(id),
        method: HttpMethod.GET,
      }),
      providesTags: [TAG_TYPES.COMPETENCY_BEHAVIOURS],
    }),

    /**
     * Replace the helpful/unhelpful behaviours mapped to a competency
     */
    setCompetencyBehaviours: builder.mutation<
      CompetencyBehavioursResponse,
      SetCompetencyBehavioursRequest
    >({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.COMPETENCY_BEHAVIOURS(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.COMPETENCY_BEHAVIOURS],
    }),

    /**
     * Agent test cases — superadmin-managed list, also consumed by the
     * Agent Builder Copilot V2 wizard.
     */
    getAgentTestCases: builder.query<AgentTestCasesResponse, { search?: string } | void>({
      query: arg => {
        const search = arg ? arg.search : undefined;
        return {
          url: ApiEndpoints.SIMULATION_STUDIO.AGENT_TEST_CASES,
          method: HttpMethod.GET,
          params: search ? { search } : undefined,
        };
      },
      providesTags: [TAG_TYPES.AGENT_TEST_CASES],
    }),

    createAgentTestCase: builder.mutation<AgentTestCase, CreateAgentTestCaseRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.AGENT_TEST_CASES,
        method: HttpMethod.POST,
        body,
      }),
      invalidatesTags: [TAG_TYPES.AGENT_TEST_CASES],
    }),

    updateAgentTestCase: builder.mutation<AgentTestCase, UpdateAgentTestCaseRequest>({
      query: ({ id, data }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.AGENT_TEST_CASE_BY_ID(id),
        method: HttpMethod.PUT,
        body: data,
      }),
      invalidatesTags: [TAG_TYPES.AGENT_TEST_CASES],
    }),

    deleteAgentTestCase: builder.mutation<void, string>({
      query: id => ({
        url: ApiEndpoints.SIMULATION_STUDIO.AGENT_TEST_CASE_BY_ID(id),
        method: HttpMethod.DELETE,
      }),
      invalidatesTags: [TAG_TYPES.AGENT_TEST_CASES],
    }),

    /**
     * Models for the autofill/regenerate/improve dropdown. Served from the
     * universal LLM registry (GET /v1/learn/models), filtered server-side to
     * the providers autofill can execute (OpenAI + Anthropic). Includes
     * `supportsTemperature` per model.
     */
    getAutofillModels: builder.query<AutofillModelOption[], void>({
      query: () => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_AUTOFILL_MODELS,
        method: HttpMethod.GET,
      }),
    }),

    /**
     * Enhance the existing content of a field using AI (preset/custom guidance)
     */
    enhanceField: builder.mutation<EnhanceFieldResponse, EnhanceFieldRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.ENHANCE_FIELD,
        method: HttpMethod.POST,
        body,
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
  useGetSttConfigsQuery,
  useCreateSttConfigMutation,
  useUpdateSttConfigMutation,
  useDeleteSttConfigMutation,
  useGetLlmConfigsQuery,
  useCreateLlmConfigMutation,
  useUpdateLlmConfigMutation,
  useDeleteLlmConfigMutation,
  usePreviewLlmConfigMutation,
  useGetLlmModelCatalogQuery,
  useCreateLlmModelMutation,
  useUpdateLlmModelMutation,
  useDeleteLlmModelMutation,
  useGetScenarioLanguagesQuery,
  useScenarioPreviewMutation,
  useDispatchPreviewAgentMutation,
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
  useGetLlmModelsQuery,
  useGetPromptsByTypeQuery,
  useCreatePromptMutation,
  useUpdatePromptMutation,
  useDuplicatePromptMutation,
  useRevertPromptMutation,
  useDeletePromptMutation,
  useGetPromptUsageQuery,
  useGetPromptTranslationsQuery,
  useRetranslatePromptMutation,
  useRetranslatePromptLanguageMutation,
  useSetTranslationRuntimeModelMutation,
  useBackfillPromptTranslationsMutation,
  useGetLanguageGlossaryQuery,
  useUpsertGlossarySectionMutation,
  usePublishGlossarySectionMutation,
  useArchiveGlossarySectionMutation,
  useGenerateLanguageGlossaryMutation,
  useConsolidateLanguageGlossaryMutation,
  useBackfillLanguageGlossariesMutation,
  useAcceptGlossaryProposalMutation,
  useRejectGlossaryProposalMutation,
  useGetDynamicBranchingInstructionQuery,
  useGetCharactersQuery,
  useGetCharacterByIdQuery,
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useGenerateCoverImageMutation,
  useGetHelperTagsQuery,
  useCreateHelperTagMutation,
  useGetFillerTagsQuery,
  useCreateFillerTagMutation,
  useGetImageLibraryQuery,
  useGetReportsQuery,
  useLazyGetReportsQuery,
  useGetReportByIdQuery,
  useLazyGetReportByIdQuery,
  useGenerateReportMutation,
  useGetScenarioVersionsQuery,
  useLazyGetScenarioVersionsQuery,
  useCreateScenarioVersionMutation,
  useUpdateScenarioVersionMutation,
  usePublishScenarioVersionMutation,
  useDeleteScenarioVersionMutation,
  useCancelReportGenerationMutation,
  useGetCompetenciesQuery,
  useCreateCompetencyMutation,
  useUpdateCompetencyMutation,
  useDeleteCompetencyMutation,
  useGetCompetencyBehavioursQuery,
  useLazyGetCompetencyBehavioursQuery,
  useSetCompetencyBehavioursMutation,
  useGetAgentTestCasesQuery,
  useCreateAgentTestCaseMutation,
  useUpdateAgentTestCaseMutation,
  useDeleteAgentTestCaseMutation,
  useGetReportTranscriptQuery,
  useLazyGetReportTranscriptQuery,
  useGetAutofillModelsQuery,
  useEnhanceFieldMutation,
} = simulationStudioAPI;
