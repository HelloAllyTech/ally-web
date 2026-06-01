import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  useGetAutofillModelsQuery,
  useGetPromptsByTypeQuery,
  useRegenerateFieldMutation,
} from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  REGENERATE_TYPE,
} from "@constants";

import { getAvailableVariableName } from "../../utils/availableVariables";

/**
 * Per-simulation state entry as stored on `Scenarios.metadata.states`.
 * Mirrors the ally-be `SimulationState` interface. Re-declared here to
 * avoid a hard cross-package type dependency.
 */
export interface SimulationStateFormValue {
  id: string;
  name: string;
  guidelines: string;
  isStarting: boolean;
  scoreLower: number | null;
  scoreUpper: number | null;
  ragEnabled: boolean;
}

interface StatesEditorProps {
  /** RHF id (e.g. "states"). */
  id: string;
  /** Display label shown above the editor. */
  label: string;

  formMethods: UseFormReturn<any>;
  isMandatory?: boolean;
}

const MIN_STATE_GAP = 50;

const generateId = (): string =>
  `state_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;

// New state seed. Bounds default to a sensible [0, 50) window so the
// user has placeholder values they can edit instead of starting with
// missing-number validation errors. The auto-add path in addState
// recomputes ranges via distributeStateRanges so adding a second state
// re-distributes both states into [0,50) / [50,100) automatically.
const blankState = (isFirst: boolean): SimulationStateFormValue => ({
  id: generateId(),
  name: "",
  guidelines: "",
  isStarting: isFirst,
  scoreLower: 0,
  scoreUpper: MIN_STATE_GAP,
  ragEnabled: true,
});

/**
 * Compute deterministic score ranges for N states that satisfy the
 * validation rules (strict numeric bounds, contiguous, min gap 50).
 * Used to override whatever the LLM produced for ranges — LLMs aren't
 * reliable on numeric constraints and we'd rather guarantee a savable
 * set than gamble on the model.
 *
 * Scheme: ranges start at 0 and step by MIN_STATE_GAP. The first state
 * covers [0, 50). ai-learn's score_keeper returns 0 at session start
 * (not null) and our resolver uses upper-exclusive matching, so the
 * first boundary at MIN_STATE_GAP keeps the starting state active on
 * turn 1. Out-of-range scores (above last upper) clamp to the last
 * state at runtime — see _resolve_simulation_state_by_score in ai-learn.
 *
 *   N=1 → [0, 50)
 *   N=2 → [0, 50),  [50, 100)
 *   N=3 → [0, 50),  [50, 100),  [100, 150)
 *   N=4 → [0, 50),  [50, 100),  [100, 150),  [150, 200)
 */
const distributeStateRanges = (
  count: number,
): Array<{ scoreLower: number; scoreUpper: number }> => {
  if (count <= 0) return [];
  const ranges: Array<{ scoreLower: number; scoreUpper: number }> = [];
  for (let i = 0; i < count; i++) {
    ranges.push({
      scoreLower: i * MIN_STATE_GAP,
      scoreUpper: (i + 1) * MIN_STATE_GAP,
    });
  }
  return ranges;
};

/**
 * Client-side mirror of `validateSimulationStates` from ally-be. Returns
 * a list of human-readable errors per state plus a list of cross-cutting
 * errors. Used to surface inline guidance as the user edits — server-side
 * validation is the source of truth on save.
 */
const computeValidation = (
  states: SimulationStateFormValue[],
): { perState: Record<string, string[]>; global: string[] } => {
  const perState: Record<string, string[]> = {};
  const global: string[] = [];

  if (states.length === 0) {
    return { perState, global };
  }

  for (const state of states) {
    perState[state.id] = [];
  }

  const startingCount = states.filter(s => s.isStarting).length;
  if (startingCount === 0) {
    global.push("Exactly one state must be marked as the starting state.");
  } else if (startingCount > 1) {
    global.push(`Only one state may be the starting state; found ${startingCount}.`);
  }

  const sorted = [...states].sort((a, b) => {
    const al = a.scoreLower ?? 0;
    const bl = b.scoreLower ?? 0;
    return al - bl;
  });

  // Strict-bounds rule: every state must have finite numeric bounds.
  // Out-of-range scores at runtime clamp to the nearest end-state, so
  // total coverage is preserved without the legacy "open" placeholder.
  for (const state of sorted) {
    if (typeof state.scoreLower !== "number") {
      perState[state.id].push("Min score is required (finite number).");
    }
    if (typeof state.scoreUpper !== "number") {
      perState[state.id].push("Max score is required (finite number).");
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const state = sorted[i];
    const lower = state.scoreLower;
    const upper = state.scoreUpper;

    if (typeof lower === "number" && typeof upper === "number" && upper - lower < MIN_STATE_GAP) {
      perState[state.id].push(
        `Score range must span at least ${MIN_STATE_GAP} (currently ${upper - lower}).`,
      );
    }

    if (i < sorted.length - 1) {
      const next = sorted[i + 1];
      if (
        typeof upper === "number" &&
        typeof next.scoreLower === "number" &&
        upper !== next.scoreLower
      ) {
        perState[state.id].push(
          `Upper bound (${upper}) must equal next state's lower bound (${next.scoreLower}).`,
        );
      }
    }
  }

  return { perState, global };
};

/**
 * Per-simulation states editor for main-agent prompts with `hasStates: true`.
 * Stores results as `states: SimulationState[]` on the form, persisted into
 * `scenario.metadata.states`. The runtime resolves the active state by
 * current turn score and injects its guidelines into the prompt's
 * `{state_x_guidelines}` slot.
 *
 * Self-hides when the simulation's selected main-agent prompt doesn't have
 * `hasStates: true` — no extra wiring needed at the parent form level.
 */
export const StatesEditor: React.FC<StatesEditorProps> = ({
  id,
  label,
  formMethods,
  isMandatory = false,
}) => {
  const { data: prompts } = useGetPromptsByTypeQuery("main_agent");

  const selectedPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;

  // Visibility gate: body-driven, matching how every other variable-aware
  // field works. The States editor shows iff the picked variant's prompt
  // body references `{state_x_guidelines}` (auto-reconciled into
  // `availableVariables` on every save). Falling back to the legacy
  // `hasStates` boolean keeps existing variants visible during the
  // transition — admins re-saving a prompt with the placeholder removed
  // will see the editor auto-hide on next load.
  const selectedHasStates = useMemo(() => {
    if (!selectedPromptCode) return false;
    const match = prompts?.find(p => p.promptCode === selectedPromptCode);
    if (!match) return false;
    const usedNames = new Set((match.availableVariables ?? []).map(getAvailableVariableName));
    if (usedNames.has("state_x_guidelines")) return true;
    // Legacy fallback for rows whose availableVariables hasn't been
    // re-reconciled yet (e.g. old data created before auto-reconcile).
    return Boolean(match.hasStates);
  }, [prompts, selectedPromptCode]);

  const watchedStates = (formMethods.watch(id) as SimulationStateFormValue[] | undefined) ?? [];
  const [states, setStates] = useState<SimulationStateFormValue[]>(watchedStates);

  // Keep local state in sync when the form is reset (e.g. on simulation load).
  // The dep array uses a stringified hash of watchedStates so the effect
  // only fires on actual content change, not on reference churn. ESLint's
  // exhaustive-deps rule isn't configured in this project — if/when it is,
  // the JSON.stringify pattern is the intended workaround.
  useEffect(() => {
    setStates(watchedStates);
  }, [JSON.stringify(watchedStates)]);

  const writeBack = useCallback(
    (next: SimulationStateFormValue[]) => {
      setStates(next);
      formMethods.setValue(id, next, { shouldDirty: true });
    },
    [formMethods, id],
  );

  const addState = useCallback(() => {
    const next: SimulationStateFormValue[] = [...states, blankState(states.length === 0)];
    writeBack(next);
  }, [states, writeBack]);

  const updateState = useCallback(
    (stateId: string, patch: Partial<SimulationStateFormValue>) => {
      writeBack(states.map(s => (s.id === stateId ? { ...s, ...patch } : s)));
    },
    [states, writeBack],
  );

  const setStartingState = useCallback(
    (stateId: string) => {
      writeBack(states.map(s => ({ ...s, isStarting: s.id === stateId })));
    },
    [states, writeBack],
  );

  const removeState = useCallback(
    (stateId: string) => {
      writeBack(states.filter(s => s.id !== stateId));
    },
    [states, writeBack],
  );

  const validation = useMemo(() => computeValidation(states), [states]);

  // Auto-seed a single blank state ONCE per editor-mount when the editor
  // becomes visible with no states. Subsequent "Remove" actions that drop
  // the count to zero must NOT re-seed — otherwise the user can never
  // intentionally clear the editor (after removing the last card it
  // immediately bounces back). Reset the latch when the selected prompt
  // changes (or hasStates flips off) so re-selecting a hasStates variant
  // on a fresh simulation seeds again.
  const hasAutoSeededRef = useRef(false);
  useEffect(() => {
    if (!selectedHasStates) {
      hasAutoSeededRef.current = false;
      return;
    }
    if (states.length === 0 && !hasAutoSeededRef.current) {
      hasAutoSeededRef.current = true;
      const seed = [blankState(true)];
      setStates(seed);
      formMethods.setValue(id, seed, { shouldDirty: false });
    }
  }, [selectedHasStates, states.length, formMethods, id]);

  // ---- Autofill (Generate / Regenerate) ----------------------------------
  // Mirrors the RegenerateButton pattern but local to StatesEditor because
  // states need custom request context (numStates, existingStates) and a
  // bespoke merge step on response.
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  // A state card is "blank" iff its `name` is empty / whitespace. We key
  // off name specifically (rather than name OR guidelines) for two reasons:
  // (1) the backend's SimulationStateDto.name is @IsNotEmpty(), so a state
  //     without a name is the canonical "incomplete" card that CreateSimulation
  //     drops at save time — same heuristic across the editor and the save path.
  // (2) Authors sometimes draft guidelines before naming a state; treating
  //     guideline-only cards as "filled" would prevent Generate from finding
  //     blanks to fill, which is unintuitive.
  const isBlankState = useCallback((s: SimulationStateFormValue) => !s.name?.trim(), []);
  const blankCount = states.filter(isBlankState).length;
  const allBlank = blankCount === states.length;
  const anyFilled = blankCount < states.length;

  // Button text: matches RegenerateButton's vocabulary so the UI feels
  // consistent across the studio.
  const generateLabel = isGenerating
    ? "Generating…"
    : allBlank
      ? "Generate"
      : anyFilled && blankCount > 0
        ? "Fill blanks"
        : "Regenerate";

  const buildScenarioContext = useCallback(() => {
    const values = formMethods.getValues();
    return {
      title: values.title,
      name: values.name,
      age: values.age,
      gender: values.gender,
      genderIdentity: values.genderIdentity,
      sexualOrientation: values.sexualOrientation,
      profession: values.profession,
      currentLocation: values.currentLocation,
      competency: values.competency?.name,
      characterProfileText: values.characterProfileText,
      challengeDescription: values.description,
    };
  }, [formMethods]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    // Mode 1: some blanks alongside filled cards → fill only the blanks,
    //         keep filled ones, ask LLM for exactly `blankCount` new states
    //         that complement the existing ones.
    // Mode 2: all cards blank → generate `states.length` fresh states.
    // Mode 3: all cards filled (user clicked Regenerate) → re-roll the whole
    //         set, ask for `states.length` fresh states; existing names go
    //         into context so the LLM can produce variation.
    const numToGenerate = anyFilled && blankCount > 0 ? blankCount : states.length;
    const filledForContext = states.filter(s => !isBlankState(s));
    const existingStatesJson =
      filledForContext.length > 0
        ? JSON.stringify(
            filledForContext.map(s => ({
              name: s.name,
              guidelines: s.guidelines,
              scoreLower: s.scoreLower,
              scoreUpper: s.scoreUpper,
            })),
          )
        : "";

    setIsGenerating(true);
    try {
      const response = await regenerateField({
        fieldName: REGENERATE_TYPE.STATES,
        scenarioContext: {
          ...buildScenarioContext(),
          numStates: numToGenerate,
          existingStates: existingStatesJson,
        },
        model: selectedModel,
        provider: selectedProvider,
      }).unwrap();

      // Backend's autofill-shared.util.ts `extractContent` for the STATES
      // case returns `SimulationStateAutofillItem[]` directly (not wrapped
      // in `{states: [...]}`). Older shapes may have nested it under
      // `.states` — accept either so we don't crash on schema drift.
      const raw = response.content;
      // Debug log so we can see the response shape when generation fails.
      // Safe to leave in for now; removable once UX is stable.
      // eslint-disable-next-line no-console
      console.debug("[StatesEditor] regenerate response", response);
      const generated: Array<Omit<SimulationStateFormValue, "id">> = Array.isArray(raw)
        ? (raw as Array<Omit<SimulationStateFormValue, "id">>)
        : Array.isArray((raw as { states?: unknown })?.states)
          ? (raw as { states: Array<Omit<SimulationStateFormValue, "id">> }).states
          : [];
      if (generated.length === 0) {
        // eslint-disable-next-line no-console
        console.error("[StatesEditor] regenerate returned no states; raw content:", raw);
        toast.error("Generation returned no states. Try a different model.");
        return;
      }

      // Compute deterministic ranges so the result always satisfies the
      // validation rules. LLMs aren't reliable on contiguity / open-bound /
      // min-gap constraints — better to trust them for creative content
      // (name + guidelines + ragEnabled) and synthesize the numbers ourselves.
      // The user can still adjust ranges manually after generation.
      const ranges = distributeStateRanges(generated.length);
      const withIds: SimulationStateFormValue[] = generated.map((g, i) => ({
        id: generateId(),
        name: g.name ?? "",
        guidelines: g.guidelines ?? "",
        isStarting: i === 0,
        scoreLower: ranges[i]?.scoreLower ?? null,
        scoreUpper: ranges[i]?.scoreUpper ?? null,
        ragEnabled: g.ragEnabled ?? true,
      }));

      const isFillBlanksMode = anyFilled && blankCount > 0;
      let next: SimulationStateFormValue[];
      if (isFillBlanksMode) {
        // Fill-blanks mode: walk existing array, replace blanks with
        // generated entries in order, preserving filled cards entirely
        // (including any manually-tuned score ranges). Pull only
        // name + guidelines + ragEnabled from the generated content.
        // If generated count > blank count, truncate; if fewer, leave
        // remaining blanks alone.
        //
        // We intentionally do NOT call distributeStateRanges here: that
        // would clobber the user's manually-tuned ranges on already-
        // filled cards. The newly-filled cards keep whatever ranges
        // they had as blank cards (from blankState() defaults or
        // earlier user edits). If the resulting set isn't contiguous,
        // the inline validation in the editor will flag it and the
        // user can adjust manually before saving.
        let cursor = 0;
        next = states.map(s => {
          if (!isBlankState(s) || cursor >= withIds.length) return s;
          const gen = withIds[cursor];
          cursor += 1;
          return {
            ...s,
            name: gen.name,
            guidelines: gen.guidelines,
            ragEnabled: gen.ragEnabled,
          };
        });
      } else {
        // All-blank or all-filled: replace everything wholesale AND
        // redistribute ranges deterministically. This is a "fresh start"
        // operation; the user's expectation is uniform default ranges
        // that they can then adjust.
        next = withIds;
        const finalRanges = distributeStateRanges(next.length);
        next = next.map((s, i) => ({
          ...s,
          isStarting: i === 0,
          scoreLower: finalRanges[i]?.scoreLower ?? null,
          scoreUpper: finalRanges[i]?.scoreUpper ?? null,
        }));
      }

      writeBack(next);
      toast.success("States generated.");
    } catch {
      toast.error("Failed to generate states.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    isGenerating,
    anyFilled,
    blankCount,
    states,
    isBlankState,
    regenerateField,
    buildScenarioContext,
    selectedModel,
    selectedProvider,
    writeBack,
  ]);
  // ------------------------------------------------------------------------

  if (!selectedHasStates) {
    // The simulation hasn't picked a `hasStates: true` variant. Hide the
    // editor entirely so the form stays focused on relevant fields.
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <label className="text-typography-900 text-base flex items-center gap-1">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        <div className="flex items-center gap-3">
          <AutofillModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isGenerating}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || states.length === 0}
            className={`flex items-center gap-1 text-sm border rounded-2xl px-2 py-1 transition-opacity ${
              isGenerating || states.length === 0
                ? "text-primary-300 border-primary-300 cursor-not-allowed"
                : "text-primary-500 border-primary-500 hover:bg-primary-50 cursor-pointer"
            } ${isGenerating ? "animate-fadeInOut" : ""}`}
            title={
              isGenerating
                ? ""
                : "Generate state content for blank cards (or regenerate all when no blanks remain). Use + Add state to control the count first."
            }
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WandStars />
            )}{" "}
            {generateLabel}
          </button>
          <button
            type="button"
            onClick={addState}
            className="text-sm text-primary hover:text-primary-700"
          >
            + Add state
          </button>
        </div>
      </div>

      {validation.global.length > 0 && (
        <div className="rounded border border-destructive-200 bg-destructive-50 px-3 py-2 text-sm text-destructive-700">
          {validation.global.map(msg => (
            <div key={msg}>{msg}</div>
          ))}
        </div>
      )}

      {states.map(state => {
        const errors = validation.perState[state.id] ?? [];
        return (
          <div
            key={state.id}
            className="rounded border border-border-light bg-white p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-typography-700">
                <input
                  type="radio"
                  name={`${id}-starting`}
                  checked={state.isStarting}
                  onChange={() => setStartingState(state.id)}
                  className="h-4 w-4 cursor-pointer"
                />
                Starting state
              </label>
              <label className="flex items-center gap-2 text-sm text-typography-700">
                <input
                  type="checkbox"
                  checked={state.ragEnabled}
                  onChange={event => updateState(state.id, { ragEnabled: event.target.checked })}
                  className="h-4 w-4 cursor-pointer"
                />
                RAG enabled
              </label>
              <button
                type="button"
                onClick={() => removeState(state.id)}
                className="text-sm text-destructive-500 hover:text-destructive-700"
              >
                Remove
              </button>
            </div>

            <input
              type="text"
              value={state.name}
              onChange={event => updateState(state.id, { name: event.target.value })}
              placeholder="State name (e.g. Withdrawn, Engaged, Reflective)"
              className="rounded border border-border-light px-2 py-1 text-sm"
            />

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-typography-700">Min score</span>
                <input
                  type="number"
                  value={state.scoreLower ?? ""}
                  placeholder="e.g. 0"
                  onChange={event => {
                    // Empty input keeps the state's bound as null briefly so
                    // the field can be cleared and retyped; validation flags
                    // the missing number until a digit lands. Once typed,
                    // bound is stored as a finite number.
                    const raw = event.target.value;
                    updateState(state.id, {
                      scoreLower: raw === "" ? null : Number(raw),
                    });
                  }}
                  className="rounded border border-border-light px-2 py-1 text-sm w-24"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-typography-700">Max score</span>
                <input
                  type="number"
                  value={state.scoreUpper ?? ""}
                  placeholder="e.g. 50"
                  onChange={event => {
                    const raw = event.target.value;
                    updateState(state.id, {
                      scoreUpper: raw === "" ? null : Number(raw),
                    });
                  }}
                  className="rounded border border-border-light px-2 py-1 text-sm w-24"
                />
              </div>
              <span className="text-xs text-typography-500">
                Both bounds required. Range must span ≥ {MIN_STATE_GAP}. Scores beyond the last
                state's max clamp to that state at runtime.
              </span>
            </div>

            <textarea
              value={state.guidelines}
              onChange={event => updateState(state.id, { guidelines: event.target.value })}
              placeholder="Guidelines injected into {state_x_guidelines} when this state is active."
              className="rounded border border-border-light px-2 py-1 text-sm min-h-[60px]"
            />

            {errors.length > 0 && (
              <ul className="text-xs text-destructive-600 list-disc list-inside">
                {errors.map(msg => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};
