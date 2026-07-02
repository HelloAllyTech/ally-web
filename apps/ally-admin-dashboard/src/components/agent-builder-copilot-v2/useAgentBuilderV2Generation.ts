import { useCallback, useEffect, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { AgentBuilderV2Field, useGenerateAgentBuilderV2FieldMutation } from "@api";
import { applyAgentBuilderV2Field } from "@utils";

/**
 * Drives Agent Builder Copilot V2's parallel field generation.
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

export type V2TaskStatus = "active" | "done" | "empty" | "error" | "aborted";

export interface V2Task {
  field: AgentBuilderV2Field;
  /** Human label shown in the chat feed. */
  label: string;
  status: V2TaskStatus;
  error?: string;
}

export type V2Phase = "idle" | "running" | "done" | "aborted";

export interface V2GenerationInputs {
  actorDescription: string;
  competency?: string;
  optimisationGoals?: string;
}

/** The fields generated in parallel, in the order shown in the feed. */
const V2_FIELD_PLAN: { field: AgentBuilderV2Field; label: string }[] = [
  { field: "role_instruction", label: "Role instruction" },
  { field: "title", label: "Title" },
  { field: "challenge_description", label: "Challenge description" },
  { field: "persona", label: "Persona (name, age, gender, profession, location)" },
  { field: "knowledge_sources", label: "Knowledge sources" },
];

const DEFAULT_KNOWLEDGE_SOURCES = 3;

const errorMessage = (err: unknown): string => {
  const anyErr = err as { data?: { message?: string }; error?: string; message?: string };
  return anyErr?.data?.message || anyErr?.error || anyErr?.message || "Generation failed";
};

export const useAgentBuilderV2Generation = (formMethods: UseFormReturn<any>) => {
  const [trigger] = useGenerateAgentBuilderV2FieldMutation();
  const [phase, setPhase] = useState<V2Phase>("idle");
  const [tasks, setTasks] = useState<V2Task[]>([]);

  // In-flight mutation handles (each exposes `.abort()`) + a flag the resolve/
  // reject callbacks read to stop applying once the user has aborted.
  const handlesRef = useRef<{ abort: () => void }[]>([]);
  const abortedRef = useRef(false);
  // Set synchronously while a batch is in flight so a re-entrant start() can't
  // reset the abort flag or orphan the first batch's abort handles (state-based
  // `phase` is stale within the same tick, so a ref is required).
  const runningRef = useRef(false);

  const patchTask = useCallback((field: AgentBuilderV2Field, patch: Partial<V2Task>) => {
    setTasks(prev => prev.map(t => (t.field === field ? { ...t, ...patch } : t)));
  }, []);

  const start = useCallback(
    (inputs: V2GenerationInputs) => {
      // Ignore re-entrant calls while a batch is already running so we never
      // reset the abort flag or lose the running batch's abort handles.
      if (runningRef.current) return;
      runningRef.current = true;
      abortedRef.current = false;
      setTasks(V2_FIELD_PLAN.map(t => ({ ...t, status: "active" as V2TaskStatus })));
      setPhase("running");

      const handles: { abort: () => void }[] = [];
      const runs = V2_FIELD_PLAN.map(({ field }) => {
        const handle = trigger({
          field,
          actorDescription: inputs.actorDescription,
          competency: inputs.competency,
          optimisationGoals: inputs.optimisationGoals,
          ...(field === "knowledge_sources"
            ? { numKnowledgeSources: DEFAULT_KNOWLEDGE_SOURCES }
            : {}),
        });
        handles.push(handle);
        return handle
          .unwrap()
          .then(res => {
            if (abortedRef.current) return;
            const applied = applyAgentBuilderV2Field(field, res.value, formMethods, {
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
    [trigger, formMethods, patchTask],
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
