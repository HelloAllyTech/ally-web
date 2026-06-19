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

export type CopilotRunStatus =
  | "STARTED"
  | "GENERATING"
  | "EVALUATING"
  | "REFINING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface CopilotRoundHistoryEntry {
  round: number;
  score: number | null;
  metrics?: Record<string, number>;
  reportMarkdown?: string;
  fieldValues?: Record<string, unknown>;
  reportId?: string;
}

export interface CopilotRun {
  id: string;
  status: CopilotRunStatus;
  brief: string;
  config: {
    skillPromptCode?: string;
    model?: string;
    provider: "openai" | "anthropic";
    languageId: number;
    languageCode: string;
    competencyId?: string;
    competencyName?: string;
    turns: number;
  };
  draftScenarioId?: number;
  round: number;
  bestScore?: number;
  bestFieldValues?: Record<string, unknown>;
  roundHistory?: CopilotRoundHistoryEntry[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface StartCopilotRunRequest {
  brief: string;
  skillPromptCode?: string;
  model?: string;
}

export interface StartCopilotRunResponse {
  runId: string;
  status: CopilotRunStatus;
}

/** Terminal statuses where the run has stopped and the frontend can act. */
export const COPILOT_TERMINAL_STATUSES: CopilotRunStatus[] = [
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
];

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

    /**
     * Copilot auto-build & self-improve: kicks off a server-side pipeline that
     * generates the actor's Basic Settings, runs a practice conversation +
     * evaluation, and refines until it scores well or the round budget runs out.
     */
    startCopilotRun: builder.mutation<StartCopilotRunResponse, StartCopilotRunRequest>({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.START_COPILOT_RUN,
        method: HttpMethod.POST,
        body,
      }),
    }),

    /** Poll a Copilot run's status/rounds/score while it builds. */
    getCopilotRun: builder.query<CopilotRun, string>({
      query: runId => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GET_COPILOT_RUN(runId),
        method: HttpMethod.GET,
      }),
    }),

    cancelCopilotRun: builder.mutation<CopilotRun, string>({
      query: runId => ({
        url: ApiEndpoints.SIMULATION_STUDIO.CANCEL_COPILOT_RUN(runId),
        method: HttpMethod.POST,
      }),
    }),
  }),
});

export const {
  useGenerateAgentPromptMutation,
  useStartCopilotRunMutation,
  useGetCopilotRunQuery,
  useCancelCopilotRunMutation,
} = agentBuilderAPI;
