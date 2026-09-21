import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import {
  AgentBuilderField,
  AgentBuilderSpokenLanguage,
  useGenerateAgentBuilderFieldMutation,
  useGetAvailableLanguageVoicesQuery,
} from "@api";
import type { LanguageOption } from "@components/linguistic-style-samples/scenarioLanguageUtils";
import { useIsPlaceholderUsed, useResolvedPrimaryLanguageId } from "@hooks";
// Imported by module rather than through the `@utils` barrel: the barrel
// reaches `loggerWithRedux` -> `@store`, which reads `baseAPI.reducerPath` at
// module load. Pulling that in here drags the whole Redux store into anything
// that renders this hook (its own test included, where the store initializes
// against a mocked `@api` and deadlocks).
import { applyAgentBuilderField } from "@utils/agentBuilderApply";
import {
  describeVoicePicks,
  pickVoicesForLanguages,
  toCastPicks,
} from "@utils/agentBuilderVoicePick";

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
 * Three of the fields exist once PER LANGUAGE the client speaks (opening
 * dialogues, linguistic style samples, filler words). They can't be fired up
 * front because the language list comes from the brief, so the batch has one
 * dependent step: the `spoken_languages` call runs alongside the language-
 * agnostic fields and, as soon as it answers, appends and fires that field ×
 * language fan-out. The detected languages are named in the feed rather than
 * inferred silently, and every generated language ends up in a tab the trainer
 * can correct ("Status Communication in Asynchronous Agent Design").
 *
 * The same language list also fills the Language–Voice mapping, once the
 * persona call has landed to say who is being voiced: generated Hindi content
 * is unreachable at runtime until Hindi has a voice, and publish is blocked
 * until it does. That row is its own `language_voices` call — the model reads
 * the brief and the persona and casts a voice per language — with the local
 * picker order as the fallback for anything it doesn't answer for.
 *
 * Writes during the stream skip validation to avoid tripping the parent's 10s
 * autosave + mandatory-field revalidation on every field; one `trigger()` runs
 * after the batch settles.
 */

export type GenerationTaskStatus = "active" | "done" | "empty" | "error" | "aborted";

export interface GenerationTask {
  /**
   * Unique per row: `field`, `field:languageId` for the per-language rows, or a
   * plain id for a row that isn't an LLM call at all (the voice mapping).
   */
  key: string;
  /** Absent on rows that don't call a field generator. */
  field?: AgentBuilderField;
  /** Set on the per-language rows only. */
  languageId?: string;
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

/**
 * The language-agnostic fields, in the order shown in the feed. `states` is
 * appended conditionally (see STATES_FIELD) and the per-language rows are
 * appended once the languages are known.
 */
const BASE_FIELD_PLAN: { field: AgentBuilderField; label: string }[] = [
  { field: "role_instruction", label: "Role instruction" },
  { field: "title", label: "Title" },
  { field: "challenge_description", label: "Challenge description" },
  { field: "persona", label: "Persona (name, age, gender, profession, location)" },
  { field: "backstory", label: "Character backstory" },
  { field: "knowledge_sources", label: "Knowledge sources" },
  { field: "reminders", label: "Reminders" },
];

/**
 * The fields generated once per spoken language, in the order shown under each
 * language in the feed. Mirrors the server's language-scoped field set.
 */
const LANGUAGE_FIELD_PLAN: { field: AgentBuilderField; label: string }[] = [
  { field: "opening_statements", label: "Opening dialogues" },
  { field: "linguistic_style_samples", label: "Linguistic style samples" },
  { field: "allowed_filler_words", label: "Allowed filler words" },
];

/**
 * Reads the actor brief and answers which of the platform's languages the
 * client speaks. Not a Basic Settings field — it only gates the fan-out above,
 * so it sits last in the feed, immediately before the rows it creates.
 */
const SPOKEN_LANGUAGES_FIELD: { field: AgentBuilderField; label: string } = {
  field: "spoken_languages",
  label: "Languages the client speaks",
};

/**
 * Cast a voice per spoken language. Sequenced after `spoken_languages` (which
 * languages) and `persona` (who is being voiced), so it can't join the initial
 * parallel batch.
 */
const LANGUAGE_VOICES_TASK: { key: string; field: AgentBuilderField; label: string } = {
  key: "language_voices",
  field: "language_voices",
  label: "Language–Voice mapping",
};

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

/** Defensive read of the `spoken_languages` value. */
const toSpokenLanguages = (value: unknown): AgentBuilderSpokenLanguage[] =>
  (Array.isArray(value) ? (value as AgentBuilderSpokenLanguage[]) : []).filter(
    l => typeof l?.languageId === "string" && l.languageId.trim().length > 0,
  );

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
    () => [
      ...BASE_FIELD_PLAN,
      ...(statesPromptSelected ? [STATES_FIELD] : []),
      SPOKEN_LANGUAGES_FIELD,
    ],
    [statesPromptSelected],
  );

  // Which language owns `openingStatements` (vs `translationOpeningStatements`).
  // Same resolution the Opening Dialogues panel uses, so generated lines land
  // in the tab that reads them.
  const { data: catalogLanguages = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: true,
  }) as { data: LanguageOption[] };
  const openingDialoguePrimaryLanguageId = formMethods.watch("openingDialoguePrimaryLanguageId") as
    | number
    | null
    | undefined;
  const primaryLanguageId = useResolvedPrimaryLanguageId(
    catalogLanguages,
    openingDialoguePrimaryLanguageId,
  );
  // Read inside the async fan-out, which outlives this render.
  const primaryLanguageIdRef = useRef(primaryLanguageId);
  primaryLanguageIdRef.current = primaryLanguageId;
  const catalogLanguagesRef = useRef(catalogLanguages);
  catalogLanguagesRef.current = catalogLanguages;

  // In-flight mutation handles (each exposes `.abort()`) + a flag the resolve/
  // reject callbacks read to stop applying once the user has aborted.
  const handlesRef = useRef<{ abort: () => void }[]>([]);
  const abortedRef = useRef(false);
  // Set synchronously while a batch is in flight so a re-entrant start() can't
  // reset the abort flag or orphan the first batch's abort handles (state-based
  // `phase` is stale within the same tick, so a ref is required).
  const runningRef = useRef(false);

  const patchTask = useCallback((key: string, patch: Partial<GenerationTask>) => {
    setTasks(prev => prev.map(t => (t.key === key ? { ...t, ...patch } : t)));
  }, []);

  const start = useCallback(
    (inputs: GenerationInputs) => {
      // Ignore re-entrant calls while a batch is already running so we never
      // reset the abort flag or lose the running batch's abort handles.
      if (runningRef.current) return;
      runningRef.current = true;
      abortedRef.current = false;
      setTasks(
        fieldPlan.map(t => ({
          ...t,
          key: t.field,
          status: "active" as GenerationTaskStatus,
        })),
      );
      setPhase("running");

      const handles: { abort: () => void }[] = [];
      // Per-field promises, so the voice pick can wait on `persona` alone
      // rather than on the whole batch — it needs the gender, nothing else.
      const runsByField = new Map<AgentBuilderField, Promise<void>>();

      /**
       * Fire one field (optionally for one language), keeping the abort handle
       * and settling that row's status. Resolves once the row is settled — and,
       * for `spoken_languages`, once its whole fan-out has settled too, so the
       * batch's `allSettled` covers the dependent calls without extra
       * bookkeeping.
       */
      const runTask = (task: {
        key: string;
        field: AgentBuilderField;
        languageId?: string;
      }): Promise<void> => {
        const handle = trigger({
          field: task.field,
          actorDescription: inputs.actorDescription,
          competency: inputs.competency,
          agentTestCases: inputs.agentTestCases,
          ...(task.languageId ? { languageId: task.languageId } : {}),
          ...(task.field === "knowledge_sources"
            ? { numKnowledgeSources: DEFAULT_KNOWLEDGE_SOURCES }
            : {}),
        });
        handles.push(handle);
        return handle
          .unwrap()
          .then(res => {
            if (abortedRef.current) return undefined;
            // The language answer isn't applied to the form — it schedules the
            // per-language calls, and awaiting them here keeps them inside the
            // batch's own settle.
            if (task.field === "spoken_languages") {
              return fanOutLanguages(toSpokenLanguages(res.value));
            }
            const applied = applyAgentBuilderField(task.field, res.value, formMethods, {
              validate: false,
              languageId: task.languageId,
              primaryLanguageId: primaryLanguageIdRef.current,
            });
            patchTask(task.key, { status: applied ? "done" : "empty" });
            return undefined;
          })
          .catch(err => {
            patchTask(
              task.key,
              abortedRef.current
                ? { status: "aborted" }
                : { status: "error", error: errorMessage(err) },
            );
          });
      };

      /**
       * Append a row per (language-scoped field × language) and fire them all.
       * The language row itself resolves to the names so the trainer can see
       * what was inferred from the brief — and spot a wrong guess before
       * reviewing the tabs.
       */
      const fanOutLanguages = (languages: AgentBuilderSpokenLanguage[]): Promise<void> => {
        if (languages.length === 0) {
          patchTask(SPOKEN_LANGUAGES_FIELD.field, { status: "empty" });
          return Promise.resolve();
        }
        patchTask(SPOKEN_LANGUAGES_FIELD.field, {
          status: "done",
          label: `${SPOKEN_LANGUAGES_FIELD.label}: ${languages.map(l => l.label).join(", ")}`,
        });
        const languageTasks = languages.flatMap(language =>
          LANGUAGE_FIELD_PLAN.map(({ field, label }) => ({
            key: `${field}:${language.languageId}`,
            field,
            languageId: language.languageId,
            label: `${label} (${language.label})`,
          })),
        );
        setTasks(prev => [
          ...prev,
          ...languageTasks.map(t => ({ ...t, status: "active" as GenerationTaskStatus })),
          { ...LANGUAGE_VOICES_TASK, status: "active" as GenerationTaskStatus },
        ]);
        return Promise.allSettled([...languageTasks.map(runTask), assignVoices(languages)]).then(
          () => undefined,
        );
      };

      /**
       * Cast a voice for each generated language, once the persona has landed
       * so the model knows who it is voicing. Languages the trainer already
       * mapped are left exactly as they are — the cast is asked only for the
       * ones still empty, and never overwrites a deliberate choice.
       */
      const assignVoices = async (languages: AgentBuilderSpokenLanguage[]): Promise<void> => {
        // Never rejects (runTask swallows), so this resolves either way; a
        // failed persona just means casting with no gender to match.
        await (runsByField.get("persona") ?? Promise.resolve());
        if (abortedRef.current) {
          patchTask(LANGUAGE_VOICES_TASK.key, { status: "aborted" });
          return;
        }

        const personaGender = formMethods.getValues("gender") as string | undefined;
        const personaAge = formMethods.getValues("age") as number | undefined;
        const existingLanguageVoices =
          (formMethods.getValues("languageVoices") as Record<string, string> | undefined) ?? {};
        const unmapped = languages.filter(
          language => !existingLanguageVoices[String(language.languageId)],
        );
        if (unmapped.length === 0) {
          patchTask(LANGUAGE_VOICES_TASK.key, { status: "empty" });
          return;
        }

        let cast: ReturnType<typeof toCastPicks> = [];
        try {
          const handle = trigger({
            field: LANGUAGE_VOICES_TASK.field,
            actorDescription: inputs.actorDescription,
            competency: inputs.competency,
            agentTestCases: inputs.agentTestCases,
            languageIds: unmapped.map(language => String(language.languageId)),
            ...(personaGender ? { personaGender } : {}),
            ...(typeof personaAge === "number" ? { personaAge } : {}),
          });
          handles.push(handle);
          const res = await handle.unwrap();
          const unmappedIds = new Set(unmapped.map(language => String(language.languageId)));
          cast = toCastPicks(Array.isArray(res.value) ? res.value : [], personaGender)
            // Enforced here rather than trusted from the request: only the
            // unmapped languages were asked for, but a pick for any other one
            // would silently replace a voice the trainer chose by hand.
            .filter(pick => unmappedIds.has(pick.languageId));
        } catch {
          // A failed or aborted cast is not fatal: the mapping is mandatory to
          // publish, so falling back to the picker's own order still leaves the
          // trainer a working simulation to review.
          if (abortedRef.current) {
            patchTask(LANGUAGE_VOICES_TASK.key, { status: "aborted" });
            return;
          }
        }
        if (abortedRef.current) {
          patchTask(LANGUAGE_VOICES_TASK.key, { status: "aborted" });
          return;
        }

        const castIds = new Set(cast.map(pick => pick.languageId));
        const picks = [
          ...cast,
          ...pickVoicesForLanguages({
            languages: unmapped.filter(language => !castIds.has(String(language.languageId))),
            catalog: catalogLanguagesRef.current,
            personaGender,
            personaAge,
            existingLanguageVoices,
          }),
        ];
        if (picks.length === 0) {
          patchTask(LANGUAGE_VOICES_TASK.key, { status: "empty" });
          return;
        }
        formMethods.setValue(
          "languageVoices",
          {
            ...existingLanguageVoices,
            ...Object.fromEntries(picks.map(pick => [pick.languageId, pick.voiceId])),
          },
          { shouldDirty: true, shouldValidate: false },
        );
        patchTask(LANGUAGE_VOICES_TASK.key, {
          status: "done",
          label: `${LANGUAGE_VOICES_TASK.label}: ${describeVoicePicks(picks, personaGender)}`,
        });
      };

      const runs = fieldPlan.map(({ field }) => {
        const run = runTask({ key: field, field });
        runsByField.set(field, run);
        return run;
      });
      // Same array the per-language calls push into later, so Stop cancels
      // them too even though they don't exist yet at this point.
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
