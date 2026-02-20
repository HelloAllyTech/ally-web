import { FC, useState } from "react";

import { toast } from "sonner";

import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
import { useRegenerateFieldMutation } from "@api";
import { WandStars } from "@assets";
import { FORM_FIELD_IDS, REGENERATE_TYPE, en } from "@constants";
import { RegenerateFieldResponse } from "@types";

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
      challengeDescription: formValues.context,
    };
  };

  const processRegenerateResponse = (response: RegenerateFieldResponse) => {
    if (!formMethods) return;

    switch (response.fieldName) {
      case REGENERATE_TYPE.OPENING_STATEMENTS:
        formMethods.setValue(
          FORM_FIELD_IDS.OPENING_STATEMENTS,
          response?.content?.join("\n") ?? "",
        );
        break;
      case REGENERATE_TYPE.CHARACTER_PROFILE_TEXT:
        formMethods.setValue(FORM_FIELD_IDS.CHARACTER_PROFILE_TEXT, response?.content ?? "");
        break;
      case REGENERATE_TYPE.DESCRIPTION:
        formMethods.setValue(FORM_FIELD_IDS.CONTEXT, response?.content ?? "");
        break;
      case REGENERATE_TYPE.STATE_INSTRUCTIONS:
        formMethods.setValue(FORM_FIELD_IDS.STATE_INSTRUCTIONS, response?.content || []);
        break;
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
      }).unwrap();

      processRegenerateResponse(response);
    } catch {
      toast.error(`${en.errors.failedToRegenerate} ${label || "field"}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!FEATURE_FLAGS_MAP.SIMULATION_CREATOR_FLAG || !regenerateType) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleRegenerate}
      disabled={isRegenerating || disabled}
      className={`flex items-center gap-1 text-sm border rounded-2xl px-2 py-1 cursor-pointer transition-opacity ${
        isRegenerating || disabled
          ? "text-primary-300 border-primary-300 opacity-50 cursor-not-allowed"
          : "text-primary-500 border-primary-500 hover:bg-primary-50"
      }`}
    >
      <WandStars /> {isRegenerating ? "Regenerating..." : "Regenerate"}
    </button>
  );
};
