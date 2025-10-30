import { InfoIcon } from "@assets";
import { InputFieldProps } from "@components/types";
import { FORM_FIELD_TYPES } from "@constants";

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

  const inputTrack = formMethods.watch(id, "") || "";
  const {
    formState: { errors },
    register,
  } = formMethods;
  const requiredErrorMessage = isMandatory ? `${label} is required` : false;
  const registerResult = register(id, { required: requiredErrorMessage });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label htmlFor="title" className="text-[#49454F] cursor-pointer flex items-center gap-1">
          {label}
          {isMandatory && <span className="text-red-500">*</span>}
          {infoIconContent && <InfoIcon />}
        </label>
      </div>
      <div className="relative mb-[15px]">
        {multiline ? (
          <textarea
            {...registerResult}
            id={id}
            maxLength={maxLength}
            placeholder={placeholder}
            style={{ minHeight: `${minHeight}px` }}
            className={`w-full rounded border border-[#E5E7EB] focus:ring-1 focus:ring-blue-600 focus:outline-none px-2 py-1 pr-16`}
          />
        ) : (
          <input
            {...registerResult}
            id={id}
            type={type}
            {...(maxLength && { maxLength })}
            placeholder={placeholder}
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
            onChange={handleFieldChange}
            className="w-full rounded border border-[#E5E7EB] focus:ring-1 focus:ring-blue-600 focus:outline-none px-2 py-1 pr-[50px]"
          />
        )}
        {maxLength && type === FORM_FIELD_TYPES.TEXT && (
          <span
            className={`absolute right-2 text-sm text-gray-400 ${
              multiline ? "bottom-0 -translate-y-1/2" : "top-1/2 -translate-y-1/2"
            }`}
          >
            {inputTrack.length}/{maxLength}
          </span>
        )}
        {errors[id] && (
          <p
            className={`absolute ${multiline ? "bottom-[-20px]" : "bottom-[-25px]"} text-red-500 text-sm`}
          >
            {errors[id].message}
          </p>
        )}
      </div>
    </div>
  );
};
