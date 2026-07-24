import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { AgentBuilderField, useGenerateAgentBuilderFieldMutation } from "@api";
import { useIsPlaceholderUsed } from "@hooks";
import { applyAgentBuilderField } from "@utils";

/**
 * Drives Agent Builder Copilot's parallel field generation.
 *
 * On `start`, it fires one LLM call PER target Basic Settings field concurrently
 * (via the abortable RTK mutation trigger). As each returns it parses + writes
 * that field into the shared form immediately, so results paint into the
 * mirrored Basic Settings on the left as they arrive — no waiting for the batch.
 * `abort` cancels every in-flight request natively (`.abort()`), stops applying
 * results, and marks the remaining tasks aborted.
 *
 * Writes during the stream skip validation to avoid tripping the parent's 10s
 * autosave + mandatory-field revalidation on every field; one `trigger()` runs
 * after the batch settles.
 */

export type GenerationTaskStatus = "active" | "done" | "empty" | "error" | "aborted";

export interface GenerationTask {
  field: AgentBuilderField;
  /** Human label shown in the chat feed. */
  label: string;
  status: GenerationTaskStatus;
  error?: string;
}

export type GenerationPhase = "idle" | "running" | "done" | "aborted";

export interface GenerationInputs {
  actorDescription: string;
  competency?: string;
  agentTestCases?: string;
}

/** The fields always generated in parallel, in the order shown in the feed. */
const BASE_FIELD_PLAN: { field: AgentBuilderField; label: string }[] = [
  { field: "role_instruction", label: "Role instruction" },
  { field: "title", label: "Title" },
  { field: "challenge_description", label: "Challenge description" },
  { field: "persona", label: "Persona (name, age, gender, profession, location)" },
  { field: "knowledge_sources", label: "Knowledge sources" },
];

/**
 * The `states` field is only generated when the selected main-agent prompt
 * actually uses states (its body references `{state_x_guidelines}`) — the same
 * gate that decides whether the StatesEditor is shown. For any other variant
 * the generated states would be inert and hidden, so we skip the call entirely
 * rather than write metadata the trainer can't see.
 */
const STATES_FIELD: { field: AgentBuilderField; label: string } = {
  field: "states",
  label: "States",
};

const DEFAULT_KNOWLEDGE_SOURCES = 3;

const errorMessage = (err: unknown): string => {
  const anyErr = err as { data?: { message?: string }; error?: string; message?: string };
  return anyErr?.data?.message || anyErr?.error || anyErr?.message || "Generation failed";
};

export const useAgentBuilderGeneration = (formMethods: UseFormReturn<any>) => {
  const [trigger] = useGenerateAgentBuilderFieldMutation();
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [tasks, setTasks] = useState<GenerationTask[]>([]);

  // Include `states` in the fan-out only when the currently-selected main-agent
  // prompt uses states — mirrors the StatesEditor's own visibility gate so we
  // never generate states the trainer can't see or use.
  const selectedMainPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const { isUsed: statesPromptSelected } = useIsPlaceholderUsed(
    selectedMainPromptCode,
    "state_x_guidelines",
  );
  const fieldPlan = useMemo(
    () => (statesPromptSelected ? [...BASE_FIELD_PLAN, STATES_FIELD] : BASE_FIELD_PLAN),
    [statesPromptSelected],
  );

  // In-flight mutation handles (each exposes `.abort()`) + a flag the resolve/
  // reject callbacks read to stop applying once the user has aborted.
  const handlesRef = useRef<{ abort: () => void }[]>([]);
  const abortedRef = useRef(false);
  // Set synchronously while a batch is in flight so a re-entrant start() can't
  // reset the abort flag or orphan the first batch's abort handles (state-based
  // `phase` is stale within the same tick, so a ref is required).
  const runningRef = useRef(false);

  const patchTask = useCallback((field: AgentBuilderField, patch: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(t => (t.field === field ? { ...t, ...patch } : t)));
  }, []);

  const start = useCallback(
    (inputs: GenerationInputs) => {
      // Ignore re-entrant calls while a batch is already running so we never
      // reset the abort flag or lose the running batch's abort handles.
      if (runningRef.current) return;
      runningRef.current = true;
      abortedRef.current = false;
      setTasks(fieldPlan.map(t => ({ ...t, status: "active" as GenerationTaskStatus })));
      setPhase("running");

      const handles: { abort: () => void }[] = [];
      const runs = fieldPlan.map(({ field }) => {
        const handle = trigger({
          field,
          actorDescription: inputs.actorDescription,
          competency: inputs.competency,
          agentTestCases: inputs.agentTestCases,
          ...(field === "knowledge_sources"
            ? { numKnowledgeSources: DEFAULT_KNOWLEDGE_SOURCES }
            : {}),
        });
        handles.push(handle);
        return handle
          .unwrap()
          .then(res => {
            if (abortedRef.current) return;
            const applied = applyAgentBuilderField(field, res.value, formMethods, {
              validate: false,
            });
            patchTask(field, { status: applied ? "done" : "empty" });
          })
          .catch(err => {
            if (abortedRef.current) {
              patchTask(field, { status: "aborted" });
              return;
            }
            patchTask(field, { status: "error", error: errorMessage(err) });
          });
      });
      handlesRef.current = handles;

      void Promise.allSettled(runs).then(() => {
        runningRef.current = false;
        if (abortedRef.current) {
          setPhase("aborted");
          return;
        }
        setPhase("done");
        // Validate once now the batch is applied, so mandatory-field state and
        // the parent autosave settle from the final values (not per keystroke).
        void formMethods.trigger();
      });
    },
    [trigger, formMethods, patchTask, fieldPlan],
  );

  const abort = useCallback(() => {
    if (abortedRef.current) return;
    abortedRef.current = true;
    runningRef.current = false;
    handlesRef.current.forEach(h => {
      try {
        h.abort();
      } catch {
        /* already settled */
      }
    });
    setTasks(prev => prev.map(t => (t.status === "active" ? { ...t, status: "aborted" } : t)));
    setPhase("aborted");
  }, []);

  const reset = useCallback(() => {
    abortedRef.current = false;
    runningRef.current = false;
    handlesRef.current = [];
    setTasks([]);
    setPhase("idle");
  }, []);

  // Cancel any in-flight requests if the wizard unmounts (e.g. tab switch).
  useEffect(
    () => () => {
      abortedRef.current = true;
      handlesRef.current.forEach(h => {
        try {
          h.abort();
        } catch {
          /* already settled */
        }
      });
    },
    [],
  );

  const doneCount = tasks.filter(t => t.status !== "active").length;
  const appliedCount = tasks.filter(t => t.status === "done").length;

  return { phase, tasks, start, abort, reset, doneCount, appliedCount };
};
