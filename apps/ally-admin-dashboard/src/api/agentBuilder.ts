import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseApi";

/** The Basic Settings fields Agent Builder Copilot generates in parallel. */
export type AgentBuilderField =
  | "role_instruction"
  | "title"
  | "challenge_description"
  | "knowledge_sources"
  | "persona"
  | "states";

export interface GenerateAgentBuilderFieldRequest {
  field: AgentBuilderField;
  actorDescription: string;
  competency?: string;
  agentTestCases?: string;
  numKnowledgeSources?: number;
  model?: string;
  provider?: "openai" | "anthropic";
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
 *  - role_instruction / title / challenge_description → string
 *  - persona → AgentBuilderPersona
 *  - knowledge_sources → AgentBuilderKnowledgeSource[]
 *  - states → AgentBuilderState[]
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
     * these per target field concurrently; each returned trigger exposes
     * `.abort()` so the whole batch can be cancelled.
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
