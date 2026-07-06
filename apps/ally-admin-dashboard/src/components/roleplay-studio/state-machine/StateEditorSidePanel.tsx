import React from "react";

import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { FormLabel } from "@components";
import { en } from "@constants";
import { setInitialState, upsertState } from "@reducer";
import { RoleplayStateNode } from "@src/types/roleplayStudio";

import { panelFieldClass, SidePanelShell } from "./SidePanelShell";

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

  const { register, handleSubmit } = useForm<StateFormValues>({
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
        <div className="flex flex-col gap-2">
          <FormLabel isMandatory>{strings.stateName}</FormLabel>
          <input {...register("name", { required: true })} className={panelFieldClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FormLabel>{strings.emotionalRegister}</FormLabel>
            <input {...register("emotionalRegister")} className={panelFieldClass} />
          </div>
          <div className="flex flex-col gap-2">
            <FormLabel>{strings.resistanceLevel}</FormLabel>
            <input {...register("resistanceLevel")} className={panelFieldClass} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.disclosurePosture}</FormLabel>
          <input {...register("disclosurePosture")} className={panelFieldClass} />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.stateCard}</FormLabel>
          <textarea {...register("stateCard")} rows={5} className={`${panelFieldClass} resize-y`} />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.defaultStageDirection}</FormLabel>
          <textarea
            {...register("defaultStageDirection")}
            rows={3}
            className={`${panelFieldClass} resize-y`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <FormLabel>{strings.prosodyHints}</FormLabel>
          <input {...register("prosodyHints")} className={panelFieldClass} />
        </div>

        <label className="flex items-center gap-2 text-sm text-typography-900">
          <input type="checkbox" {...register("isInitial")} disabled={isInitial} />
          {strings.initialState}
        </label>
      </form>
    </SidePanelShell>
  );
};
