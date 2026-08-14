export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
};

export const DASHBOARD_TABS = {
  ORG_ANALYTICS: "ORG_ANALYTICS",
  CALL_LOG_ANALYTICS: "CALL_LOG_ANALYTICS",
  SIMULATION_ANALYTICS: "SIMULATION_ANALYTICS",
};

export const ApiEndpoints = {
  AUTH: {
    SIGNUP: "/v1/auth/signup",
    LOGIN: "/v1/auth/login",
    GOOGLE_SIGN_IN: "/v1/auth/google",
    GET_USER: "/v1/users/me",
    GENERATE_OTP: "/v2/auth/generate-otp",
    VERIFY_OTP: "/v2/auth/verify-otp",
    MAGIC_LINK_VERIFY: "/v1/auth/magic-link/verify",
    REFRESH: "/v1/auth/refresh",
    PROFILE_IMAGE_URL: "/v1/users/profile-image-url",
    PROFILE_IMAGE: "/v1/users/profile-image",
    GET_USER_IMPERSONATED_TOKENS: "/v1/auth/impersonate",
    GET_USER_PREFERENCES: "/v1/users/me/preferences",
    UPDATE_USER_PREFERENCES: "/v1/users/preferences",
    GET_MY_FEATURE_TOGGLES: "/v1/users/me/feature-toggles",
  },
  AI: {
    GET_PREVIEW_VOICE: (voiceId: string) => `/v1/voice-preview/generate/${voiceId}`,
  },
  SIMULATION_STUDIO: {
    GET_SIMULATIONS: "/v1/learn/admin-scenarios",
    GET_ADMIN_SIMULATION_BY_ID: (id: string) => `/v1/learn/admin-scenarios/${id}`,
    CREATE_SIMULATION: "/v1/learn/scenarios",
    UPDATE_SIMULATION_BY_ID: (id: string | number) => `/v1/learn/scenarios/${id}`,
    SIMULATION_BY_ID: (id: string | number) => `/v1/learn/admin-scenarios/${id}`,
    START_SIMULATION: "/v1/learn/scenario-session-start",
    START_V2V_TEST: "/v1/learn/v2v-test-session-start",
    END_SIMULATION: (sessionId: string) => `/v1/learn/scenario-session/${sessionId}/end`,
    SCENARIO_VOICES: "/v1/learn/scenario-voices",
    CREATE_SCENARIO_VOICE: "/v1/learn/scenario-voices",
    SYNC_ELEVENLABS_VOICE: (id: string) => `/v1/learn/scenario-voices/${id}/sync-elevenlabs`,
    LOOKUP_ELEVENLABS_VOICE: "/v1/learn/scenario-voices/elevenlabs-lookup",
    BULK_SYNC_ELEVENLABS_VOICES: "/v1/learn/scenario-voices/sync-elevenlabs/bulk",
    TTS_CATALOG: "/v1/learn/scenario-voices/tts-catalog",
    UPDATE_SCENARIO_VOICE: (id: string | number) => `/v1/learn/scenario-voices/${id}`,
    SCENARIO_VOICE_LANGUAGES: "/v1/learn/scenario-voice-languages",
    STT_CONFIGS: "/v1/learn/stt-configs",
    UPDATE_STT_CONFIG: (id: string) => `/v1/learn/stt-configs/${id}`,
    LLM_CONFIGS: "/v1/learn/llm-configs",
    PREVIEW_LLM_CONFIG: (id: string) => `/v1/llm-preview/generate/${id}`,
    LLM_MODEL_CATALOG: "/v1/llm/catalog",
    LLM_MODEL_CATALOG_BY_ID: (id: string) => `/v1/llm/catalog/${id}`,
    PREVIEW_LLM_MODEL: (id: string) => `/v1/llm-preview/model/${id}`,
    UPDATE_LLM_CONFIG: (id: string) => `/v1/learn/llm-configs/${id}`,
    SCENARIO_LANGUAGES: "/v1/learn/scenario-languages",
    GET_LANGUAGES: "/v1/language",
    CREATE_LANGUAGE: "/v1/language",
    UPDATE_LANGUAGE: (id: string | number) => `/v1/language/${id}`,
    GET_LANGUAGE_GLOSSARY: (id: string | number) => `/v1/language/${id}/glossary`,
    UPSERT_GLOSSARY_SECTION: (id: string | number, sectionCode: string) =>
      `/v1/language/${id}/glossary/${sectionCode}`,
    PUBLISH_GLOSSARY_SECTION: (id: string | number, sectionCode: string) =>
      `/v1/language/${id}/glossary/${sectionCode}/publish`,
    ARCHIVE_GLOSSARY_SECTION: (id: string | number, sectionCode: string) =>
      `/v1/language/${id}/glossary/${sectionCode}/archive`,
    GENERATE_LANGUAGE_GLOSSARY: (id: string | number) => `/v1/language/${id}/glossary/generate`,
    ACCEPT_GLOSSARY_PROPOSAL: (id: string | number, sectionCode: string, entryId: string) =>
      `/v1/language/${id}/glossary/${sectionCode}/proposals/${entryId}/accept`,
    REJECT_GLOSSARY_PROPOSAL: (id: string | number, sectionCode: string, entryId: string) =>
      `/v1/language/${id}/glossary/${sectionCode}/proposals/${entryId}/reject`,
    CONSOLIDATE_LANGUAGE_GLOSSARY: (id: string | number) =>
      `/v1/language/${id}/glossary/consolidate`,
    BACKFILL_LANGUAGE_GLOSSARIES: "/v1/language/glossary/backfill",
    GET_GLOSSARY_ADHERENCE_OVERVIEW: "/v1/language/glossary/adherence/overview",
    GET_GLOSSARY_ADHERENCE: (id: string | number) => `/v1/language/${id}/glossary/adherence`,
    BACKFILL_GLOSSARY_ADHERENCE: (id: string | number) =>
      `/v1/language/${id}/glossary/adherence/backfill`,
    SESSION_EVENTS: "/v1/session-events",
    GET_SESSION_EVENT_BY_ID: (eventId: string) => `/v1/session-events/events/${eventId}`,
    UPDATE_SESSION_EVENT: (eventId: string) => `/v1/session-events/events/${eventId}`,
    DELETE_SESSION_EVENTS: "/v1/session-events/events",
    GET_COVER_IMAGE_URL: "/v1/learn/scenarios/cover-image-url",
    DELETE_COVER_IMAGE: "/v1/learn/cover-image",
    GET_COVER_VIDEO_URL: "/v1/learn/scenarios/cover-video-url",
    DELETE_COVER_VIDEO: "/v1/learn/cover-video",
    MAP_SCENARIO_EVENTS: "/v1/learn/scenarios/map-events",
    GET_MAPPED_SCENARIO_EVENTS: (id: number | string) => `/v1/learn/scenarios/${id}/events`,
    SCENARIO_EVENTS: "/v1/learn/scenarios/events",
    SCENARIO_PREVIEW: "/v1/learn/scenarios/preview",
    DISPATCH_PREVIEW_AGENT: "/v1/learn/scenarios/preview/dispatch-agent",
    END_SCENARIO_PREVIEW: (sessionId: number | string) =>
      `/v1/learn/scenarios/preview/${sessionId}/end`,
    SIMULATION_TENANT_VISIBILITY: (tenantId: string) => `v1/learn/scenario/tenant/${tenantId}`,
    CASE_TENANT_VISIBILITY: (tenantId: string) => `v1/learn/admin/cases/tenant/${tenantId}`,
    SCENARIO_PATHS: "v1/learn/admin/scenario-paths",
    SCENARIO_PATH_BY_ID: (id: string | number) => `/v1/learn/admin/scenario-paths/${id}`,
    DUPLICATE_SCENARIO_PATH: (id: string | number) =>
      `/v1/learn/admin/scenario-paths/${id}/duplicate`,
    DUPLICATE_SIMULATION: (id: string | number) => `/v1/learn/scenarios/${id}/duplicate`,
    PATH_TENANT_VISIBILITY: (tenantId: string | number) =>
      `v1/learn/admin/scenario-paths/tenant/${tenantId}`,
    TRIGGER_WARNINGS: "/v1/learn/trigger-warnings",
    POST_LOGO_URL: "v1/tenants/logo-url",
    DELETE_LOGO: "v1/tenants/logo",
    DYNAMIC_BRANCHING_INSTRUCTIONS: "/v1/learn/branching-instruction-dynamic-shortcuts",
    SESSION_EVENT_TAGS: "/v1/session-events/tags",
    SCENARIO_CASES: "/v1/learn/admin/cases",
    SCENARIO_CASE_BY_ID: (id: string | number) => `/v1/learn/admin/cases/${id}`,
    DUPLICATE_SCENARIO_CASE: (id: string | number) => `/v1/learn/admin/cases/${id}/duplicate`,
    UPDATE_SIMULATION_CASE_BY_ID: (id: string | number) => `/v1/learn/admin/cases/${id}`,
    GET_PROMPTS: "/v1/prompts",
    GET_PROMPTS_BY_TYPE: (promptType: string) => `/v1/prompts/by-type/${promptType}`,
    CREATE_PROMPT: "/v1/prompts",
    UPDATE_PROMPT: (id: string | number) => `/v1/prompts/${id}`,
    DUPLICATE_PROMPT: (id: string | number) => `/v1/prompts/${id}/duplicate`,
    REVERT_PROMPT: (id: string | number) => `/v1/prompts/${id}/revert`,
    GET_PROMPT_USAGE: (id: string | number) => `/v1/prompts/${id}/usage`,
    GET_PROMPT_TRANSLATIONS: (id: string | number) => `/v1/prompts/${id}/translations`,
    RETRANSLATE_PROMPT: (id: string | number) => `/v1/prompts/${id}/translations`,
    RETRANSLATE_PROMPT_LANGUAGE: (id: string | number, languageId: string | number) =>
      `/v1/prompts/${id}/translations/${languageId}`,
    SET_TRANSLATION_RUNTIME_MODEL: (id: string | number, languageId: string | number) =>
      `/v1/prompts/${id}/translations/${languageId}/runtime-model`,
    BACKFILL_PROMPT_TRANSLATIONS: "/v1/prompts/translations/backfill",
    GET_LLM_MODELS: "/v1/llm/models",
    GET_REPORT_BY_ID: (reportId: string) => `/v1/learn/scenarios/reports/${reportId}`,
    GET_REPORTS: (scenarioId: string) => `/v1/learn/scenarios/${scenarioId}/reports`,
    GENERATE_REPORT: (scenarioId: string) => `/v1/learn/scenarios/${scenarioId}/reports`,
    SCENARIO_VERSIONS: (scenarioId: string | number) =>
      `/v1/learn/scenarios/${scenarioId}/versions`,
    SCENARIO_VERSION_BY_ID: (scenarioId: string | number, versionId: string) =>
      `/v1/learn/scenarios/${scenarioId}/versions/${versionId}`,
    PUBLISH_SCENARIO_VERSION: (scenarioId: string | number, versionId: string) =>
      `/v1/learn/scenarios/${scenarioId}/versions/${versionId}/publish`,
    CANCEL_REPORT_GENERATION: (reportId: string) =>
      `/v1/learn/scenarios/reports/${reportId}/cancel`,
    GET_REPORT_TRANSCRIPT: (reportId: string) =>
      `/v1/learn/scenarios/reports/${reportId}/transcripts`,
    SCENARIO_COVER_IMAGE_LIBRARY: "/v1/scenario-cover-image-library",
    GENERATE_COVER_IMAGE: "/v1/scenario-cover-image-library/generate",
    COMFORT_AUDIO_LIBRARY: "/v1/comfort-audio",
    COMFORT_AUDIO_UPLOAD_URL: "/v1/comfort-audio/upload-url",
    COMFORT_AUDIO_BY_ID: (id: string) => `/v1/comfort-audio/${id}`,
    CONVERSATIONAL_GUARDRAILS: "/v1/learn/conversational-guardrails",
    HELPER_TAGS: "/v1/learn/scenario-behaviors",
    FILLER_TAGS: "/v1/learn/filler-tags",
    GET_AUTOFILL_MODELS: "/v1/learn/models",
    ENHANCE_FIELD: "/v1/learn/scenarios/enhance-field",
    GENERATE_AGENT_BUILDER_FIELD: "/v1/learn/agent-builder/generate-field",
    COMPETENCIES: "/v1/learn/competencies",
    COMPETENCY_BY_ID: (id: string) => `/v1/learn/competencies/${id}`,
    COMPETENCY_BEHAVIOURS: (id: string) => `/v1/learn/competencies/${id}/behaviours`,
    AGENT_TEST_CASES: "/v1/learn/agent-test-cases",
    AGENT_TEST_CASE_BY_ID: (id: string) => `/v1/learn/agent-test-cases/${id}`,
  },

  // Track 2.0 ("Courses") — multi-component learning tracks
  TRACKS: {
    LIST: "/v1/learn/admin/tracks",
    BY_ID: (id: string) => `/v1/learn/admin/tracks/${id}`,
    STRUCTURE: (id: string) => `/v1/learn/admin/tracks/${id}/structure`,
    DUPLICATE: (id: string) => `/v1/learn/admin/tracks/${id}/duplicate`,
    TENANT_VISIBILITY: (tenantId: string) => `/v1/learn/admin/tracks/tenant/${tenantId}`,
    MEDIA_UPLOAD_URL: "/v1/learn/admin/tracks/media/upload-url",
    MEDIA: "/v1/learn/admin/tracks/media",
  },

  CHARACTERS: {
    GET_CHARACTERS: "/v1/scenario-characters",
    CREATE_CHARACTER: "/v1/scenario-characters",
    GET_CHARACTER_BY_ID: (id: string) => `/v1/scenario-characters/${id}`,
    UPDATE_CHARACTER: (id: string) => `/v1/scenario-characters/${id}`,
    DELETE_CHARACTER: "/v1/scenario-characters",
    // Interview agent (SSE chat that builds a character draft).
    INTERVIEW_SESSIONS: "/v1/scenario-characters/interview/sessions",
    INTERVIEW_SESSION: (sessionId: string) =>
      `/v1/scenario-characters/interview/sessions/${sessionId}`,
    INTERVIEW_SESSION_STREAM: (sessionId: string) =>
      `/v1/scenario-characters/interview/sessions/${sessionId}/messages/stream`,
  },

  USER_MANAGEMENT: {
    USERS: "/v1/users",
    TENANT: "/v1/tenant",
    TENANTS: "/v1/tenants",
    TENANTS_BY_ID: (id: string) => `/v1/tenants/${id}`,
    ADD_USER: "/v1/users",
    BULK_ADD_USERS: "/v1/users/bulk",
    SIMULATION_CREDITS: "/v1/simulation-credits",
    SUMMARY_SECTIONS: `/v1/settings/summary-sections`,
    SUMMARY_FIELDS: `/v1/settings/summary-fields`,
    DASHBOARD_SETTINGS_ALL: `/v1/analytics/dashboard/all`,
    CUSTOM_FIELD_TYPES: `/v1/settings/custom-field-types`,
    CUSTOM_FIELDS_ENABLED: `/v1/settings/custom-fields-enabled`,
    SCRIBE_NOTE_CREATION_ENABLED: `/v1/settings/scribe-note-creation-enabled`,
    SCRIBE_VOICE_NOTE_ENABLED: `/v1/settings/scribe-voice-note-enabled`,
    CUSTOM_FIELD_DEFINITIONS: `/v1/custom-fields/definitions`,
    CUSTOM_FIELD_DEFINITION_BY_ID: (id: string) => `/v1/custom-fields/definitions/${id}`,
    USER_ADMIN_TENANTS: (userId: number) => `/v1/users/${userId}/admin-tenants`,
    ADMIN_TENANTS: "/v1/users/admin-tenants",
    // One PLATFORM_ADMIN's full toggle state; same URL for the GET (list) and
    // the PATCH (batch upsert).
    USER_FEATURE_TOGGLES: (userId: number) => `/v1/users/${userId}/feature-toggles`,
  },
  PLATFORM_ADMINS: {
    LIST: "/v1/platform-admins",
    ELIGIBLE: "/v1/platform-admins/eligible",
    ASSIGN: "/v1/platform-admins",
    REMOVE: (userId: number) => `/v1/platform-admins/${userId}`,
  },
  SUPER_DUPER_ADMINS: {
    LIST: "/v1/super-duper-admins",
    ELIGIBLE: "/v1/super-duper-admins/eligible",
    PROMOTE: "/v1/super-duper-admins",
    DEMOTE: (userId: number) => `/v1/super-duper-admins/${userId}`,
    // Super-admin management (same SDA-only surface): list/add/remove
    // SUPER_ADMINs and list candidates eligible to become one.
    SUPER_ADMINS_LIST: "/v1/super-duper-admins/super-admins",
    SUPER_ADMINS_ELIGIBLE: "/v1/super-duper-admins/super-admins/eligible",
    SUPER_ADMINS_PROMOTE: "/v1/super-duper-admins/super-admins",
    SUPER_ADMINS_REMOVE: (userId: number) => `/v1/super-duper-admins/super-admins/${userId}`,
  },
  USER_BADGES: {
    GET_BADGES: "/v1/badges",
    UPLOAD_BADGE_ICON: "/v1/badges/badge-image-url",
    DELETE_BADGE_ICON: `/v1/badges/badge-image`,
    CREATE_BADGE: "/v1/badges",
    UPDATE_BADGE: (id: string) => `/v1/badges/${id}`,
    DELETE_BADGE: (id: string) => `/v1/badges/${id}`,
    BATCH_DELETE_BADGES: "/v1/badges/batch",
    BADGES_TENANT_VISIBILITY: (tenantId: string) => `/v1/badges/tenants/${tenantId}`,
    ADD_BADGES_TO_TENANT: "/v1/badges/tenants",
    REMOVE_BADGES_FROM_TENANT: "/v1/badges/tenants",
  },
  I18N: {
    STATUS: "/v1/i18n/status",
    TRANSLATIONS: "/v1/i18n/translations",
    DIFF: "/v1/i18n/diff",
    PUBLISH: "/v1/i18n/publish",
    ROLLBACK: "/v1/i18n/rollback",
    AUDIT_LOG: "/v1/i18n/audit-log",
  },
  TOOLTIPS: {
    GET_TOOLTIPS: "/v1/tooltips",
    GET_ACTIVE_TOOLTIPS: "/v1/tooltips/active",
    CREATE_TOOLTIP: "/v1/tooltips",
    UPDATE_TOOLTIP: (id: string) => `/v1/tooltips/${id}`,
  },
  BLOG: {
    GET_BLOGS: "/v1/blog",
    GET_BLOG: (id: string) => `/v1/blog/${id}`,
    CREATE_BLOG: "/v1/blog",
    UPDATE_BLOG: (id: string) => `/v1/blog/${id}`,
    DELETE_BLOG: (id: string) => `/v1/blog/${id}`,
    PUBLISH_BLOG: (id: string) => `/v1/blog/${id}/publish`,
    UNPUBLISH_BLOG: (id: string) => `/v1/blog/${id}/unpublish`,
    UPLOAD_IMAGE_URL: "/v1/blog/upload-url",
  },
  PRODUCT_ROADMAP: {
    OPPORTUNITIES: "/v1/product-roadmap/opportunities",
    OPPORTUNITY_BY_ID: (id: string) => `/v1/product-roadmap/opportunities/${id}`,
    OPPORTUNITY_SPLIT: (id: string) => `/v1/product-roadmap/opportunities/${id}/split`,
    OPPORTUNITY_MERGE: "/v1/product-roadmap/opportunities/merge",
    OPPORTUNITY_COMMENTS: (id: string) => `/v1/product-roadmap/opportunities/${id}/comments`,
    COMMENT_BY_ID: (id: string) => `/v1/product-roadmap/comments/${id}`,
    ALLOCATIONS: "/v1/product-roadmap/allocations",
    COIN_BUDGET: "/v1/product-roadmap/me/coin-budget",
    FACETS: "/v1/product-roadmap/facets",
    PRODUCT_GOALS: "/v1/product-roadmap/product-goals",
    PRODUCT_GOAL_BY_ID: (id: string) => `/v1/product-roadmap/product-goals/${id}`,
    PRODUCT_GOALS_ORDER: "/v1/product-roadmap/product-goals/order",
    PRODUCT_GOALS_USAGE: "/v1/product-roadmap/product-goals/usage",
    OWNERS: "/v1/product-roadmap/opportunity-owners",
    OWNERS_ELIGIBLE: "/v1/product-roadmap/opportunity-owners/eligible",
    OWNER_BY_ID: (id: string) => `/v1/product-roadmap/opportunity-owners/${id}`,
    OWNERS_ORDER: "/v1/product-roadmap/opportunity-owners/order",
    OWNERS_USAGE: "/v1/product-roadmap/opportunity-owners/usage",
    INTERVIEW_NOTES: "/v1/product-roadmap/interview-notes",
    INTERVIEW_NOTE_BY_ID: (id: string) => `/v1/product-roadmap/interview-notes/${id}`,
    RELEASE_NOTES: "/v1/product-roadmap/release-notes",
    RELEASE_NOTE_BY_ID: (id: string) => `/v1/product-roadmap/release-notes/${id}`,
    VIEWS: "/v1/product-roadmap/views",
    VIEW_BY_ID: (id: string) => `/v1/product-roadmap/views/${id}`,
    VIEW_PIN: (id: string) => `/v1/product-roadmap/views/${id}/pin`,
    VIEW_TAB_ORDER: "/v1/product-roadmap/views/tab-order",
    AI_REVIEW: "/v1/product-roadmap/ai/review",
    AI_ENHANCE: "/v1/product-roadmap/ai/enhance",
    AI_DUPLICATES: "/v1/product-roadmap/ai/duplicates",
    AI_CLASSIFY: "/v1/product-roadmap/ai/classify",
    AI_SUMMARISE: "/v1/product-roadmap/ai/summarise",
    AI_RELEASE_NOTES: "/v1/product-roadmap/ai/release-notes",
    AI_GENERATE_CLAUDE_PROMPT: "/v1/product-roadmap/ai/generate-claude-prompt",
    ADMIN_REINDEX: "/v1/product-roadmap/admin/reindex",
  },
  AI_LAB: {
    SKILLS: "/v1/lab/skills",
    SKILL_BY_ID: (id: string) => `/v1/lab/skills/${id}`,
    VARIABLES: "/v1/lab/variables",
    VARIABLE_BY_ID: (id: string) => `/v1/lab/variables/${id}`,
    VALUES: "/v1/lab/values",
    VALUE_BY_ID: (id: string) => `/v1/lab/values/${id}`,
    RUNS: "/v1/lab/runs",
    RUN_BY_ID: (id: string) => `/v1/lab/runs/${id}`,
    RUN_PUBLISH: (id: string) => `/v1/lab/runs/${id}/publish`,
    RUN_QUESTIONS: (id: string) => `/v1/lab/runs/${id}/questions`,
    RUN_ASSIGNMENTS: (id: string) => `/v1/lab/runs/${id}/assignments`,
    RUN_RESULTS: (id: string) => `/v1/lab/runs/${id}/results`,
    RUN_AUTO_EVALUATIONS: (id: string) => `/v1/lab/runs/${id}/auto-evaluations`,
    ASSIGNMENT_BY_ID: (id: string) => `/v1/lab/runs/assignments/${id}`,
    EVALUATORS: "/v1/lab/evaluators",
    EVALUATOR_BY_ID: (id: string) => `/v1/lab/evaluators/${id}`,
    EVALUATOR_REGENERATE_PASSWORD: (id: string) => `/v1/lab/evaluators/${id}/regenerate-password`,
    // Evaluator portal (the /evaluate micro-app; evaluator JWT, not admin)
    EVAL_LOGIN: "/v1/lab/eval/login",
    EVAL_ASSIGNMENTS: "/v1/lab/eval/assignments",
    EVAL_ASSIGNMENT_BY_ID: (id: string) => `/v1/lab/eval/assignments/${id}`,
    EVAL_ASSIGNMENT_SUBMIT: (id: string) => `/v1/lab/eval/assignments/${id}/submit`,
    // Question Sets (reusable human-eval question lists)
    QUESTION_SETS: "/v1/lab/question-sets",
    QUESTION_SET_BY_ID: (id: string) => `/v1/lab/question-sets/${id}`,
    QUESTION_SET_PUBLISH: (id: string) => `/v1/lab/question-sets/${id}/publish`,
    QUESTION_SET_ARCHIVE: (id: string) => `/v1/lab/question-sets/${id}/archive`,
  },
  AUTHORIZATION: {
    GET_PERMISSIONS: "/v1/authorization/permissions",
    GET_ROLES: "/v1/authorization/roles",
    CHANGE_USER_ROLES: "/v1/authorization/change-roles",
    // Full feature-toggle registry (~24 keys, with labels/descriptions) — the
    // one place a new toggle key is declared. Drives both the nav-gating map
    // and the toggle-editor UI.
    GET_FEATURE_TOGGLE_REGISTRY: "/v1/authorization/feature-toggles/registry",
  },
  ANALYTICS: {
    OVERVIEW: "/v1/analytics/overview",
    HIGHLIGHTS: "/v1/analytics/highlights",
    COHORT_RETENTION: "/v1/analytics/cohort-retention",
    USAGE_LEVELS: "/v1/analytics/usage-levels",
    ROLEPLAY_VOLUME: "/v1/analytics/roleplay-volume",
    ROADMAP_DELIVERY: "/v1/analytics/roadmap-delivery",
    VOICE_LATENCY: "/v1/analytics/voice-latency",
    VOICE_LATENCY_SESSIONS: "/v1/analytics/voice-latency/sessions",
    VOICE_LATENCY_SESSIONS_SUMMARY: "/v1/analytics/voice-latency/sessions/summary",
    AGENT_JOIN_RELIABILITY: "/v1/analytics/agent-join-reliability",
    START_LATENCY: "/v1/analytics/start-latency",
    CONVERSATION_DRIFT: "/v1/analytics/conversation-drift",
    CONVERSATION_DRIFT_BACKFILL: "/v1/analytics/conversation-drift/backfill",
    LANGUAGE_QUALITY: "/v1/analytics/language-quality",
    LANGUAGE_QUALITY_REFERENCE: "/v1/analytics/language-quality/reference",
    TOKEN_CONSUMPTION: "/v1/analytics/token-consumption",
    SCRIBE_OVERVIEW: "/v1/analytics/scribe/overview",
    SCRIBE_SUMMARY_FAILURES: "/v1/analytics/scribe/summary-failures",
    // Endpoints behind the Testing tab. Named for what they measure, not for the
    // tab: charts graduate from Testing onto Highlights (or are cut), and an
    // endpoint called /testing would have to be renamed the day one moved.
    ACTIVATION: "/v1/analytics/activation",
    COMPLETION_RATE: "/v1/analytics/completion-rate",
    LANGUAGE_MIX: "/v1/analytics/language-mix",
    SKILL_GROWTH: "/v1/analytics/skill-growth",
    QUALITY_DISTRIBUTION: "/v1/analytics/quality-distribution",
    COMPETENCY_MAP: "/v1/analytics/competency-map",
    TRACK_DROPOFF: "/v1/analytics/track-dropoff",
    COACHING_LOOP: "/v1/analytics/coaching-loop",
    ORG_HEALTH: "/v1/analytics/org-health",
    ORG_SESSION_DISTRIBUTION: "/v1/analytics/org-session-distribution",
    LEARNER_KPIS: "/v1/analytics/learner-kpis",
    SCENARIO_USAGE: "/v1/analytics/scenario-usage",
    SCRIBE_ADOPTION: "/v1/analytics/scribe-adoption",
  },
  // The Analytics Agent's own namespace, not another entry under ANALYTICS: it
  // is gated on the elevated super-duper-admin tier rather than on the pair of
  // super-admin roles the rest of the analytics endpoints accept.
  ANALYTICS_AGENT: {
    ASK: "/v1/analytics/agent/ask",
    CATALOG: "/v1/analytics/agent/catalog",
  },
  // Analytics Suggestions — its own namespace for the same reason as the agent's:
  // the elevated super-duper-admin tier, because accepting a suggestion writes
  // onto the product roadmap rather than only reading a chart.
  ANALYTICS_SUGGESTIONS: {
    LIST: "/v1/analytics/suggestions",
    GENERATE: "/v1/analytics/suggestions/generate",
    ACCEPT: (id: string) => `/v1/analytics/suggestions/${id}/accept`,
    REJECT: (id: string) => `/v1/analytics/suggestions/${id}/reject`,
  },
  BUG_HUNTER: {
    SETTINGS: "/v1/bug-hunter/settings",
    RUNS: "/v1/bug-hunter/runs",
    RUN_BY_ID: (id: string) => `/v1/bug-hunter/runs/${id}`,
    RUN_STREAM: (id: string) => `/v1/bug-hunter/runs/${id}/stream`,
    FINDINGS: "/v1/bug-hunter/findings",
    FINDING_BY_ID: (id: string) => `/v1/bug-hunter/findings/${id}`,
    FINDING_APPROVE: (id: string) => `/v1/bug-hunter/findings/${id}/approve`,
    FINDING_REJECT: (id: string) => `/v1/bug-hunter/findings/${id}/reject`,
    FINDING_ANSWER: (id: string) => `/v1/bug-hunter/findings/${id}/answer`,
  },
  WHATSAPP_BOT: {
    // Corpus (ally-be src/knowledge-base)
    DOCUMENTS: "/v1/knowledge-base/documents",
    DOCUMENT_UPLOAD_URL: "/v1/knowledge-base/documents/upload-url",
    DOCUMENT_BY_ID: (id: string) => `/v1/knowledge-base/documents/${id}`,
    DOCUMENT_CONTENT: (id: string) => `/v1/knowledge-base/documents/${id}/content`,
    DOCUMENT_CHUNKS: (id: string) => `/v1/knowledge-base/documents/${id}/chunks`,
    DOCUMENT_REINDEX: (id: string) => `/v1/knowledge-base/documents/${id}/reindex`,
    DOCUMENT_ARCHIVE: (id: string) => `/v1/knowledge-base/documents/${id}/archive`,
    DOCUMENT_UNARCHIVE: (id: string) => `/v1/knowledge-base/documents/${id}/unarchive`,
    CHUNK_BY_ID: (chunkId: string) => `/v1/knowledge-base/chunks/${chunkId}`,
    SEARCH: "/v1/knowledge-base/search",
    STATS: "/v1/knowledge-base/stats",
    // Bot (ally-be src/whatsapp)
    TEMPLATES: "/v1/whatsapp/templates",
    TEMPLATE_BY_ID: (id: string) => `/v1/whatsapp/templates/${id}`,
    TEMPLATE_ARCHIVE: (id: string) => `/v1/whatsapp/templates/${id}/archive`,
    TEMPLATES_REORDER: "/v1/whatsapp/templates/reorder",
    TEMPLATES_TEST: "/v1/whatsapp/templates/test",
    SETTINGS: "/v1/whatsapp/settings",
    PROVIDER_HEALTH: "/v1/whatsapp/settings/provider-health",
    PREVIEW_ASK: "/v1/whatsapp/preview/ask",
    // Conversations, unanswered queue and usage dashboard
    CONVERSATIONS: "/v1/whatsapp/conversations",
    CONVERSATION_BY_ID: (id: string) => `/v1/whatsapp/conversations/${id}`,
    CONVERSATION_LANGUAGES: "/v1/whatsapp/conversations/languages",
    CITATION_BY_CHUNK: (chunkId: string) => `/v1/whatsapp/citations/${chunkId}`,
    CONTACT_REVEAL: (id: string) => `/v1/whatsapp/contacts/${id}/reveal`,
    CONTACT_BLOCK: (id: string) => `/v1/whatsapp/contacts/${id}/block`,
    CONTACT_UNBLOCK: (id: string) => `/v1/whatsapp/contacts/${id}/unblock`,
    UNANSWERED: "/v1/whatsapp/unanswered",
    UNANSWERED_BY_ID: (id: string) => `/v1/whatsapp/unanswered/${id}`,
    UNANSWERED_CREATE_DOCUMENT: (id: string) => `/v1/whatsapp/unanswered/${id}/create-document`,
    ANALYTICS_OVERVIEW: "/v1/whatsapp/analytics/overview",
    ANALYTICS_TIMESERIES: "/v1/whatsapp/analytics/timeseries",
    ANALYTICS_LANGUAGES: "/v1/whatsapp/analytics/languages",
    ANALYTICS_CORPUS_COVERAGE: "/v1/whatsapp/analytics/corpus-coverage",
  },
  ROLEPLAY_SESSION_LOGS: {
    LIST: "/v1/roleplay-session-logs",
    BY_ID: (id: string) => `/v1/roleplay-session-logs/${id}`,
  },
  AWS_LOGS: {
    LIST: "/v1/aws-logs",
    STREAMS: "/v1/aws-logs/streams",
  },
  SETTINGS: {
    TERMS: "/v1/settings/terms",
    PRIVACY: "/v1/settings/privacy",
  },
  ROLEPLAY_STUDIO: {
    SPECS: "/v1/roleplay-studio/specs",
    SPEC_BY_ID: (specId: string) => `/v1/roleplay-studio/specs/${specId}`,
    SPEC_VERSIONS: (specId: string) => `/v1/roleplay-studio/specs/${specId}/versions`,
    // Draft saves are spec-scoped: the draft lives on the spec row and the
    // backend appends an immutable version snapshot on every save.
    SAVE_DRAFT: (specId: string) => `/v1/roleplay-studio/specs/${specId}/draft`,
    PUBLISH_VERSION: (specId: string, versionId: string) =>
      `/v1/roleplay-studio/specs/${specId}/versions/${versionId}/publish`,
    // specId travels in the POST body (backend DTO), not the URL.
    CREATE_COPILOT_SESSION: `/v1/roleplay-studio/copilot/sessions`,
    COPILOT_SESSIONS: `/v1/roleplay-studio/copilot/sessions`,
    COPILOT_SESSION: (sessionId: string) => `/v1/roleplay-studio/copilot/sessions/${sessionId}`,
    COPILOT_SESSION_MESSAGES: (sessionId: string) =>
      `/v1/roleplay-studio/copilot/sessions/${sessionId}/messages`,
    COPILOT_SESSION_STREAM: (sessionId: string) =>
      `/v1/roleplay-studio/copilot/sessions/${sessionId}/messages/stream`,
    CREATE_SESSION: (specId: string, versionId: string) =>
      `/v1/roleplay-studio/specs/${specId}/versions/${versionId}/sessions`,
    SESSION_DIRECTOR_EVENTS: (sessionId: string) =>
      `/v1/roleplay-studio/sessions/${sessionId}/director-events`,
    SESSION_RUBRIC_SCORES: (sessionId: string) =>
      `/v1/roleplay-studio/sessions/${sessionId}/rubric-scores`,
    // Improve: test-case-driven test runs + per-case reports.
    TEST_RUNS: (specId: string) => `/v1/roleplay-studio/specs/${specId}/test-runs`,
    TEST_REPORTS: (specId: string) => `/v1/roleplay-studio/specs/${specId}/test-reports`,
    TEST_REPORT_BY_ID: (reportId: string) => `/v1/roleplay-studio/test-reports/${reportId}`,
    TEST_RUN_CANCEL: (runId: string) => `/v1/roleplay-studio/test-runs/${runId}/cancel`,
  },
};

export const ROUTES = {
  LOGIN: "/login",
  MAGIC_VERIFY: "/auth/verify",
  SIMULATION_STUDIO: "/simulation-studio",
  USER_MANAGEMENT: "/user-management",
  MANAGE_EVENTS: "/manage-events",
  CHARACTER_LIBRARY: "/character-library",
  CHARACTER_LIBRARY_INTERVIEW: "/character-library/interview",
  MANAGE_SCENARIO_VOICES: "/manage-scenario-voices",
  MANAGE_STT_CONFIGS: "/manage-stt-configs",
  MANAGE_LLM_CONFIGS: "/manage-llm-configs",
  MANAGE_LLM_MODEL_CATALOG: "/manage-llm-model-catalog",
  MANAGE_SCENARIO_LANGUAGES: "/manage-scenario-languages",
  MANAGE_LANGUAGE_GLOSSARY: (id: string | number) => `/manage-scenario-languages/${id}/glossary`,
  MANAGE_PROMPTS: "/manage-prompts",
  CREATE_SIMULATION: "/create-simulation",
  SIMULATION_PREVIEW: (id: string | number) => `/simulation-preview/${id}`,
  EDIT_SIMULATION: (id: string | number) => `/create-simulation/edit/${id}`,
  VIEW_SIMULATION: (id: string | number) => `/create-simulation/view/${id}`,
  ORGANIZATION_DETAIL: (id: string | number) => `/user-management/organization/${id}`,
  CREATE_PATH: "/create-path",
  EDIT_PATH: (id: string | number) => `/create-path/edit/${id}`,
  CREATE_CASE: "/create-case",
  CREATE_TRACK: "/create-track",
  EDIT_TRACK: (id: string | number) => `/edit-track/${id}`,
  USER_BADGES: "/user-badges",
  MANAGE_GUARDRAILS: "/manage-guardrails",
  EDIT_CASE: (id: string | number) => `/create-case/edit/${id}`,
  MANAGE_TRANSLATIONS: "/manage-translations",
  MANAGE_TOOLTIPS: "/manage-tooltips",
  ANALYTICS: "/analytics",
  AGENT_TEST_CASES: "/agent-test-cases",
  COMPETENCIES: "/competencies",
  ROLEPLAY_SESSION_LOGS: "/roleplay-session-logs",
  ROLEPLAY_SESSION_LOG_DETAIL: (id: string | number) => `/roleplay-session-logs/${id}`,
  SETTINGS: "/settings",
  LOGS: "/logs",
  WHATSAPP_BOT: "/whatsapp-bot",
  TERMS: "/terms",
  PRIVACY: "/privacy",
  // Fully public, no-login gallery of the centralised design-system components.
  DESIGN_SYSTEM: "/designsystem",
  ROLEPLAY_STUDIO: "/roleplay-studio",
  ROLEPLAY_STUDIO_NEW: "/roleplay-studio/new",
  ROLEPLAY_STUDIO_SPEC: (specId: string | number) => `/roleplay-studio/${specId}`,
  ROLEPLAY_STUDIO_PREVIEW: (id: string | number) => `/roleplay-studio/preview/${id}`,
  BLOG: "/blog",
  AI_LAB: "/ai-lab",
  PRODUCT_ROADMAP: "/product-roadmap",
  BUG_HUNTER: "/bug-hunter",
  // Evaluator micro-app (public routes; evaluator email+password auth)
  EVALUATE: "/evaluate",
  EVALUATE_RECORDS: "/evaluate/records",
  EVALUATE_RECORD: (assignmentId: string | number) => `/evaluate/records/${assignmentId}`,
};

export const LOCAL_STORAGE_KEYS = {
  ADMIN_ACCESS_TOKEN: "adminAccessToken",
  ADMIN_REFRESH_TOKEN: "adminRefreshToken",
  ADMIN_USER_STATUS: "adminUserStatus",
  ADMIN_IS_AUTHENTICATED: "adminIsAuthenticated",
  PREVIEW_ROOM_DATA: "previewRoomData",
  ROLEPLAY_PREVIEW_ROOM_DATA: "roleplayPreviewRoomData",
  // Evaluator micro-app session (separate from the admin session)
  EVALUATOR_ACCESS_TOKEN: "evaluatorAccessToken",
  EVALUATOR_EMAIL: "evaluatorEmail",
  EVALUATOR_ID: "evaluatorId",
  // Prefix — the copilot session id is stored per spec as `${prefix}:${specId}`
  // so a page refresh can resume the same interview session.
  ROLEPLAY_COPILOT_SESSION_PREFIX: "roleplayCopilotSession",
  // The character-interview-agent session id, so a page refresh mid-interview
  // resumes the same conversation instead of silently starting a new one.
  CHARACTER_INTERVIEW_SESSION_ID: "characterInterviewSessionId",
};

export enum KeyboardKeys {
  KEYDOWN = "keydown",
  BACKSPACE = "Backspace",
  ARROW_LEFT = "ArrowLeft",
  ARROW_RIGHT = "ArrowRight",
  ARROW_UP = "ArrowUp",
  ARROW_DOWN = "ArrowDown",
  ENTER = "Enter",
  ESCAPE = "Escape",
  TAB = "Tab",
  DELETE = "Delete",
  SPACE = " ",
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const SINGLE_DIGIT_REGEX = /^\d$/;

export const ALLY_URL = "https://www.helloally.ai";
// In-app legal pages (see ROUTES.TERMS / ROUTES.PRIVACY). Opened in a new tab
// via openLinkInNewTab, which resolves the relative path against this origin.
export const ALLY_TERMS_URL = "/terms";
export const ALLY_PRIVACY_POLICY_URL = "/privacy";
export const ALLY_DATA_POLICY_URL = "/privacy";

export const SORT_BY = {
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
};

export const SORT_ORDER = {
  ASC: "ASC",
  DESC: "DESC",
};

export const INITIAL_EVENTS_LIMIT = 30;

export const TAG_TYPES = {
  USERS: "users",
  TENANTS: "tenants",
  SESSION_EVENTS: "sessionEvents",
  SESSION_EVENT_TAGS: "sessionEventTags",
  SIMULATION: "simulation",
  SCENARIO_VERSIONS: "scenarioVersions",
  SIMULATION_EVENTS: "simulationEvents",
  SIMULATION_PATHS: "simulationPaths",
  SCENARIO_PATHS: "scenarioPaths",
  EACH_SESSION: "eachSession",
  SIMULATION_CASES: "simulationCases",
  TRIGGER_WARNINGS: "triggerWarnings",
  SCENARIO_VOICES: "scenarioVoices",
  STT_CONFIGS: "sttConfigs",
  LLM_CONFIGS: "llmConfigs",
  LLM_MODEL_CATALOG: "llmModelCatalog",
  LLM_MODELS: "llmModels",
  SCENARIO_LANGUAGES: "scenarioLanguages",
  LANGUAGE_GLOSSARY: "languageGlossary",
  GLOSSARY_ADHERENCE: "glossaryAdherence",
  SUMMARY_SECTIONS: "summarySections",
  UPDATE_SUMMARY_SECTIONS: "updateSummarySections",
  CUSTOM_FIELD_TYPES: "customFieldTypes",
  CUSTOM_FIELDS_ENABLED: "customFieldsEnabled",
  SCRIBE_NOTE_CREATION_ENABLED: "scribeNoteCreationEnabled",
  SCRIBE_VOICE_NOTE_ENABLED: "scribeVoiceNoteEnabled",
  CUSTOM_FIELD_DEFINITIONS: "customFieldDefinitions",
  CHARACTERS: "characters",
  IMAGE_LIBRARY: "imageLibrary",
  PROMPTS: "prompts",
  CONVERSATIONAL_GUARDRAILS: "conversationalGuardrails",
  USER_BADGES: "userBadges",
  I18N_TRANSLATIONS: "i18nTranslations",
  TOOLTIPS: "tooltips",
  HELPER_TAGS: "helperTags",
  FILLER_TAGS: "fillerTags",
  COMPETENCIES: "competencies",
  COMPETENCY_BEHAVIOURS: "competencyBehaviours",
  AGENT_TEST_CASES: "agentTestCases",
  ADMIN_TENANTS: "adminTenants",
  SETTINGS: "settings",
  USER_PREFERENCES: "userPreferences",
  ROLEPLAY_SESSION_LOGS: "roleplaySessionLogs",
  ROLEPLAY_SPECS: "roleplaySpecs",
  ROLEPLAY_SPEC_VERSIONS: "roleplaySpecVersions",
  ROLEPLAY_COPILOT_SESSIONS: "roleplayCopilotSessions",
  ROLEPLAY_TEST_REPORTS: "roleplayTestReports",
  COMFORT_AUDIO_LIBRARY: "comfortAudioLibrary",
  WHATSAPP_BOT_DOCUMENTS: "whatsAppBotDocuments",
  WHATSAPP_BOT_DOCUMENT_CHUNKS: "whatsAppBotDocumentChunks",
  WHATSAPP_BOT_STATS: "whatsAppBotStats",
  WHATSAPP_BOT_TEMPLATES: "whatsAppBotTemplates",
  WHATSAPP_BOT_SETTINGS: "whatsAppBotSettings",
  WHATSAPP_BOT_CONVERSATIONS: "whatsAppBotConversations",
  WHATSAPP_BOT_UNANSWERED: "whatsAppBotUnanswered",
  WHATSAPP_BOT_ANALYTICS: "whatsAppBotAnalytics",

  TRACKS_V2: "tracksV2",
  BLOGS: "blogs",
  SUPER_DUPER_ADMINS: "superDuperAdmins",
  // Feature toggles (PLATFORM_ADMIN collapse). Kept apart from USERS/permissions
  // so a toggle-editor save doesn't force an unrelated re-render elsewhere.
  MY_FEATURE_TOGGLES: "myFeatureToggles",
  FEATURE_TOGGLE_REGISTRY: "featureToggleRegistry",
  USER_FEATURE_TOGGLES: "userFeatureToggles",
  PLATFORM_ADMINS: "platformAdmins",
  // Product Roadmap. NOTE: every one of these must ALSO be listed in baseApi.ts's
  // `tagTypes` array — an unregistered tag makes invalidatesTags a silent no-op.
  PRODUCT_ROADMAP_OPPORTUNITIES: "productRoadmapOpportunities",
  PRODUCT_ROADMAP_COIN_BUDGET: "productRoadmapCoinBudget",
  PRODUCT_ROADMAP_FACETS: "productRoadmapFacets",
  PRODUCT_ROADMAP_GOALS: "productRoadmapGoals",
  PRODUCT_ROADMAP_OWNERS: "productRoadmapOwners",
  PRODUCT_ROADMAP_COMMENTS: "productRoadmapComments",
  PRODUCT_ROADMAP_INTERVIEWS: "productRoadmapInterviews",
  PRODUCT_ROADMAP_RELEASE_NOTES: "productRoadmapReleaseNotes",
  PRODUCT_ROADMAP_SAVED_VIEWS: "productRoadmapSavedViews",
  PRODUCT_ROADMAP_VIEW_ORDER: "productRoadmapViewOrder",
  // Analytics Suggestions review queue. Also registered in baseApi.ts's `tagTypes`.
  ANALYTICS_SUGGESTIONS: "analyticsSuggestions",
  BUG_HUNTER_SETTINGS: "bugHunterSettings",
  BUG_HUNTER_RUNS: "bugHunterRuns",
  BUG_HUNTER_FINDINGS: "bugHunterFindings",
  AI_LAB_SKILLS: "aiLabSkills",
  AI_LAB_VARIABLES: "aiLabVariables",
  AI_LAB_VALUES: "aiLabValues",
  AI_LAB_RUNS: "aiLabRuns",
  AI_LAB_EVALUATORS: "aiLabEvaluators",
  AI_LAB_ASSIGNMENTS: "aiLabAssignments",
  AI_LAB_AUTO_EVALS: "aiLabAutoEvals",
  AI_LAB_QUESTION_SETS: "aiLabQuestionSets",
  // Evaluator portal (separate evaluatorAPI)
  EVAL_ASSIGNMENTS: "evalAssignments",
};

/**
 * Stable identifiers for data-driven tooltips. Each value is the unique
 * `location` slug of a row in the backend `tooltips` table; superadmins edit
 * the text under Manage Tooltips and it renders wherever the matching
 * `location` is consumed (see ToggleSection). Add a key here, wrap the UI with
 * the location, and seed/author the row so it shows up.
 */
export enum TooltipLocation {
  // WhatsApp Bot. Seeded blank + inactive by migration 1892000000010; a superadmin authors the text
  // and enables each under Manage Tooltips. Placed on the controls whose wrong setting is hardest to
  // notice from the screen alone — a threshold that silently declines, a safety net that is off, a
  // retention window that keeps identifiable data indefinitely.
  WA_CRISIS_CLASSIFIER = "wa_crisis_classifier",
  WA_RETENTION_DAYS = "wa_retention_days",
  WA_DECLINE_SIMILARITY = "wa_decline_similarity",
  WA_MIN_SIMILARITY = "wa_min_similarity",
  WA_TRANSLATE_QUERY = "wa_translate_query",
  WA_RATE_LIMIT = "wa_rate_limit",
  WA_CONVERSATION_IDLE = "wa_conversation_idle",
  WA_CORPUS_STATUS = "wa_corpus_status",
  WA_CORPUS_CHUNKS = "wa_corpus_chunks",
  WA_CORPUS_SOURCE_TYPE = "wa_corpus_source_type",
  WA_REVEAL_PHONE = "wa_reveal_phone",
  WA_BLOCK_CONTACT = "wa_block_contact",
  WA_RETRIEVAL_META = "wa_retrieval_meta",
  WA_UNANSWERED_REASON = "wa_unanswered_reason",
  WA_UNANSWERED_SCORE = "wa_unanswered_score",
  WA_USAGE_DECLINE_RATE = "wa_usage_decline_rate",
  WA_USAGE_LANGUAGE_DECLINE = "wa_usage_language_decline",
  WA_USAGE_CORPUS_COVERAGE = "wa_usage_corpus_coverage",

  // Edit Simulation → Basic Settings voice-session toggles
  THINKING_FILLER = "thinking_filler",
  COMFORT_AUDIO = "comfort_audio",
  TRIM_HISTORY = "trim_history",
  CONTINUOUS_BACKCHANNELING = "continuous_backchanneling",
  INTERIM_REPLY = "interim_reply",
  // Edit Simulation → Basic Settings (other toggles). Seeded blank + inactive;
  // superadmins author the text and enable each under Manage Tooltips.
  SESSION_TIMER = "session_timer",
  SCORE = "score",
  AI_FEEDBACK_SUMMARY = "ai_feedback_summary",
  ALLOW_PAUSE_RESUME = "allow_pause_resume",
  DEFAULT_ORG_VISIBILITY = "default_org_visibility",
  PUBLIC_VISIBILITY = "public_visibility",
  CONVERSATIONAL_GUARDRAILS = "conversational_guardrails",
  CURRENT_STATE = "current_state",
  REMINDERS_ENABLED = "reminders_enabled",
  // Edit Simulation → form fields (seeded disabled; review + enable in Manage Tooltips)
  CHARACTER_PROFILE_SELECTOR = "character_profile_selector",
  CHARACTER_BACKSTORY = "character_backstory",
  CUSTOM_FIELDS = "custom_fields",
  KNOWLEDGE_SOURCES = "knowledge_sources",
  TRIGGER_WARNINGS = "trigger_warnings",
  SESSION_MAX_TIME = "session_max_time",
  EXPERIENCE_MODE_TYPE = "experience_mode_type",
  CHECKLIST_TYPE_VARIANT = "checklist_type_variant",
  LINGUISTIC_STYLE_SAMPLES = "linguistic_style_samples",
  OPENING_DIALOGUE_TEMPLATES = "opening_dialogue_templates",
  AUTO_TERMINATION_RULES = "auto_termination_rules",
  LANGUAGE_VOICE_MAPPING = "language_voice_mapping",
  SESSION_STATES_PROGRESSION = "session_states_progression",
  // Edit Simulation / studio actions
  PUBLISH_SIMULATION_VERSION = "publish_simulation_version",
  UNPUBLISH_SIMULATION = "unpublish_simulation",
  ARCHIVE_SIMULATION = "archive_simulation",
  EVENT_BRANCH_INSTRUCTION = "event_branch_instruction",
  EVENT_TRIGGER_CONDITIONS = "event_trigger_conditions",
}

export const CUSTOM_CHARACTER_ID = "custom";
