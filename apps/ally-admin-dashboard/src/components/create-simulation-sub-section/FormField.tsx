import { FC } from "react";

import { FILE_TYPE, FORM_FIELD_TYPES, en } from "@constants";
import { FormFieldProps } from "@types";

import { AutoTerminationRuleField } from "../auto-termination-rule-field";
import { BehavioursAndStatesInstruction } from "../behaviours-and-states-instruction";
import { BehavioursInstruction } from "../behaviours-instruction";
import { ChallengeDescriptionPanel } from "../challenge-description";
import { CharacterProfileSelector } from "../character-profile-selector";
import { Competency } from "../competency";
import { CustomFieldGroup } from "../custom-field-group";
import { DropdownField } from "../dropdown-field";
import { FileUpload } from "../file-upload";
import { InputField } from "../input-field";
import { KnowledgeSource } from "../knowledge-source";
import { LanguageVoiceMapping } from "../language-voice-mapping";
import { LinguisticStyleSamples } from "../linguistic-style-samples";
import { OpeningDialoguesPanel } from "../opening-dialogues";
import { RadioButtonGroup } from "../radio-button-group";
import { RegenerateButton } from "../regenerate-button";
import { StateInstruction } from "../states-instruction";
import { TagSelector } from "../tag-selector";
import { TimeInput } from "../time-input";
import { ToggleSection } from "../toggle-section";

export const FormField: FC<FormFieldProps> = ({ config, formMethods }) => {
  const {
    label,
    placeholder,
    type,
    options,
    id,
    maxLength,
    multiline,
    isMandatory,
    defaultValue,
    note,
    regenerateType,
  } = config;
  const {
    formState: { errors },
  } = formMethods;

  const updateTriggerWarnings = triggerWarning => {
    formMethods.setValue("triggerWarningIds", triggerWarning);
  };

  const regenerateButton = regenerateType ? (
    <RegenerateButton regenerateType={regenerateType} label={label} formMethods={formMethods} />
  ) : null;

  const getFieldElement = () => {
    switch (type) {
      case FORM_FIELD_TYPES.SELECT:
        return (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
                {label} {isMandatory && <span className="text-destructive-500">*</span>}
              </label>
            </div>
            <DropdownField
              id={id}
              label={label}
              formMethods={formMethods}
              options={options ?? []}
              isMandatory={isMandatory}
            />
            {errors && (
              <p className="text-destructive-500 text-sm mt-1">{errors[config.id]?.message}</p>
            )}
          </div>
        );
      case FORM_FIELD_TYPES.TEXT:
        return (
          <InputField
            label={label}
            id={id}
            formMethods={formMethods}
            maxLength={maxLength}
            placeholder={placeholder}
            multiline={multiline}
            isMandatory={isMandatory}
            defaultValue={defaultValue}
            regenerateButton={regenerateButton}
          />
        );
      case FORM_FIELD_TYPES.NUMBER:
        return (
          <InputField
            label={label}
            id={id}
            type={FORM_FIELD_TYPES.NUMBER}
            formMethods={formMethods}
            maxLength={maxLength}
            placeholder={placeholder}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.IMAGE_UPLOAD:
        return (
          <div className="w-full">
            <FileUpload
              id={id}
              formMethods={formMethods}
              isMandatory={isMandatory}
              label={label}
              header={en.simulation.coverImage}
              fileType={FILE_TYPE.IMAGE}
            />
          </div>
        );

      case FORM_FIELD_TYPES.VIDEO_UPLOAD:
        return (
          <div className="w-full">
            <FileUpload
              id={id}
              formMethods={formMethods}
              isMandatory={isMandatory}
              label={label}
              header={en.simulation.coverVideo}
              fileType={FILE_TYPE.VIDEO}
            />
          </div>
        );

      case FORM_FIELD_TYPES.CUSTOM.AUTO_TERMINATION_RULE:
        return <AutoTerminationRuleField label={label} formMethods={formMethods} />;
      case FORM_FIELD_TYPES.TOGGLE_BUTTON:
        return (
          <div className="w-full">
            <ToggleSection label={label} name={id} formMethods={formMethods} />
          </div>
        );
      case FORM_FIELD_TYPES.TAG_AND_DROPDOWN:
        return (
          <div className="w-full">
            <TagSelector
              triggerWarnings={formMethods?.getValues()?.triggerWarningIds ?? []}
              updateTriggerWarnings={updateTriggerWarnings}
              label={label}
            />
          </div>
        );
      case FORM_FIELD_TYPES.CUSTOM.LANGUAGE_VOICE_MAPPING:
        return (
          <LanguageVoiceMapping
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.LINGUISTIC_STYLE_SAMPLES:
        return (
          <LinguisticStyleSamples
            id={id}
            label={label}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.OPENING_DIALOGUES:
        return <OpeningDialoguesPanel formMethods={formMethods} isMandatory={isMandatory} />;
      case FORM_FIELD_TYPES.CUSTOM.CHALLENGE_DESCRIPTION:
        return (
          <ChallengeDescriptionPanel
            formMethods={formMethods}
            isMandatory={isMandatory}
            label={label}
            placeholder={placeholder}
            maxLength={maxLength}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM_FIELDS:
        return <CustomFieldGroup formMethods={formMethods} />;
      case FORM_FIELD_TYPES.CUSTOM.RADIO_BUTTONS:
        return (
          <RadioButtonGroup
            label={label}
            id={id}
            options={options ?? []}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.TIME_INPUT:
        return (
          <div>
            <div className="flex flex-col gap-4">
              {label && (
                <div className="flex items-center gap-2">
                  <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
                    {label} {isMandatory && <span className="text-destructive-500">*</span>}
                  </label>
                  {note && <span className="text-typography-500 text-sm">{note}</span>}
                </div>
              )}
              <TimeInput
                value={formMethods.watch(id) || defaultValue}
                onChange={value => formMethods.setValue(id, value)}
                placeholder={placeholder}
                disabled={false}
                minTime="00:05:00"
              />
            </div>
          </div>
        );
      case FORM_FIELD_TYPES.CUSTOM.CHARACTER_PROFILE_SELECTOR:
        return (
          <CharacterProfileSelector
            label={label}
            id={id}
            formMethods={formMethods}
            isMandatory={isMandatory}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.BEHAVIOURS_INSTRUCTION:
        return (
          <BehavioursInstruction
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
            regenerateButton={regenerateButton}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.STATES_INSTRUCTION:
        return (
          <StateInstruction
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
            regenerateButton={regenerateButton}
          />
        );
      case FORM_FIELD_TYPES.CUSTOM.BEHAVIOURS_STATES_INSTRUCTION:
        return (
          <BehavioursAndStatesInstruction
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
            regenerateButton={regenerateButton}
          />
        );
      case FORM_FIELD_TYPES.COMPETENCY:
        return (
          <Competency formMethods={formMethods} id={id} isMandatory={isMandatory} label={label} />
        );
      case FORM_FIELD_TYPES.KNOWLEDGE_SOURCE:
        return (
          <KnowledgeSource
            formMethods={formMethods}
            id={id}
            isMandatory={isMandatory}
            label={label}
          />
        );
      default:
        return null;
    }
  };

  return <div>{getFieldElement()}</div>;
};
