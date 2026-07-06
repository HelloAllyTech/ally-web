import React from "react";

import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { FormLabel } from "@components";
import { en } from "@constants";
import { removeTransition, selectRoleplaySpec, upsertTransition } from "@reducer";
import { RoleplayTransition } from "@src/types/roleplayStudio";

import { panelFieldClass, SidePanelShell } from "./SidePanelShell";

interface TransitionEditorSidePanelProps {
  fromStateId: string;
  transition: RoleplayTransition;
  onClose: () => void;
}

interface TransitionFormValues {
  description: string;
  toStateId: string;
  whenBehaviorsAny: string[];
  whenBehaviorsAll: string[];
  minTurnsInState: string;
  minCumulativeScore: string;
}

const BehaviorChecklist: React.FC<{
  value: string[];
  onChange: (next: string[]) => void;
  options: Array<{ id: string; name: string }>;
}> = ({ value, onChange, options }) => (
  <div className="flex flex-col gap-1.5 rounded-md border border-border-light p-3 max-h-44 overflow-y-auto custom-scrollbar">
    {options.length === 0 && (
      <span className="text-xs text-typography-500">{en.common.noOptionsAvailable}</span>
    )}
    {options.map(option => (
      <label key={option.id} className="flex items-center gap-2 text-sm text-typography-900">
        <input
          type="checkbox"
          checked={value.includes(option.id)}
          onChange={event =>
            onChange(
              event.target.checked ? [...value, option.id] : value.filter(id => id !== option.id),
            )
          }
        />
        <span className="truncate">{option.name || option.id}</span>
      </label>
    ))}
  </div>
);

/**
 * Transition guard editor: destination, description, behavior guards (any /
 * all, chosen from the rubric), and turn/score thresholds. Commits to the
 * slice on save; the header trash removes the transition.
 */
export const TransitionEditorSidePanel: React.FC<TransitionEditorSidePanelProps> = ({
  fromStateId,
  transition,
  onClose,
}) => {
  const strings = en.roleplayStudio.stateMachine;
  const dispatch = useDispatch();
  const spec = useSelector(selectRoleplaySpec);

  const states = spec?.stateMachine.states ?? [];
  const behaviors = (spec?.rubric.behaviors ?? []).map(behavior => ({
    id: behavior.id,
    name: behavior.name,
  }));

  const { register, handleSubmit, control } = useForm<TransitionFormValues>({
    defaultValues: {
      description: transition.description,
      toStateId: transition.toStateId,
      whenBehaviorsAny: transition.whenBehaviorsAny ?? [],
      whenBehaviorsAll: transition.whenBehaviorsAll ?? [],
      minTurnsInState:
        transition.minTurnsInState !== undefined ? String(transition.minTurnsInState) : "",
      minCumulativeScore:
        transition.minCumulativeScore !== undefined ? String(transition.minCumulativeScore) : "",
    },
  });

  const onSubmit = (values: TransitionFormValues) => {
    dispatch(
      upsertTransition({
        stateId: fromStateId,
        transition: {
          ...transition,
          description: values.description,
          toStateId: values.toStateId,
          whenBehaviorsAny: values.whenBehaviorsAny.length ? values.whenBehaviorsAny : undefined,
          whenBehaviorsAll: values.whenBehaviorsAll.length ? values.whenBehaviorsAll : undefined,
          minTurnsInState:
            values.minTurnsInState.trim() === "" ? undefined : Number(values.minTurnsInState),
          minCumulativeScore:
            values.minCumulativeScore.trim() === "" ? undefined : Number(values.minCumulativeScore),
        },
      }),
    );
    onClose();
  };

  const handleDelete = () => {
    dispatch(removeTransition({ stateId: fromStateId, transitionId: transition.id }));
    onClose();
  };

  return (
    <SidePanelShell
      title={strings.editTransition}
      onCancel={onClose}
      onSave={handleSubmit(onSubmit)}
      headerExtra={
        <button
          type="button"
          onClick={handleDelete}
          className="text-sm text-typography-600 hover:text-destructive-500"
        >
          {en.common.delete}
        </button>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-2">
          <FormLabel>{strings.toState}</FormLabel>
          <select {...register("toStateId")} className={panelFieldClass}>
            {states.map(state => (
              <option key={state.id} value={state.id}>
                {state.name || state.id}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.transitionDescription}</FormLabel>
          <textarea
            {...register("description")}
            rows={3}
            className={`${panelFieldClass} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.whenBehaviorsAny}</FormLabel>
          <Controller
            control={control}
            name="whenBehaviorsAny"
            render={({ field }) => (
              <BehaviorChecklist
                value={field.value}
                onChange={field.onChange}
                options={behaviors}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.whenBehaviorsAll}</FormLabel>
          <Controller
            control={control}
            name="whenBehaviorsAll"
            render={({ field }) => (
              <BehaviorChecklist
                value={field.value}
                onChange={field.onChange}
                options={behaviors}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FormLabel>{strings.minTurnsInState}</FormLabel>
            <input
              type="number"
              min={0}
              {...register("minTurnsInState")}
              className={panelFieldClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <FormLabel>{strings.minCumulativeScore}</FormLabel>
            <input type="number" {...register("minCumulativeScore")} className={panelFieldClass} />
          </div>
        </div>
      </form>
    </SidePanelShell>
  );
};
