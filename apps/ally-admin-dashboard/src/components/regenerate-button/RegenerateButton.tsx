import { FC, useState } from "react";

import { toast } from "sonner";

import { useRegenerateFieldMutation } from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import { DEFAULT_AUTOFILL_MODEL, FORM_FIELD_IDS, REGENERATE_TYPE, en } from "@constants";
import { RegenerateFieldResponse } from "@types";
import { isNonEmptyArray, isNonEmptyObject, isNonEmptyString } from "@utils";

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
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);

  const buildScenarioContext = () => {
    if (!formMethods) return {};

    const formValues = formMethods.getValues();

    return {
      title: formValues.title,
      name: formValues.name,
      age: formValues.age,
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
    return Object.values(content).map((item: any, index: number) => ({
      stateId: (index + 1).toString(),
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
        validate: content => isNonEmptyArray(content),
        transform: content =>
          content?.map((item: any, index: number) => ({
            id: `temp-${index}`,
            ...item,
          })),
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
      formMethods.setValue(processor.fieldId, value);
    } else {
      showError();
    }
  };

  const getFieldValue = () => {
    if (!formMethods || !regenerateType) return null;

    const formValues = formMethods.getValues();

    switch (regenerateType) {
      case REGENERATE_TYPE.OPENING_STATEMENTS:
        return formValues[FORM_FIELD_IDS.OPENING_STATEMENTS];
      case REGENERATE_TYPE.CHARACTER_PROFILE_TEXT:
        return formValues[FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT];
      case REGENERATE_TYPE.DESCRIPTION:
        return formValues[FORM_FIELD_IDS.DESCRIPTION];
      case REGENERATE_TYPE.STATE_INSTRUCTIONS:
        return formValues[FORM_FIELD_IDS.STATE_INSTRUCTIONS];
      case REGENERATE_TYPE.BEHAVIOR_INSTRUCTIONS:
        return formValues[FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS];
      default:
        return null;
    }
  };

  const isFieldEmpty = () => {
    const fieldValue = getFieldValue();
    if (fieldValue === null || fieldValue === undefined) return true;
    if (Array.isArray(fieldValue)) return fieldValue.length === 0;
    if (typeof fieldValue === "string") return fieldValue.trim() === "";
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
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={isRegenerating || disabled}
        className={`flex items-center gap-1 text-sm border rounded-2xl px-2 py-1 cursor-pointer transition-opacity ${
          isRegenerating || disabled
            ? "text-primary-300 border-primary-300 cursor-not-allowed"
            : "text-primary-500 border-primary-500 hover:bg-primary-50"
        } ${isRegenerating ? "animate-fadeInOut" : ""}`}
      >
        {isRegenerating ? (
          <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
        ) : (
          <WandStars />
        )}{" "}
        {buttonText}
      </button>
    </div>
  );
};
