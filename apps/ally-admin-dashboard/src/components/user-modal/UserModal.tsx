import { useEffect, useRef } from "react";

import { Controller } from "react-hook-form";

import { Button, DropdownwithTag, CustomDropdown, CreditField, ProfileCard } from "@components";
import { en, FieldOptions, KeyboardKeys, USER_MODAL_FIELDS_IDS, UserRole } from "@constants";
import { UserModalProps, FieldProps } from "@types";

export const UserModal: React.FC<UserModalProps> = ({
  isOpen = true,
  onClose,
  title,
  fields,
  buttonName = "Save",
  details,
  handleClick,
  formMethods,
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE && isOpen) return onClose();
    };

    if (isOpen) {
      document.addEventListener(KeyboardKeys.KEYDOWN, handleEscKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener(KeyboardKeys.KEYDOWN, handleEscKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const control = formMethods?.control;
  const watchRoles = formMethods?.watch?.(USER_MODAL_FIELDS_IDS.ROLES) || [];
  const { isValid } = formMethods?.formState || {};

  const backdropMouseDownRef = useRef(false);

  const handlePrimaryAction = formMethods
    ? formMethods.handleSubmit((data: any) => {
        if (handleClick) handleClick({ id: details?.id, ...data });
        formMethods.reset(data);
      })
    : handleClick;

  const handleCancel = () => {
    onClose();
  };

  const shouldShowField = (selectedField: FieldProps) => {
    if (
      selectedField.id === USER_MODAL_FIELDS_IDS.CREDITS &&
      fields.some(field => field.id === USER_MODAL_FIELDS_IDS.ROLES)
    ) {
      return Array.isArray(watchRoles) && watchRoles.includes(UserRole.LEARNER);
    }
    return true;
  };
  const renderInputField = (field: FieldProps, index: number) => {
    if (!control) return null;

    return (
      <Controller
        key={index}
        name={field.id}
        control={control}
        defaultValue={details?.[field.id] ?? ""}
        rules={{
          required: field.required,
          maxLength: field.maxLength,
        }}
        render={({ field: controllerField, fieldState }) => (
          <div className="flex flex-col gap-2">
            <label htmlFor={field.id} className="text-sm text-[#49454F] cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              {...controllerField}
              id={field.id}
              type={field.inputType}
              placeholder={field.placeholder}
              className={`border rounded-md px-2 py-2 outline-none font-['Replay_Pro'] text-[14px] ${
                fieldState.error ? "border-red-500" : "border-gray-300"
              }`}
            />
            {fieldState.error?.type === "maxLength" && (
              <span className="text-red-500 text-[14px]">
                {en.userManagement.maxCharError(field.maxLength)}
              </span>
            )}
          </div>
        )}
      />
    );
  };

  const renderDropdownField = (field: FieldProps, index: number) => {
    if (!control) return null;

    return (
      <Controller
        key={index}
        name={field.id}
        control={control}
        rules={{
          required: field.required,
        }}
        defaultValue={details?.[field.id] ?? ""}
        render={({ field: controllerField }) => (
          <CustomDropdown
            label={field.label}
            options={field.options ?? []}
            value={controllerField.value?.toString() || ""}
            onChange={value => controllerField.onChange(value)}
            placeholder={en.userManagement.selectOrg}
            required={field.required}
          />
        )}
      />
    );
  };

  const renderDropdownWithTagField = (field: FieldProps, index: number) => {
    if (!control) return null;

    return (
      <div key={field.id} className="flex flex-col gap-3">
        {details && <ProfileCard user={details} />}
        <Controller
          key={index}
          name={field.id}
          control={control}
          defaultValue={details?.roles || []}
          rules={{
            validate: (value: string[]) =>
              (value && value.length > 0) || en.userManagement.changeRoleErrorMessage,
          }}
          render={({ field: controllerField, fieldState }) => (
            <div className="flex flex-col gap-1">
              <DropdownwithTag
                label={field.label}
                options={field.options ?? []}
                initialValue={details?.roles || []}
                onChange={(selectedRoles: string[]) => {
                  controllerField.onChange(selectedRoles);
                }}
                placeholder={field.placeholder}
                required={field.required}
              />
              {fieldState.error && (
                <span className="text-red-500 text-xs">{fieldState.error.message}</span>
              )}
            </div>
          )}
        />
      </div>
    );
  };

  const renderTextareaField = (field: FieldProps, index: number) => {
    if (!control) return null;

    return (
      <Controller
        key={index}
        name={field.id}
        control={control}
        defaultValue={details?.[field.id] ?? ""}
        rules={{
          maxLength: field.maxLength,
          required: field.required,
        }}
        render={({ field: controllerField, fieldState }) => (
          <div className="flex flex-col gap-2">
            <label htmlFor={field.id} className="text-sm text-[#49454F] cursor-pointer">
              {field.label}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              {...controllerField}
              id={field.id}
              placeholder={field.placeholder}
              className="border rounded-md px-2 py-2 font-['Replay_Pro'] outline-none"
              rows={4}
            />
            {fieldState.error?.type === "maxLength" && (
              <span className="text-red-500 text-xs">{en.userManagement.textAreaUpperLimit}</span>
            )}
          </div>
        )}
      />
    );
  };

  const renderCreditField = (field: FieldProps, index: number) => {
    if (!control) return null;
    return (
      <Controller
        key={index}
        name={field.id}
        control={control}
        rules={{
          validate: (value: { consumedCredits: number; newCredits: number }) => {
            if (!value) return en.userManagement.creditRequiredError;
            if (value.newCredits < 0) return en.userManagement.creditNotNegativeError;
            if (value.newCredits > field.maxLength) return en.userManagement.creditLimitError;
            return true;
          },
        }}
        defaultValue={details?.credits || { consumedCredits: 0, creditLimit: 0 }}
        render={({ field: controllerField, fieldState }) => (
          <>
            <CreditField
              onChange={controllerField.onChange}
              userData={details}
              required={field.required}
            />
            {fieldState.error && (
              <span className="text-red-500 text-xs">{fieldState.error.message}</span>
            )}
          </>
        )}
      />
    );
  };

  const renderField = (field: FieldProps, index: number) => {
    if (!shouldShowField(field)) {
      return null;
    }
    switch (field.fieldType) {
      case FieldOptions.INPUT:
        return renderInputField(field, index);
      case FieldOptions.DROPDOWN:
        return renderDropdownField(field, index);
      case FieldOptions.DROPDOWN_WITH_TAG:
        return renderDropdownWithTagField(field, index);
      case FieldOptions.TEXTAREA:
        return renderTextareaField(field, index);
      case FieldOptions.CREDITS:
        return renderCreditField(field, index);
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    backdropMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const isBackdropTarget = e.target === e.currentTarget;
    if (backdropMouseDownRef.current && isBackdropTarget) {
      onClose();
    }
    backdropMouseDownRef.current = false;
  };

  return (
    <div
      className="fixed top-[-100px] inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="py-5 px-6 bg-white min-w-[400px] max-w-[90vw] w-auto flex flex-col gap-5 relative font-['IBM_Plex_Serif'] rounded-[10px] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="text-[#47464F] flex justify-center w-full text-2xl font-['Replay_Pro'] relative">
          {title}
        </div>

        {/* Dynamic Form Fields */}
        {fields.map((field, index) => renderField(field, index))}

        {/* Action Buttons */}
        <div className="flex gap-3 py-2">
          <Button variant="secondary" className="w-full" onClick={handleCancel}>
            {en.userManagement.cancel}
          </Button>
          <Button
            variant="primary"
            className={`w-full ${
              isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
            }`}
            onClick={handlePrimaryAction}
            disabled={!isValid}
          >
            {buttonName}
          </Button>
        </div>
      </div>
    </div>
  );
};
