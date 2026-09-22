import { useCallback, useEffect, useRef, useState } from "react";

import { EventBuilderField, useGenerateEventBuilderFieldMutation } from "@api";
// Imported by module rather than through the `@utils` barrel, for the same
// reason useAgentBuilderGeneration does it: the barrel reaches
// `loggerWithRedux` -> `@store`, which reads `baseAPI.reducerPath` at module
// load, dragging the whole Redux store into anything that renders this hook.
import { applyEventBuilderField, emptyEventDraft, type EventDraft } from "@utils/eventBuilderApply";

/**
 * Drives Event Builder's field generation for a binary-classification event.
 *
 * On `start`, it fires `classifier` and `tags` together, then — once the class
 * name is known — `examples`, `feedback` and `branch_instruction` in parallel
 * with that name attached. One dependent step, the same shape
 * useAgentBuilderGeneration uses for its per-language fan-out, and for the same
 * reason: the examples are only worth anything if they describe the class the
 * author will actually keep, not one each call re-imagined independently.
 *
 * Results paint into the draft as they arrive rather than at the end of the
 * batch, and each row's state is named in the feed — running, landed, or
 * produced nothing — so the author can see which parts they still have to
 * write themselves ("Status Communication in Asynchronous Agent Design").
 *
 * NOTHING IS PERSISTED HERE. The draft is local until the author submits it,
 * because `session_events` has no tenant column: an event row is visible in
 * every tenant's picker, so an abandoned generation must not leave one behind.
 *
 * `abort` cancels every in-flight request natively (`.abort()`), stops applying
 * results, and marks the remaining rows aborted.
 */

export type GenerationTaskStatus = "waiting" | "active" | "done" | "empty" | "error" | "aborted";

export interface GenerationTask {
  /** Unique per row; equals the field, since each field appears once. */
  key: EventBuilderField;
  label: string;
  status: GenerationTaskStatus;
  error?: string;
}

export type GenerationPhase = "idle" | "running" | "done" | "aborted";

export interface EventGenerationInputs {
  /** The author's free-text description of the behaviour to detect. */
  eventDescription: string;
  /** Title (and optionally challenge) of the simulation this is being written for. */
  simulationContext?: string;
  competency?: string;
}

/**
 * Fired immediately. `classifier` gates the rest; `tags` describes the
 * behaviour the author already wrote, so it has nothing to wait for.
 */
const FIRST_WAVE: { field: EventBuilderField; label: string }[] = [
  { field: "classifier", label: "Event name and classification" },
  { field: "tags", label: "Tags" },
];

/**
 * Fired once `classifier` settles, each with the resolved class name. Mirrors
 * the server's CLASSNAME_DEPENDENT_EVENT_BUILDER_FIELDS.
 */
const SECOND_WAVE: { field: EventBuilderField; label: string }[] = [
  { field: "examples", label: "Positive and negative examples" },
  { field: "feedback", label: "Real-time feedback and score" },
  { field: "branch_instruction", label: "Branch instruction" },
];

const TASK_PLAN = [...FIRST_WAVE, ...SECOND_WAVE];

/**
 * Examples per polarity requested by default.
 *
 * Four rather than the server's maximum of five: every example is re-sent on
 * every learner turn, batched across every classifier on the simulation, so
 * the default should sit below the ceiling rather than at it. The author can
 * delete any they don't want; there is no UI to ask for more.
 */
export const DEFAULT_GENERATED_EXAMPLES = 4;

/**
 * Per-polarity ceiling the editor enforces. Mirrors the server's
 * MAX_EXAMPLES_PER_POLARITY, which clamps the same number again — this copy
 * exists so the "Add example" button can grey out rather than letting an author
 * type a sixth and have it silently dropped on save.
 */
export const MAX_EXAMPLES_PER_POLARITY = 5;

const errorMessage = (err: unknown): string => {
  const anyErr = err as { data?: { message?: string }; error?: string; message?: string };
  return anyErr?.data?.message || anyErr?.error || anyErr?.message || "Generation failed";
};

export const useEventBuilderGeneration = () => {
  const [trigger] = useGenerateEventBuilderFieldMutation();
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [draft, setDraft] = useState<EventDraft>(emptyEventDraft);

  // In-flight mutation handles (each exposes `.abort()`) + a flag the resolve/
  // reject callbacks read to stop applying once the user has aborted.
  const handlesRef = useRef<{ abort: () => void }[]>([]);
  const abortedRef = useRef(false);
  // Set synchronously while a batch is in flight so a re-entrant start() can't
  // reset the abort flag or orphan the first batch's handles — `phase` is stale
  // within the same tick, so a ref is required.
  const runningRef = useRef(false);
  /**
   * The draft as the async fan-out sees it. Results arrive out of order and
   * each applies to the latest draft, so they cannot close over the `draft`
   * from the render that started the batch — the second result would overwrite
   * the first. `setDraft` stays the single writer; this only mirrors it.
   */
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const patchTask = useCallback((key: EventBuilderField, patch: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(task => (task.key === key ? { ...task, ...patch } : task)));
  }, []);

  /** Merge an author's edit into the draft. */
  const patchDraft = useCallback((patch: Partial<EventDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }));
  }, []);

  /**
   * Fire one field, keep its abort handle, apply the result and settle its row.
   * Never rejects: one field failing must not take the batch down, since the
   * others are independently useful.
   */
  const runField = useCallback(
    (
      field: EventBuilderField,
      inputs: EventGenerationInputs,
      className: string,
      handles: { abort: () => void }[],
    ): Promise<void> => {
      patchTask(field, { status: "active", error: undefined });
      const handle = trigger({
        field,
        eventDescription: inputs.eventDescription,
        ...(inputs.simulationContext ? { simulationContext: inputs.simulationContext } : {}),
        ...(inputs.competency ? { competency: inputs.competency } : {}),
        ...(className ? { className } : {}),
        ...(field === "examples" ? { numExamples: DEFAULT_GENERATED_EXAMPLES } : {}),
      });
      handles.push(handle);
      return handle
        .unwrap()
        .then(res => {
          if (abortedRef.current) return;
          const { draft: next, applied } = applyEventBuilderField(
            field,
            res.value,
            draftRef.current,
          );
          if (applied) {
            draftRef.current = next;
            setDraft(next);
          }
          patchTask(field, { status: applied ? "done" : "empty" });
        })
        .catch(err => {
          patchTask(
            field,
            abortedRef.current
              ? { status: "aborted" }
              : { status: "error", error: errorMessage(err) },
          );
        });
    },
    [trigger, patchTask],
  );

  const start = useCallback(
    (inputs: EventGenerationInputs) => {
      // Ignore re-entrant calls while a batch is running, so we never reset the
      // abort flag or lose the running batch's handles.
      if (runningRef.current) return;
      if (!inputs.eventDescription.trim()) return;
      runningRef.current = true;
      abortedRef.current = false;

      // Every field is regenerated from the new brief, so the draft starts
      // clean: keeping the previous run's examples beside a new class name
      // would leave the classifier calibrated against a behaviour nobody asked
      // for, and nothing on screen would say so.
      const fresh = emptyEventDraft();
      draftRef.current = fresh;
      setDraft(fresh);

      // The second wave genuinely has not started yet, so it says "waiting"
      // rather than showing a spinner for work that is not running.
      setTasks(
        TASK_PLAN.map(task => ({
          key: task.field,
          label: task.label,
          status: FIRST_WAVE.some(first => first.field === task.field)
            ? ("active" as GenerationTaskStatus)
            : ("waiting" as GenerationTaskStatus),
        })),
      );
      setPhase("running");

      const handles: { abort: () => void }[] = [];
      handlesRef.current = handles;

      const classifierRun = runField("classifier", inputs, "", handles);
      const tagsRun = runField("tags", inputs, "", handles);

      const secondWave = classifierRun.then(() => {
        if (abortedRef.current) {
          SECOND_WAVE.forEach(({ field }) => patchTask(field, { status: "aborted" }));
          return Promise.resolve();
        }
        // Whatever the classifier produced — including nothing. The dependent
        // prompts all read sensibly with an empty class name, so a failed
        // classifier degrades those fields rather than blocking them.
        const className = draftRef.current.className;
        return Promise.allSettled(
          SECOND_WAVE.map(({ field }) => runField(field, inputs, className, handles)),
        ).then(() => undefined);
      });

      void Promise.allSettled([classifierRun, tagsRun, secondWave]).then(() => {
        runningRef.current = false;
        setPhase(abortedRef.current ? "aborted" : "done");
      });
    },
    [runField, patchTask],
  );

  /**
   * Re-run ONE field against the draft as it stands now.
   *
   * Uses the draft's current class name, not the one the batch generated, so a
   * regenerate after the author has corrected the class name produces examples
   * for the corrected class. Without that, fixing a wrong class name would
   * leave every example still describing the wrong one.
   */
  const regenerateField = useCallback(
    (field: EventBuilderField, inputs: EventGenerationInputs) => {
      if (runningRef.current) return;
      if (!inputs.eventDescription.trim()) return;
      runningRef.current = true;
      abortedRef.current = false;
      setPhase("running");

      const handles: { abort: () => void }[] = [];
      handlesRef.current = handles;

      // `classifier` writes the class name, so it must not also be steered by
      // it — the server ignores the field for that call regardless.
      const className = field === "classifier" ? "" : draftRef.current.className;

      void runField(field, inputs, className, handles).then(() => {
        runningRef.current = false;
        setPhase(abortedRef.current ? "aborted" : "done");
      });
    },
    [runField],
  );

  const abortAll = useCallback(() => {
    handlesRef.current.forEach(handle => {
      try {
        handle.abort();
      } catch {
        /* already settled */
      }
    });
  }, []);

  const abort = useCallback(() => {
    if (abortedRef.current) return;
    abortedRef.current = true;
    runningRef.current = false;
    abortAll();
    setTasks(prev =>
      prev.map(task =>
        task.status === "active" || task.status === "waiting"
          ? { ...task, status: "aborted" }
          : task,
      ),
    );
    setPhase("aborted");
  }, [abortAll]);

  /** Clear the feed and the draft — used when the panel closes or reopens. */
  const reset = useCallback(() => {
    abortedRef.current = false;
    runningRef.current = false;
    handlesRef.current = [];
    setTasks([]);
    setPhase("idle");
    const fresh = emptyEventDraft();
    draftRef.current = fresh;
    setDraft(fresh);
  }, []);

  // Cancel anything in flight if the panel unmounts.
  useEffect(
    () => () => {
      abortedRef.current = true;
      handlesRef.current.forEach(handle => {
        try {
          handle.abort();
        } catch {
          /* already settled */
        }
      });
    },
    [],
  );

  const settledCount = tasks.filter(
    task => task.status !== "active" && task.status !== "waiting",
  ).length;
  const appliedCount = tasks.filter(task => task.status === "done").length;

  return {
    phase,
    tasks,
    draft,
    patchDraft,
    setDraft,
    start,
    regenerateField,
    abort,
    reset,
    settledCount,
    appliedCount,
  };
};
