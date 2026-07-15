import React from "react";

import { TrashCan } from "@carbon/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import {
  Button,
  Checkbox,
  CheckboxGroup,
  Select,
  SelectItem,
  TextArea,
  TextInput,
  Tile,
} from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { removeTransition, selectRoleplaySpec, upsertTransition } from "@reducer";
import { RoleplayTransition } from "@src/types/roleplayStudio";

import { SidePanelShell } from "./SidePanelShell";

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
  legend: string;
  idPrefix: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: Array<{ id: string; name: string }>;
}> = ({ legend, idPrefix, value, onChange, options }) => (
  <CheckboxGroup legendText={legend}>
    <Tile className="mt-1 flex max-h-44 flex-col gap-1.5 overflow-y-auto custom-scrollbar">
      {options.length === 0 && (
        <span className="text-xs text-typography-500">{en.common.noOptionsAvailable}</span>
      )}
      {options.map(option => (
        <Checkbox
          key={option.id}
          id={`${idPrefix}-${option.id}`}
          labelText={option.name || option.id}
          checked={value.includes(option.id)}
          onChange={(_event, { checked }) =>
            onChange(checked ? [...value, option.id] : value.filter(id => id !== option.id))
          }
        />
      ))}
    </Tile>
  </CheckboxGroup>
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
        <Button
          kind="danger--ghost"
          size="sm"
          renderIcon={TrashCan}
          onClick={handleDelete}
          type="button"
        >
          {en.common.delete}
        </Button>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <Select id="rp-transition-to" labelText={strings.toState} {...register("toStateId")}>
          {states.map(state => (
            <SelectItem key={state.id} value={state.id} text={state.name || state.id} />
          ))}
        </Select>

        <TextArea
          id="rp-transition-description"
          labelText={strings.transitionDescription}
          rows={3}
          {...register("description")}
        />

        <Controller
          control={control}
          name="whenBehaviorsAny"
          render={({ field }) => (
            <BehaviorChecklist
              legend={strings.whenBehaviorsAny}
              idPrefix={field.name}
              value={field.value}
              onChange={field.onChange}
              options={behaviors}
            />
          )}
        />

        <Controller
          control={control}
          name="whenBehaviorsAll"
          render={({ field }) => (
            <BehaviorChecklist
              legend={strings.whenBehaviorsAll}
              idPrefix={field.name}
              value={field.value}
              onChange={field.onChange}
              options={behaviors}
            />
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextInput
            id="rp-transition-min-turns"
            type="number"
            min={0}
            labelText={strings.minTurnsInState}
            {...register("minTurnsInState")}
          />
          <TextInput
            id="rp-transition-min-score"
            type="number"
            labelText={strings.minCumulativeScore}
            {...register("minCumulativeScore")}
          />
        </div>
      </form>
    </SidePanelShell>
  );
};
