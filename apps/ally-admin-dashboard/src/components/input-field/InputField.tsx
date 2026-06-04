import { useEffect } from "react";

import { InfoIcon } from "@assets";
import { InputFieldProps } from "@components/types";
import { FORM_FIELD_TYPES } from "@constants";
import { isNonEmptyString } from "@utils";

export const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  formMethods,
  multiline = false,
  placeholder = "",
  type = FORM_FIELD_TYPES.TEXT,
  minHeight = "200",
  infoIconContent,
  isMandatory = false,
  maxLength,
  defaultValue = "",
  disabled = false,
  regenerateButton,
}) => {
  const isAgeField = id === "age";
  const MAX_AGE = 150;
  const MIN_AGE = 0;

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    registerResult.onChange(e);
    if (isAgeField) {
      const value = e.target.value;
      if (Number(value) < MIN_AGE) formMethods.setValue(id, MIN_AGE.toString());
      else if (Number(value) > MAX_AGE) formMethods.setValue(id, MAX_AGE.toString());
    }
  };

  const handleAgeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isAgeField) return;
    const allowedNavigationKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (allowedNavigationKeys.includes(event.key)) return;

    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit) {
      event.preventDefault();
    }
  };

  const handleAgePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    if (!isAgeField) return;
    const pastedText = event.clipboardData.getData("text");
    if (!/^\d+$/.test(pastedText)) {
      event.preventDefault();
    }
  };

  const handleAgeInput = (event: React.FormEvent<HTMLInputElement>) => {
    if (!isAgeField) return;
    const inputElement = event.currentTarget;
    const sanitizedValue = inputElement.value.replace(/\D+/g, "");
    if (sanitizedValue !== inputElement.value) {
      inputElement.value = sanitizedValue;
    }
  };

  useEffect(() => {
    // if the url contains edit, don't set the default value (Edit flow)
    if (window.location.pathname.includes("edit") && id === "prompt") return;

    if (!isNonEmptyString(formMethods.getValues(id)) && isNonEmptyString(defaultValue)) {
      formMethods.setValue(id, defaultValue);
    }
  }, [formMethods, id, defaultValue]);

  const inputTrack = formMethods.watch(id, "") || "";
  const {
    formState: { errors },
    register,
  } = formMethods;
  const requiredErrorMessage = isMandatory ? `${label} is required` : false;
  const registerResult = register(id, { required: requiredErrorMessage });
  return (
    <div className="flex flex-col gap-2">
      {(label || regenerateButton) && (
        <div className="flex justify-between">
          {label && (
            <label
              htmlFor="title"
              className="text-typography-900 text-base cursor-pointer flex items-center gap-1"
            >
              {label}
              {isMandatory && <span className="text-destructive-500">*</span>}
              {infoIconContent && <InfoIcon />}
            </label>
          )}
          {regenerateButton}
        </div>
      )}
      <div className="relative mb-[15px]">
        {multiline ? (
          <textarea
            {...registerResult}
            id={id}
            maxLength={maxLength}
            placeholder={placeholder}
            disabled={disabled}
            style={{ minHeight: `${minHeight}px`, fontSize: "14px" }}
            className={`w-full rounded custom-scrollbar border border-border-light text-md placeholder:text-typography-600 focus:ring-1 focus:ring-primary focus:primary-500 px-2 py-1 pr-16`}
          />
        ) : (
          <input
            {...registerResult}
            id={id}
            type={type}
            {...(maxLength && { maxLength })}
            placeholder={placeholder}
            disabled={disabled}
            {...(isAgeField
              ? {
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  step: 1,
                  onKeyDown: handleAgeKeyDown,
                  onPaste: handleAgePaste,
                  onInput: handleAgeInput,
                }
              : {})}
            style={{ fontSize: "14px" }}
            onChange={handleFieldChange}
            className={`w-full rounded border text-md border-border-light focus:ring-1 placeholder:text-typography-600 focus:ring-primary focus:outline-none px-2 py-1 ${type === FORM_FIELD_TYPES.NUMBER ? "pr-[8px]" : "pr-[50px]"}`}
          />
        )}
        {maxLength && type === FORM_FIELD_TYPES.TEXT && (
          <span
            className={`absolute right-2 text-sm text-typography-600 ${
              multiline ? "bottom-0 -translate-y-1/2" : "top-1/2 -translate-y-1/2"
            }`}
          >
            {inputTrack.length}/{maxLength}
          </span>
        )}
        {errors[id] && (
          <p
            className={`absolute ${multiline ? "bottom-[-20px]" : "bottom-[-25px]"} text-destructive-500 text-sm`}
          >
            {errors[id].message}
          </p>
        )}
      </div>
    </div>
  );
};
