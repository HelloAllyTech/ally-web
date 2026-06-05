import React, { useCallback, useEffect, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { TrashRed } from "@assets";
import { useIsPlaceholderUsed } from "@hooks";

import { FormLabel } from "../form-label";
import { cascadeBoundEdit } from "./cascadeBoundEdit";
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
    // Use watchedStates (live form value) not local states to avoid the race
    // where selectedHasStates flips true in the same render as formMethods.reset()
    // but the local states hasn't synced yet — causing the seed to fire even
    // though the form already has states loaded from the API.
    if (watchedStates.length === 0 && !hasAutoSeededRef.current) {
      hasAutoSeededRef.current = true;
      const seed = [seedNextState([])];
      setStates(seed);
      formMethods.setValue(id, seed, { shouldDirty: false });
    }
  }, [selectedHasStates, watchedStates.length, formMethods, id]);

  // ---- Autofill (Generate / Regenerate) ----------------------------------
  // Mirrors the RegenerateButton pattern but local to StatesEditor because
  // states need custom request context (numStates, existingStates) and a
  // bespoke merge step on response.
  // ------------------------------------------------------------------------

  if (!selectedHasStates) {
    // The simulation hasn't picked a `hasStates: true` variant. Hide the
    // editor entirely so the form stays focused on relevant fields.
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
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
                  className={`rounded px-2 py-1 text-sm w-20 focus:outline-none border-b border-border-light ${
                    isFirst
                      ? "bg-neutral-100 text-typography-500 cursor-not-allowed"
                      : "bg-transparent"
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
                  className="rounded bg-transparent px-2 py-1 text-sm w-20 focus:outline-none border-b border-border-light"
                />
              </div>
              <button
                type="button"
                onClick={() => removeState(state.id)}
                className="flex items-center text-typography-500 hover:text-destructive-500 transition-colors"
                aria-label="Remove state"
              >
                <TrashRed className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={state.name}
              onChange={event => updateState(state.id, { name: event.target.value })}
              placeholder="State name (e.g. Withdrawn, Engaged, Reflective)"
              className="w-full bg-transparent px-2 py-1 text-sm border-b border-border-light focus:outline-none focus:border-primary-500"
            />

            <textarea
              value={state.guidelines}
              onChange={event => updateState(state.id, { guidelines: event.target.value })}
              placeholder="Guidelines injected into {state_x_guidelines} when this state is active."
              className="w-full bg-transparent px-2 py-1 text-sm min-h-[60px] focus:outline-none resize-y"
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
