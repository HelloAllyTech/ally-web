import { useEffect } from "react";

import { Controller } from "react-hook-form";

import { Close } from "@assets";
import { Button, DropdownwithTag, CustomDropdown } from "@components";
import { en, FieldOptions, KeyboardKeys } from "@constants";
import { UserModalProps, FieldProps } from "@types";

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
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
      if (event.key === KeyboardKeys.ESCAPE && isOpen) {
        onClose();
      }
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
  const watchRoles = formMethods?.watch?.("roles") || [];

  const handlePrimaryAction = formMethods
    ? formMethods.handleSubmit((data: any) => {
        if (handleClick) {
          handleClick({ id: details?.id, ...data });
        }
        formMethods.reset(data);
        onClose();
      })
    : handleClick;

  const handleCancel = () => {
    onClose();
  };

  const shouldShowField = (field: FieldProps) => {
    if (field.id === "credits") {
      return Array.isArray(watchRoles) && watchRoles.includes("LEARNER");
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
        render={({ field: controllerField }) => (
          <div className="flex flex-col gap-2">
            <label htmlFor={field.id} className="text-sm text-[#49454F] cursor-pointer">
              {field.label}
            </label>
            <input
              {...controllerField}
              id={field.id}
              type={field.inputType}
              placeholder={field.placeholder}
              className="border rounded-md px-2 py-2 outline-none font-['Replay_Pro']"
            />
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
        defaultValue={details?.[field.id] ?? ""}
        render={({ field: controllerField }) => (
          <CustomDropdown
            label={field.label}
            options={field.options ?? []}
            value={controllerField.value?.toString() || ""}
            onChange={value => controllerField.onChange(value)}
            placeholder={en.userManagement.selectOrg}
          />
        )}
      />
    );
  };

  const renderDropdownWithTagField = (field: FieldProps, index: number) => {
    if (!control) return null;

    return (
      <Controller
        key={index}
        name={field.id}
        control={control}
        defaultValue={details?.roles || []}
        render={({ field: controllerField }) => (
          <DropdownwithTag
            label={field.label}
            options={field.options ?? []}
            value={controllerField.value || []}
            onChange={(selectedRoles: string[]) => {
              controllerField.onChange(selectedRoles);
            }}
          />
        )}
      />
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
        render={({ field: controllerField }) => (
          <div className="flex flex-col gap-2">
            <label htmlFor={field.id} className="text-sm text-[#49454F] cursor-pointer">
              {field.label}
            </label>
            <textarea
              {...controllerField}
              id={field.id}
              placeholder={field.placeholder}
              className="border rounded-md px-2 py-2 font-['Replay_Pro'] outline-none"
              rows={4}
            />
          </div>
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
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed top-[-100px] inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-[1px]"
      onClick={handleBackdropClick}
    >
      <div className="py-5 px-6 bg-white w-[380px] flex flex-col gap-5 relative font-['IBM_Plex_Serif'] rounded-[10px] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="text-[#47464F] flex justify-center w-full text-2xl font-['Replay_Pro'] relative">
          {title}
        </div>

        {/* Close Button */}
        <button
          className="cursor-pointer w-4 h-4 absolute right-2 top-2 text-gray-500 hover:text-gray-700 transition-colors"
          onClick={onClose}
        >
          <Close />
        </button>

        {/* Dynamic Form Fields */}
        {fields.map((field, index) => renderField(field, index))}

        {/* Action Buttons */}
        <div className="flex gap-3 py-2">
          <Button variant="secondary" className="w-full" onClick={handleCancel}>
            {en.userManagement.cancel}
          </Button>
          <Button variant="primary" className="w-full" onClick={handlePrimaryAction}>
            {buttonName}
          </Button>
        </div>
      </div>
    </div>
  );
};
