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

/** The Basic Settings fields Agent Builder Copilot V2 generates in parallel. */
export type AgentBuilderV2Field =
  | "role_instruction"
  | "title"
  | "challenge_description"
  | "knowledge_sources"
  | "persona";

export interface GenerateAgentBuilderV2FieldRequest {
  field: AgentBuilderV2Field;
  actorDescription: string;
  competency?: string;
  optimisationGoals?: string;
  numKnowledgeSources?: number;
  model?: string;
  provider?: "openai" | "anthropic";
}

/** Persona demographics returned by the `persona` field generator. */
export interface AgentBuilderV2Persona {
  name?: string;
  age?: number;
  gender?: string;
  profession?: string;
  currentLocation?: string;
}

export interface AgentBuilderV2KnowledgeSource {
  title: string;
  content: string;
}

/**
 * `value`'s shape depends on `field`:
 *  - role_instruction / title / challenge_description → string
 *  - persona → AgentBuilderV2Persona
 *  - knowledge_sources → AgentBuilderV2KnowledgeSource[]
 */
export interface GenerateAgentBuilderV2FieldResponse {
  field: AgentBuilderV2Field;
  value: unknown;
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

export type CopilotProgressEventKind =
  | "run_started"
  | "draft_provisioned"
  | "round_started"
  | "base_generation"
  | "field_generation"
  | "tier_completed"
  | "generation_completed"
  | "evaluation_started"
  | "round_scored"
  | "refining"
  | "revise_requested"
  | "succeeded"
  | "failed"
  | "cancelled";

export type CopilotProgressEventStatus =
  | "started"
  | "completed"
  | "skipped"
  | "failed"
  | "info";

/** One entry in a run's append-only activity feed. The FE diffs by `seq`. */
export interface CopilotProgressEvent {
  id: string;
  seq: number;
  at: string;
  round: number;
  segment: number;
  kind: CopilotProgressEventKind;
  status: CopilotProgressEventStatus;
  label: string;
  payload?: {
    fieldName?: string;
    tier?: number;
    score?: number | null;
    metrics?: Record<string, number>;
    reportId?: string;
    reason?: string;
  };
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
    segment?: number;
    reviseInstruction?: string;
  };
  draftScenarioId?: number;
  round: number;
  bestScore?: number;
  bestFieldValues?: Record<string, unknown>;
  roundHistory?: CopilotRoundHistoryEntry[];
  /** Append-only activity feed for the live chat UI. */
  progressLog?: CopilotProgressEvent[];
  /** Set on revise runs — the run this one continues. */
  parentRunId?: string;
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

export interface ReviseCopilotRunRequest {
  runId: string;
  instruction: string;
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
     * Agent Builder Copilot V2: generate ONE Basic Settings field from the
     * wizard's actor brief + competency + optimisation goals. The wizard fires
     * one of these per target field concurrently; each returned trigger exposes
     * `.abort()` so the whole batch can be cancelled.
     */
    generateAgentBuilderV2Field: builder.mutation<
      GenerateAgentBuilderV2FieldResponse,
      GenerateAgentBuilderV2FieldRequest
    >({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_AGENT_BUILDER_V2_FIELD,
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

    /**
     * Revise a finished run: re-runs the build & test loop on the same draft,
     * carrying prior context plus the free-text instruction. Returns the new
     * run id, which the chat keeps polling so the conversation stays continuous.
     */
    reviseCopilotRun: builder.mutation<StartCopilotRunResponse, ReviseCopilotRunRequest>({
      query: ({ runId, instruction }) => ({
        url: ApiEndpoints.SIMULATION_STUDIO.REVISE_COPILOT_RUN(runId),
        method: HttpMethod.POST,
        body: { instruction },
      }),
    }),
  }),
});

export const {
  useGenerateAgentPromptMutation,
  useGenerateAgentBuilderV2FieldMutation,
  useStartCopilotRunMutation,
  useGetCopilotRunQuery,
  useCancelCopilotRunMutation,
  useReviseCopilotRunMutation,
} = agentBuilderAPI;
