import React, { useCallback, useEffect, useRef, useState } from "react";

import { UseFormReturn } from "react-hook-form";

import { TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { TrashRed } from "@assets";
import { ENHANCE_TYPE } from "@constants";
import { useIsPlaceholderUsed } from "@hooks";

import { EnhanceButton } from "../enhance-button";
import { FormLabel } from "../form-label";
import { cascadeBoundEdit, removeStateAndStitch } from "./cascadeBoundEdit";
import { seedNextState, startingStateId } from "./stateSeeds";
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

  const removeState = useCallback(
    (stateId: string) => {
      // Re-stitch so deleting a middle card doesn't leave a score gap
      // between its neighbours (the previous state absorbs the band).
      writeBack(removeStateAndStitch(states, stateId));
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

      {(() => {
        // The starting state is derived, not chosen: it's the card whose
        // range contains 0 (the session's opening score), falling back to
        // the first card when 0 sits below every range. Computed once per
        // render and shown as a read-only badge.
        const startingId = startingStateId(states);
        return states.map((state, index) => {
          const isFirst = index === 0;
          const isLast = index === states.length - 1;
          return (
            <div
              key={state.id}
              className="rounded border border-border-light bg-white p-3 flex flex-col gap-2"
            >
              {/*
              Single header row packs Starting badge / RAG / Min / Max /
              Remove together. The cascade hook (updateStateBound) keeps Min
              and Max in lock-step with neighbouring cards, so no helper text
              or inline validation is needed below the inputs.
            */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                {state.id === startingId ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-2.5 py-0.5 text-sm text-primary-700"
                    title="This state opens the simulation because its range contains the starting score (0). Edit the bounds to change which state starts."
                  >
                    Starting state
                  </span>
                ) : (
                  <span className="text-sm text-transparent select-none" aria-hidden="true">
                    Starting state
                  </span>
                )}
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
                  {/*
                  All Min values are editable, including the first state's
                  (which is the open bottom of the range and may be negative).
                  The −∞ placeholder hints that the first state catches every
                  lower score; it is NOT a lock. Non-first states display Min
                  as `scoreLower + 1` so the boundary between adjacent states
                  reads naturally (state 0 Max=50, state 1 Min=51) — storage
                  stays contiguous (state[i].upper == state[i+1].lower) so the
                  ai-learn upper-exclusive resolver is unaffected.
                */}
                  <input
                    type="number"
                    value={
                      state.scoreLower == null
                        ? ""
                        : isFirst
                          ? state.scoreLower
                          : state.scoreLower + 1
                    }
                    placeholder={isFirst ? "−∞" : "e.g. 51"}
                    title={
                      isFirst
                        ? "Open lower bound — any lower score falls into this state. Editable; may be negative."
                        : undefined
                    }
                    onChange={event => {
                      const raw = event.target.value;
                      // Reverse the +1 display shift before storing for
                      // non-first states; the first state stores its lower
                      // verbatim. Store the typed value as-is WITHOUT clamping
                      // so the field doesn't snap back mid-type; the min-gap
                      // clamp + neighbour cascade run on blur.
                      const parsed = raw === "" ? null : isFirst ? Number(raw) : Number(raw) - 1;
                      updateState(state.id, { scoreLower: parsed });
                    }}
                    onBlur={() => updateStateBound(state.id, "scoreLower", state.scoreLower)}
                    className="rounded bg-transparent px-2 py-1 text-sm w-20 focus:outline-none border-b border-border-light"
                    // Scrolling over a focused number input silently changes its
                    // value in the browser — blur so the page scrolls instead.
                    onWheel={e => e.currentTarget.blur()}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-typography-700">Max</span>
                  {/*
                  The last state's Max is the open top of the range — the
                  runtime clamps any higher score into it — but it stays
                  editable. The +∞ placeholder is a hint, not a lock.
                */}
                  <input
                    type="number"
                    value={state.scoreUpper ?? ""}
                    placeholder={isLast ? "+∞" : "e.g. 50"}
                    title={
                      isLast
                        ? "Open upper bound — any higher score falls into this state. Editable."
                        : undefined
                    }
                    onChange={event => {
                      const raw = event.target.value;
                      // Store as-is while typing; clamp + cascade on blur so a
                      // value momentarily below the min-gap floor doesn't snap
                      // back on every keystroke.
                      updateState(state.id, { scoreUpper: raw === "" ? null : Number(raw) });
                    }}
                    onBlur={() => updateStateBound(state.id, "scoreUpper", state.scoreUpper)}
                    className="rounded bg-transparent px-2 py-1 text-sm w-20 focus:outline-none border-b border-border-light"
                    // Scrolling over a focused number input silently changes its
                    // value in the browser — blur so the page scrolls instead.
                    onWheel={e => e.currentTarget.blur()}
                  />
                </div>
                {(state.name?.trim() || state.guidelines?.trim()) && (
                  <EnhanceButton
                    enhanceType={ENHANCE_TYPE.STATE}
                    label={state.name ? `${state.name} state` : "State"}
                    // Structured field: send both name + guidelines as JSON,
                    // apply the improved pair back to the card.
                    currentValue={JSON.stringify({
                      name: state.name ?? "",
                      guidelines: state.guidelines ?? "",
                    })}
                    onApply={improved => {
                      // The backend normalises this to clean {name,guidelines}
                      // JSON (or fails the request). A parse error here is
                      // therefore unexpected — let it propagate to the
                      // EnhanceButton's error toast rather than writing a raw
                      // blob into the guidelines field.
                      const parsed = JSON.parse(improved) as {
                        name?: string;
                        guidelines?: string;
                      };
                      updateState(state.id, {
                        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
                        ...(typeof parsed.guidelines === "string"
                          ? { guidelines: parsed.guidelines }
                          : {}),
                      });
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeState(state.id)}
                  className="flex items-center text-typography-500 hover:text-destructive-500 transition-colors"
                  aria-label="Remove state"
                >
                  <TrashRed className="w-4 h-4" />
                </button>
              </div>

              <TextInput
                id={`state-name-${state.id}`}
                labelText="State name"
                hideLabel
                value={state.name}
                onChange={event => updateState(state.id, { name: event.target.value })}
                placeholder="State name (e.g. Withdrawn, Engaged, Reflective)"
                className="w-full"
              />

              <TextArea
                id={`state-guidelines-${state.id}`}
                labelText="State guidelines"
                hideLabel
                value={state.guidelines}
                onChange={event => updateState(state.id, { guidelines: event.target.value })}
                placeholder="Guidelines injected into {state_x_guidelines} when this state is active."
                rows={2}
              />
            </div>
          );
        });
      })()}

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
