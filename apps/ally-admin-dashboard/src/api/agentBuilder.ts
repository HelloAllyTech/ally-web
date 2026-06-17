import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseApi";

export interface GenerateAgentPromptRequest {
  description: string;
  model?: string;
  provider?: "openai" | "anthropic";
}

export interface GenerateAgentPromptResponse {
  systemPrompt: string;
  provider: string;
  model: string;
}

const agentBuilderAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Agent Builder Copilot: turn a free-text actor description into a
     * comprehensive roleplay-actor system prompt using an LLM.
     */
    generateAgentPrompt: builder.mutation<GenerateAgentPromptResponse, GenerateAgentPromptRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_AGENT_PROMPT,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const { useGenerateAgentPromptMutation } = agentBuilderAPI;
