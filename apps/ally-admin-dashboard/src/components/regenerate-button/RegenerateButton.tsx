import { FC, useState } from "react";

import { toast } from "sonner";

import { useGetAutofillModelsQuery, useRegenerateFieldMutation } from "@api";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  BEHAVIOUR_STATES,
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  FORM_FIELD_IDS,
  REGENERATE_TYPE,
  en,
} from "@constants";
import { RegenerateFieldResponse } from "@types";
import { isNonEmptyArray, isNonEmptyObject, isNonEmptyString } from "@utils";

import { AutofillButton } from "../autofill-button";

interface RegenerateButtonProps {
  regenerateType?: string;
  label?: string;
  formMethods?: any;
  disabled?: boolean;
}

export const RegenerateButton: FC<RegenerateButtonProps> = ({
  regenerateType,
  label,
  formMethods,
  disabled = false,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";

  const buildScenarioContext = () => {
    if (!formMethods) return {};

    const formValues = formMethods.getValues();

    // The age input is registered without valueAsNumber, so it always reads
    // back as a string. The backend DTO requires a number, so coerce here and
    // omit it entirely when blank/invalid rather than sending a string.
    const ageNumber = Number(formValues.age);
    const hasValidAge =
      formValues.age != null && formValues.age !== "" && Number.isFinite(ageNumber);

    return {
      title: formValues.title ?? "",
      name: formValues.name,
      ...(hasValidAge ? { age: ageNumber } : {}),
      gender: formValues.gender,
      genderIdentity: formValues.genderIdentity,
      sexualOrientation: formValues.sexualOrientation,
      profession: formValues.profession,
      currentLocation: formValues.currentLocation,
      competency: formValues.competency?.name,
      characterProfileText: formValues.characterProfileText,
      challengeDescription: formValues.description,
    };
  };

  const transformStateInstructionsFromObject = (content: any): any[] => {
    const values = Object.values(content) as any[];
    return values.slice(0, BEHAVIOUR_STATES.length).map((item: any, index: number) => ({
      stateId: BEHAVIOUR_STATES[index].stateId,
      instruction: item.instruction,
      dialogues: item.dialogues,
    }));
  };

  const processRegenerateResponse = (response: RegenerateFieldResponse) => {
    if (!formMethods) return;

    const { fieldName, content } = response;
    const showError = () => toast.error(`${en.errors.failedToRegenerate} ${label || "field"}`);

    // Configuration map for field processing
    const fieldProcessors: Record<
      string,
      {
        validate: (content: any) => boolean;
        transform?: (content: any) => any;
        fieldId: string;
      }
    > = {
      [REGENERATE_TYPE.OPENING_STATEMENTS]: {
        validate: content => isNonEmptyArray(content),
        transform: content => content?.join("\n") ?? "",
        fieldId: FORM_FIELD_IDS.OPENING_STATEMENTS,
      },
      [REGENERATE_TYPE.CHARACTER_PROFILE_TEXT]: {
        validate: isNonEmptyString,
        fieldId: FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT,
      },
      [REGENERATE_TYPE.DESCRIPTION]: {
        validate: isNonEmptyString,
        fieldId: FORM_FIELD_IDS.DESCRIPTION,
      },
      [REGENERATE_TYPE.STATE_INSTRUCTIONS]: {
        validate: content => isNonEmptyArray(content) || isNonEmptyObject(content),
        transform: content =>
          isNonEmptyArray(content) ? content : transformStateInstructionsFromObject(content),
        fieldId: FORM_FIELD_IDS.STATE_INSTRUCTIONS,
      },
      [REGENERATE_TYPE.BEHAVIOR_INSTRUCTIONS]: {
        validate: content =>
          isNonEmptyArray(content) ||
          (isNonEmptyObject(content) && isNonEmptyArray(content.instructions)),
        transform: content => {
          const instructions = Array.isArray(content) ? content : content?.instructions;
          const stateNames = !Array.isArray(content) ? content?.stateNames : null;

          if (isNonEmptyArray(stateNames)) {
            formMethods.setValue(FORM_FIELD_IDS.STATE_NAMES, stateNames, { shouldDirty: true });
          }

          return (instructions ?? []).map((item: any, index: number) => ({
            id: `temp-${index}-${Date.now()}`,
            ...item,
          }));
        },
        fieldId: FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS,
      },
    };

    const processor = fieldProcessors[fieldName];

    if (!processor) {
      toast.error(`${en.errors.failedToRegenerate} ${label || "field"}`);
      return;
    }

    if (processor.validate(content)) {
      const value = processor.transform ? processor.transform(content) : (content ?? "");
      formMethods.setValue(processor.fieldId, value, { shouldDirty: true });
      toast.success(`${label || "Field"} ${en.simulation.regeneratedSuccessfully}`);
    } else {
      showError();
    }
  };

  const getWatchedFieldId = () => {
    switch (regenerateType) {
      case REGENERATE_TYPE.OPENING_STATEMENTS:
        return FORM_FIELD_IDS.OPENING_STATEMENTS;
      case REGENERATE_TYPE.CHARACTER_PROFILE_TEXT:
        return FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT;
      case REGENERATE_TYPE.DESCRIPTION:
        return FORM_FIELD_IDS.DESCRIPTION;
      case REGENERATE_TYPE.STATE_INSTRUCTIONS:
        return FORM_FIELD_IDS.STATE_INSTRUCTIONS;
      case REGENERATE_TYPE.BEHAVIOR_INSTRUCTIONS:
        return FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS;
      default:
        return null;
    }
  };

  const watchedFieldId = getWatchedFieldId();
  const watchedFieldValue = formMethods?.watch(watchedFieldId ?? "") ?? null;

  const isFieldEmpty = () => {
    const fieldValue = watchedFieldId ? watchedFieldValue : null;
    if (fieldValue === null || fieldValue === undefined) return true;
    if (typeof fieldValue === "string") return fieldValue.trim() === "";
    if (Array.isArray(fieldValue)) {
      if (fieldValue.length === 0) return true;
      // Behaviour instructions: treat as empty when every row is blank
      // (no category and no behaviors selected) — the component seeds one
      // blank placeholder row on mount so the array is never truly empty.
      if (regenerateType === REGENERATE_TYPE.BEHAVIOR_INSTRUCTIONS) {
        return fieldValue.every(
          (row: any) =>
            (!row?.category || String(row.category).trim() === "") &&
            (!row?.behaviors || row.behaviors.length === 0),
        );
      }
      return false;
    }
    return false;
  };

  const getButtonText = () => {
    if (isRegenerating) {
      return en.simulation.generating;
    } else if (isFieldEmpty()) {
      return en.simulation.generate;
    } else {
      return en.simulation.regenerate;
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateType || isRegenerating || !formMethods) return;

    setIsRegenerating(true);
    try {
      const scenarioContext = buildScenarioContext();

      const response = await regenerateField({
        fieldName: regenerateType,
        scenarioContext,
        model: selectedModel,
        provider: selectedProvider,
      }).unwrap();

      processRegenerateResponse(response);
    } catch {
      toast.error(`${en.errors.failedToRegenerate} ${label || "field"}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!regenerateType) {
    return null;
  }

  const buttonText = getButtonText();

  return (
    <div className="flex items-center gap-2">
      <AutofillModelSelect
        value={selectedModel}
        onChange={setSelectedModel}
        disabled={isRegenerating || disabled}
      />
      <AutofillButton
        onClick={handleRegenerate}
        isLoading={isRegenerating}
        label={buttonText}
        disabled={disabled}
        compact
      />
    </div>
  );
};
