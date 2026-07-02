import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseApi";

/** The Basic Settings fields Agent Builder Copilot generates in parallel. */
export type AgentBuilderField =
  | "role_instruction"
  | "title"
  | "challenge_description"
  | "knowledge_sources"
  | "persona";

export interface GenerateAgentBuilderFieldRequest {
  field: AgentBuilderField;
  actorDescription: string;
  competency?: string;
  optimisationGoals?: string;
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
 * `value`'s shape depends on `field`:
 *  - role_instruction / title / challenge_description → string
 *  - persona → AgentBuilderPersona
 *  - knowledge_sources → AgentBuilderKnowledgeSource[]
 */
export interface GenerateAgentBuilderFieldResponse {
  field: AgentBuilderField;
  value: unknown;
}

const agentBuilderAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Agent Builder Copilot: generate ONE Basic Settings field from the wizard's
     * actor brief + competency + optimisation goals. The wizard fires one of
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
