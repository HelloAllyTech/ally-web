import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseApi";

/** The Basic Settings fields Agent Builder Copilot generates in parallel. */
export type AgentBuilderField =
  | "role_instruction"
  | "title"
  | "challenge_description"
  | "knowledge_sources"
  | "persona"
  | "backstory"
  | "states"
  | "opening_statements"
  | "reminders"
  | "linguistic_style_samples"
  | "allowed_filler_words"
  | "spoken_languages"
  | "language_voices";

export interface GenerateAgentBuilderFieldRequest {
  field: AgentBuilderField;
  actorDescription: string;
  competency?: string;
  agentTestCases?: string;
  numKnowledgeSources?: number;
  /**
   * Language to generate in — only read by the language-scoped fields. A
   * `languages.id` as a string, taken from the `spoken_languages` result.
   */
  languageId?: string;
  /** `language_voices` only: the languages to cast a voice for. */
  languageIds?: string[];
  /** `language_voices` only: the generated persona, so the cast matches it. */
  personaGender?: string;
  personaAge?: number;
  model?: string;
  provider?: "openai" | "anthropic";
}

/**
 * One cast voice from the `language_voices` field. The server has already
 * checked the id belongs to that language's own voices, so it can be written
 * straight into the `languageVoices` mapping.
 */
export interface AgentBuilderVoicePick {
  languageId: string;
  languageLabel: string;
  voiceId: string;
  voiceName: string;
  /** The voice's recorded gender; empty when nobody recorded one. */
  voiceGender: string;
}

/** One language the `spoken_languages` field says the client speaks. */
export interface AgentBuilderSpokenLanguage {
  /** `languages.id` as a string — the key every per-language form field uses. */
  languageId: string;
  label: string;
  /** BCP-47 locale, for display only. */
  code: string;
}

/** Persona demographics returned by the `persona` field generator. */
export interface AgentBuilderPersona {
  name?: string;
  age?: number;
  gender?: string;
  profession?: string;
  currentLocation?: string;
}

export interface AgentBuilderKnowledgeSource {
  title: string;
  content: string;
}

/**
 * One state returned by the `states` field generator. The server has already
 * assigned the stable `id` and the contiguous score bands, so this matches the
 * StatesEditor's SimulationStateFormValue shape and can be dropped straight
 * into the `states` form field.
 */
export interface AgentBuilderState {
  id: string;
  name: string;
  guidelines: string;
  scoreLower: number;
  scoreUpper: number;
  ragEnabled: boolean;
}

/**
 * `value`'s shape depends on `field`:
 *  - role_instruction / title / challenge_description / backstory → string
 *  - opening_statements / reminders → string (newline-joined, one item per line)
 *  - persona → AgentBuilderPersona
 *  - knowledge_sources → AgentBuilderKnowledgeSource[]
 *  - states → AgentBuilderState[]
 *  - linguistic_style_samples / allowed_filler_words → string[], written in
 *    the requested `languageId`
 *  - spoken_languages → AgentBuilderSpokenLanguage[]
 *  - language_voices → AgentBuilderVoicePick[]
 */
export interface GenerateAgentBuilderFieldResponse {
  field: AgentBuilderField;
  value: unknown;
}

const agentBuilderAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Agent Builder Copilot: generate ONE Basic Settings field from the wizard's
     * actor brief + competency + agent test cases. The wizard fires one of
     * these per target field concurrently — and, for the language-scoped
     * fields, once per language the client speaks; each returned trigger
     * exposes `.abort()` so the whole batch can be cancelled.
     */
    generateAgentBuilderField: builder.mutation<
      GenerateAgentBuilderFieldResponse,
      GenerateAgentBuilderFieldRequest
    >({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_AGENT_BUILDER_FIELD,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const { useGenerateAgentBuilderFieldMutation } = agentBuilderAPI;
