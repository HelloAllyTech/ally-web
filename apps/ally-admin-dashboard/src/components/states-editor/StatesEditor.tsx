import React, { useCallback, useEffect, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { useGetAutofillModelsQuery, useRegenerateFieldMutation } from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  REGENERATE_TYPE,
} from "@constants";
import { useIsPlaceholderUsed } from "@hooks";

import { cascadeBoundEdit, MIN_STATE_GAP } from "./cascadeBoundEdit";
import { seedNextState } from "./stateSeeds";
import { SimulationStateFormValue } from "./types";

// Re-export the form-value type from this barrel for legacy importers
// (the editor used to own it). Anything new should import from
// `./types` directly.
export type { SimulationStateFormValue };

interface StatesEditorProps {
  /** RHF id (e.g. "states"). */
  id: string;
  /** Display label shown above the editor. */
  label: string;

  formMethods: UseFormReturn<any>;
  isMandatory?: boolean;
}

const generateId = (): string =>
  `state_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)
    .toString(36)
    .padStart(3, "0")}`;

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
  const selectedPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;

  // Visibility gate: body-driven, shared with FormField via the
  // useIsPlaceholderUsed hook. The States editor shows iff the picked
  // variant's prompt body references `{state_x_guidelines}` (auto-
  // reconciled into `availableVariables` on every save). The legacy
  // hasStates fallback that used to live here is gone — the 1780100000000
  // backfill migration populates availableVariables for every row, so
  // the reconciled list is now the single source of truth.
  const { isUsed: selectedHasStates } = useIsPlaceholderUsed(
    selectedPromptCode,
    "state_x_guidelines",
  );

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
    // New state's bounds continue from where the last one left off
    // (last.scoreUpper → new.scoreLower). seedNextState handles the
    // empty-list case and the "user mid-typing a bound" edge cases.
    const next: SimulationStateFormValue[] = [...states, seedNextState(states)];
    writeBack(next);
  }, [states, writeBack]);

  const updateState = useCallback(
    (stateId: string, patch: Partial<SimulationStateFormValue>) => {
      writeBack(states.map(s => (s.id === stateId ? { ...s, ...patch } : s)));
    },
    [states, writeBack],
  );

  /**
   * Editing a score bound takes a different path than `updateState`
   * because changes to scoreLower / scoreUpper ripple through neighbouring
   * cards (contiguity + min-gap invariants). Routed through
   * `cascadeBoundEdit` so a single keystroke on one field reflows all
   * affected fields in one writeBack — keeps the form clean of red
   * validation flashes while the user is mid-edit.
   */
  const updateStateBound = useCallback(
    (stateId: string, field: "scoreLower" | "scoreUpper", value: number | null) => {
      const index = states.findIndex(s => s.id === stateId);
      if (index === -1) return;
      writeBack(cascadeBoundEdit(states, index, field, value));
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
      const seed = [seedNextState([])];
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
        </div>
      </div>

      {states.map((state, index) => {
        const isFirst = index === 0;
        return (
          <div
            key={state.id}
            className="rounded border border-border-light bg-white p-3 flex flex-col gap-2"
          >
            {/*
              Single header row packs Starting / RAG / Min / Max / Remove
              together. The cascade hook (updateStateBound) keeps Min and
              Max in lock-step with neighbouring cards, so no helper text
              or inline validation is needed below the inputs.
            */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
              <div className="flex items-center gap-2">
                <span className="text-sm text-typography-700">Min</span>
                <input
                  type="number"
                  // Display layer: each non-first state shows Min as
                  // `scoreLower + 1` so the boundary between adjacent
                  // states reads naturally (state 0 Max=50, state 1
                  // Min=51). Storage stays contiguous (state[i].upper
                  // == state[i+1].lower) so the ai-learn upper-exclusive
                  // resolver continues to work unchanged — only the
                  // displayed number shifts by 1 for non-first states.
                  value={
                    state.scoreLower == null
                      ? ""
                      : isFirst
                        ? state.scoreLower
                        : state.scoreLower + 1
                  }
                  // First state's lower is structurally pinned at 0 (see
                  // cascadeBoundEdit) — disable the input so the lock is
                  // visible, not just enforced silently.
                  readOnly={isFirst}
                  disabled={isFirst}
                  placeholder="e.g. 0"
                  onChange={event => {
                    const raw = event.target.value;
                    // Reverse the +1 display shift before storing for
                    // non-first states. First-state edits are ignored
                    // upstream (cascadeBoundEdit guards on index===0)
                    // so the conversion only matters for index > 0.
                    const parsed = raw === "" ? null : isFirst ? Number(raw) : Number(raw) - 1;
                    updateStateBound(state.id, "scoreLower", parsed);
                  }}
                  className={`rounded border border-border-light px-2 py-1 text-sm w-20 ${
                    isFirst ? "bg-neutral-100 text-typography-500 cursor-not-allowed" : ""
                  }`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-typography-700">Max</span>
                <input
                  type="number"
                  value={state.scoreUpper ?? ""}
                  placeholder="e.g. 50"
                  onChange={event => {
                    const raw = event.target.value;
                    updateStateBound(state.id, "scoreUpper", raw === "" ? null : Number(raw));
                  }}
                  className="rounded border border-border-light px-2 py-1 text-sm w-20"
                />
              </div>
              <button
                type="button"
                onClick={() => removeState(state.id)}
                className="text-sm text-typography-500 hover:text-typography-700"
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

            <textarea
              value={state.guidelines}
              onChange={event => updateState(state.id, { guidelines: event.target.value })}
              placeholder="Guidelines injected into {state_x_guidelines} when this state is active."
              className="rounded border border-border-light px-2 py-1 text-sm min-h-[60px]"
            />
          </div>
        );
      })}

      {/*
        Bottom-anchored add-state action — matches the "+ new row" pattern
        used elsewhere in the studio so users naturally scroll to the
        bottom of the list to extend it.
      */}
      <button
        type="button"
        onClick={addState}
        className="self-start text-sm text-primary hover:text-primary-700"
      >
        + Add state
      </button>
    </div>
  );
};
