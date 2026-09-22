import { ApiEndpoints, HttpMethod } from "@constants";

import { baseAPI } from "./baseApi";

/** The parts of a binary-classification event the Event Builder generates. */
export type EventBuilderField =
  | "classifier"
  | "examples"
  | "feedback"
  | "branch_instruction"
  | "tags";

export interface GenerateEventBuilderFieldRequest {
  field: EventBuilderField;
  /** The author's free-text description of the behaviour to detect. */
  eventDescription: string;
  /**
   * The class name as the author has it right now — the `classifier` call's
   * answer, possibly edited. Read by `examples` / `feedback` /
   * `branch_instruction`; ignored by `classifier` and `tags`.
   */
  className?: string;
  /** What the simulation is about, so the wording fits the scenario. */
  simulationContext?: string;
  competency?: string;
  /** Examples per polarity. Capped server-side — see MAX_GENERATED_EXAMPLES. */
  numExamples?: number;
  model?: string;
  provider?: string;
  temperature?: number;
}

/** `classifier` — the event's display name and the class the runtime judges against. */
export interface EventBuilderClassifier {
  name: string;
  className: string;
}

export interface EventBuilderExample {
  text: string;
}

/** `examples` — the few-shot block written into `detectionData`. */
export interface EventBuilderExamples {
  positiveExamples: EventBuilderExample[];
  negativeExamples: EventBuilderExample[];
}

/** `feedback` — what the learner sees mid-session, and the score it carries. */
export interface EventBuilderFeedback {
  message: string;
  /** Absent when the model did not return a real emoji; keep the form's own. */
  emoji?: string;
  score: number;
}

/**
 * `value`'s shape depends on `field`:
 *  - classifier         → EventBuilderClassifier
 *  - examples           → EventBuilderExamples
 *  - feedback           → EventBuilderFeedback
 *  - branch_instruction → string
 *  - tags               → string[]
 *
 * Every value is already clamped server-side to what the event columns accept,
 * so it can be written straight into the draft.
 */
export interface GenerateEventBuilderFieldResponse {
  field: EventBuilderField;
  value: unknown;
}

const eventBuilderAPI = baseAPI.injectEndpoints({
  endpoints: builder => ({
    /**
     * Event Builder: generate ONE part of a binary-classification event from
     * the author's free-text behaviour description. The panel fires
     * `classifier` first and then the rest concurrently; each returned trigger
     * exposes `.abort()` so the whole batch can be cancelled.
     *
     * Generation persists nothing — the values fill a draft the author submits
     * through the ordinary create/update endpoints.
     */
    generateEventBuilderField: builder.mutation<
      GenerateEventBuilderFieldResponse,
      GenerateEventBuilderFieldRequest
    >({
      query: body => ({
        url: ApiEndpoints.SIMULATION_STUDIO.GENERATE_EVENT_BUILDER_FIELD,
        method: HttpMethod.POST,
        body,
      }),
    }),
  }),
});

export const { useGenerateEventBuilderFieldMutation } = eventBuilderAPI;
