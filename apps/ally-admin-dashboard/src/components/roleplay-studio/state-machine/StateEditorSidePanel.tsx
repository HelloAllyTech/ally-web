import React from "react";

import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { Checkbox, TextArea, TextInput } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { setInitialState, upsertState } from "@reducer";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { SidePanelShell } from "./SidePanelShell";

interface StateEditorSidePanelProps {
  state: RoleplayStateNode;
  isInitial: boolean;
  onClose: () => void;
}

interface StateFormValues {
  name: string;
  emotionalRegister: string;
  disclosurePosture: string;
  resistanceLevel: string;
  stateCard: string;
  defaultStageDirection: string;
  prosodyHints: string;
  isInitial: boolean;
}

/**
 * Local react-hook-form editor for one state; commits to the roleplaySpec
 * slice only on save so canceling never leaves half-edited state behind.
 */
export const StateEditorSidePanel: React.FC<StateEditorSidePanelProps> = ({
  state,
  isInitial,
  onClose,
}) => {
  const strings = en.roleplayStudio.stateMachine;
  const dispatch = useDispatch();

  const { register, handleSubmit, control } = useForm<StateFormValues>({
    defaultValues: {
      name: state.name,
      emotionalRegister: state.emotionalRegister,
      disclosurePosture: state.disclosurePosture,
      resistanceLevel: state.resistanceLevel,
      stateCard: state.stateCard,
      defaultStageDirection: state.defaultStageDirection,
      prosodyHints: state.prosodyHints,
      isInitial,
    },
  });

  const onSubmit = (values: StateFormValues) => {
    dispatch(
      upsertState({
        ...state,
        name: values.name,
        emotionalRegister: values.emotionalRegister,
        disclosurePosture: values.disclosurePosture,
        resistanceLevel: values.resistanceLevel,
        stateCard: values.stateCard,
        defaultStageDirection: values.defaultStageDirection,
        prosodyHints: values.prosodyHints,
      }),
    );
    if (values.isInitial && !isInitial) dispatch(setInitialState(state.id));
    onClose();
  };

  return (
    <SidePanelShell title={strings.editState} onCancel={onClose} onSave={handleSubmit(onSubmit)}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          id="rp-state-name"
          labelText={
            <span className="flex items-center gap-1">
              {strings.stateName}
              <span className="text-destructive-500">*</span>
            </span>
          }
          {...register("name", { required: true })}
        />

        <div className="grid grid-cols-2 gap-4">
          <TextInput
            id="rp-state-register"
            labelText={strings.emotionalRegister}
            {...register("emotionalRegister")}
          />
          <TextInput
            id="rp-state-resistance"
            labelText={strings.resistanceLevel}
            {...register("resistanceLevel")}
          />
        </div>

        <TextInput
          id="rp-state-disclosure"
          labelText={strings.disclosurePosture}
          {...register("disclosurePosture")}
        />

        <TextArea
          id="rp-state-card"
          labelText={strings.stateCard}
          rows={5}
          {...register("stateCard")}
        />

        <TextArea
          id="rp-state-stage"
          labelText={strings.defaultStageDirection}
          rows={3}
          {...register("defaultStageDirection")}
        />

        <TextInput
          id="rp-state-prosody"
          labelText={strings.prosodyHints}
          {...register("prosodyHints")}
        />

        <Controller
          control={control}
          name="isInitial"
          render={({ field }) => (
            <Checkbox
              id="rp-state-initial"
              labelText={strings.initialState}
              checked={field.value}
              disabled={isInitial}
              onChange={(_event, { checked }) => field.onChange(checked)}
            />
          )}
        />
      </form>
    </SidePanelShell>
  );
};
