import { FC } from "react";

import { FILE_TYPE, FORM_FIELD_TYPES, en } from "@constants";
import { FormFieldProps } from "@types";

import { DropdownField } from "../dropdown-field";
import { FileUpload } from "../file-upload";
import { InputField } from "../input-field";
import { VoiceDropdown } from "../voice-dropdown";

export const FormField: FC<FormFieldProps> = ({ config, formMethods }) => {
  const { label, placeholder, type, options, id, maxLength, multiline, isMandatory } = config;
  const {
    formState: { errors },
  } = formMethods;

  const getFieldElement = () => {
    switch (type) {
      case FORM_FIELD_TYPES.SELECT:
        return (
          <div className="flex flex-col gap-2">
            <label className="text-typography-700 cursor-pointer flex items-center gap-1">
              {label} {isMandatory && <span className="text-destructive-500">*</span>}
            </label>
            <DropdownField
              id={id}
              label={label}
              formMethods={formMethods}
              options={options ?? []}
              placeholder={`Select ${label.toLowerCase()}`}
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
      default:
        return null;
    }
  };

  return <div>{getFieldElement()}</div>;
};
