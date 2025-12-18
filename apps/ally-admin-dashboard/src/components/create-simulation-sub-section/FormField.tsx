import { FC } from "react";

import { FILE_TYPE, FORM_FIELD_TYPES, en } from "@constants";
import { FormFieldProps } from "@types";

import { AutoTerminationRuleField } from "../auto-termination-rule-field";
import { CustomFieldGroup } from "../custom-field-group";
import { DropdownField } from "../dropdown-field";
import { FileUpload } from "../file-upload";
import { InputField } from "../input-field";
import { LanguageVoiceMapping } from "../language-voice-mapping";
import { TagSelector } from "../tag-selector";
import { ToggleSection } from "../toggle-section";
import { VoiceDropdown } from "../voice-dropdown";

export const FormField: FC<FormFieldProps> = ({ config, formMethods }) => {
  const { label, placeholder, type, options, id, maxLength, multiline, isMandatory } = config;
  const {
    formState: { errors },
  } = formMethods;

  const updateTriggerWarnings = triggerWarning => {
    formMethods.setValue("triggerWarningIds", triggerWarning);
  };

  const getFieldElement = () => {
    switch (type) {
      case FORM_FIELD_TYPES.SELECT:
        return (
          <div className="flex flex-col gap-2">
            <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
              {label} {isMandatory && <span className="text-destructive-500">*</span>}
            </label>
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

      case FORM_FIELD_TYPES.CUSTOM.VOICE_DROPDOWN:
        return (
          <VoiceDropdown
            id={id}
            isMandatory={isMandatory}
            label={label}
            formMethods={formMethods}
          />
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
      case FORM_FIELD_TYPES.CUSTOM_FIELD_GROUP:
        return <CustomFieldGroup formMethods={formMethods} />;
      default:
        return null;
    }
  };

  return <div>{getFieldElement()}</div>;
};
