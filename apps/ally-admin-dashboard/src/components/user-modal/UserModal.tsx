import { useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { ImageUpload, Tabs, TextArea } from "@ally-ui-mono/ui-shared";
import {
  Button,
  DropdownwithTag,
  CustomDropdown,
  CreditField,
  ProfileCard,
  ToggleSwitch,
} from "@components";
import { en, FieldOptions, KeyboardKeys, USER_MODAL_FIELDS_IDS, UserRole } from "@constants";
import { UserModalProps, FieldProps } from "@types";

import { ButtonVariant } from "../types";

export const UserModal: React.FC<UserModalProps> = ({
  isOpen = true,
  onClose: onCloseProp,
  title,
  fields,
  buttonName = "Save",
  details,
  handleClick,
  formMethods,
  imageUpload = false,
  uploadButtonName,
  uploadTitle,
  uploadId,
  uploadImageUrl,
  hasTabs = false,
  tabOptions,
  optionValues,
  extraContent,
}) => {
  const [activeTab, setActiveTab] = useState(tabOptions?.[0]?.id);

  useEffect(() => {
    setActiveTab(tabOptions?.[0]?.id);
  }, [tabOptions]);
  // Handle ESC key to close modal

  useEffect(() => {
    const onClose = () => {
      setActiveTab(tabOptions?.[0]?.id);
      onCloseProp();
    };
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
  }, [isOpen, onCloseProp, tabOptions]);

  const control = formMethods?.control;
  const watchRoles = formMethods?.watch?.(USER_MODAL_FIELDS_IDS.ROLES) || [];
  const { isValid, isDirty } = formMethods?.formState || {};

  const backdropMouseDownRef = useRef(false);

  const handlePrimaryAction = formMethods
    ? formMethods.handleSubmit((data: any) => {
        if (handleClick) handleClick({ id: details?.id, ...data });
        formMethods.reset(data);
      })
    : handleClick;

  const handleCancel = () => {
    setActiveTab(tabOptions?.[0]?.id);
    onCloseProp();
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

  const handleLearnerRoleChange = (selectedRoles: string[]) => {
    if (!selectedRoles.includes(UserRole.LEARNER)) {
      formMethods.setValue(USER_MODAL_FIELDS_IDS.CREDITS, "", {
        shouldValidate: true,
      });
    }
  };

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    backdropMouseDownRef.current = e.target === e.currentTarget;
  };

  const handleBackdropMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const isBackdropTarget = e.target === e.currentTarget;
    if (backdropMouseDownRef.current && isBackdropTarget) {
      setActiveTab(tabOptions?.[0]?.id);
      onCloseProp();
    }
    backdropMouseDownRef.current = false;
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
            <label
              htmlFor={field.id}
              className="text-sm text-typography-900 cursor-pointer font-primary"
            >
              {field.label}
              {field.required && <span className="text-destructive-500">*</span>}
            </label>
            <input
              {...controllerField}
              value={controllerField.value ?? ""}
              id={field.id}
              type={field.inputType}
              placeholder={field.placeholder}
              className={`border rounded-md px-2 py-2 outline-none text-base font-primary placeholder:text-typography-600 ${
                fieldState.error ? "border-destructive-500" : "border-border-light"
              }`}
            />
            {fieldState.error?.type === "maxLength" && (
              <span className="text-destructive-500 text-base">
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
                  handleLearnerRoleChange(selectedRoles);
                }}
                placeholder={field.placeholder}
                required={field.required}
              />
              {fieldState.error && (
                <span className="text-destructive-500 text-xs">{fieldState.error.message}</span>
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
            <label
              htmlFor={field.id}
              className="text-sm text-typography-900 cursor-pointer font-primary"
            >
              {field.label}
              {field.required && <span className="text-destructive-500">*</span>}
            </label>
            <TextArea
              {...controllerField}
              value={controllerField.value ?? ""}
              id={field.id}
              labelText={field.label}
              hideLabel
              placeholder={field.placeholder}
              rows={4}
            />
            {fieldState.error?.type === "maxLength" && (
              <span className="text-destructive-500 text-xs">
                {en.userManagement.textAreaUpperLimit}
              </span>
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
          validate: value => {
            if (!value) return en.userManagement.creditRequiredError;
            if (value < 0) return en.userManagement.creditNotNegativeError;
            if (value > field.maxLength) return en.userManagement.creditLimitError;
            return true;
          },
        }}
        defaultValue={details?.creditLimit ?? 0}
        render={({ field: controllerField, fieldState }) => (
          <>
            <CreditField
              onChange={controllerField.onChange}
              userData={details}
              value={controllerField.value ?? ""}
            />
            {fieldState.error && (
              <span className="text-destructive-500 text-xs">{fieldState.error.message}</span>
            )}
          </>
        )}
      />
    );
  };

  const renderDisabledField = (field: FieldProps) => {
    return (
      <div key={field.id} className="flex flex-col gap-2">
        <label
          htmlFor={field.id}
          className="text-sm text-typography-900 cursor-pointer font-primary"
        >
          {field.label}
        </label>

        <input
          id={field.id}
          type={field.inputType}
          value={details?.[field.id] ?? ""}
          placeholder={field.placeholder ?? ""}
          disabled
          className="border rounded-md px-2 py-2 outline-none text-base font-primary"
        />
      </div>
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
      case FieldOptions.DISABLED_FIELD:
        return renderDisabledField(field);
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const showTabs = hasTabs && tabOptions?.length > 0;
  const isFirstTab = !hasTabs || activeTab === tabOptions?.[0]?.id;
  const isSecondTab = hasTabs && activeTab === tabOptions?.[1]?.id;
  const isPrimaryButtonDisabled = !isValid || !isDirty;

  return (
    <div
      className="fixed top-[-100px] inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-[1px]"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="py-5 px-6 bg-white min-w-[400px] max-w-[90vw] max-h-[90vh] w-auto flex flex-col gap-5 relative font-primary rounded-[10px] shadow-2xl animate-fadeIn">
        {/* Header */}
        <div className="text-typography-900 flex justify-center w-full text-2xl font-primary relative flex-shrink-0">
          {title}
        </div>

        {/* Tabs */}
        {showTabs && (
          <div className="w-full mb-6 flex-shrink-0">
            <Tabs
              items={tabOptions}
              tabStyles={{ width: "100%" }}
              activeId={activeTab}
              showCount={false}
              onChange={setActiveTab}
            />
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {isFirstTab && (
            <div className="flex flex-col gap-5">
              {imageUpload && (
                <ImageUpload
                  formMethods={formMethods}
                  uploadId={uploadId}
                  uploadButtonName={uploadButtonName}
                  uploadTitle={uploadTitle}
                  onUpload={uploadImageUrl}
                  details={details}
                />
              )}
              {fields.map((field, index) => renderField(field, index))}
              {extraContent && (
                <div className="pt-2 border-t border-border-light">{extraContent}</div>
              )}
            </div>
          )}

          {isSecondTab && (
            <div className="flex flex-col gap-4">
              {optionValues?.map(tab => (
                <div key={tab.id} className="flex justify-between items-center gap-2 h-9">
                  <label
                    htmlFor={tab.id}
                    className="text-sm text-typography-900 cursor-pointer font-primary"
                  >
                    {tab.label}
                  </label>
                  <div className="flex gap-2 items-center">
                    <ToggleSwitch
                      enabled={tab.value}
                      onChange={() => tab.onClick(!tab.value)}
                      switchStyles={{
                        height: "20px",
                        width: "20px",
                        boxShadow: "0px 0.67px 1.33px 0px #0000001A",
                        transform: tab.value ? "translateX(23px)" : "translateX(2px)",
                      }}
                    />
                    <span className="text-sm text-typography-600 font-normal">
                      {tab.value ? en.common.enabled : en.common.disabled}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 py-2 flex-shrink-0">
          <Button variant={ButtonVariant.SECONDARY} className="w-full" onClick={handleCancel}>
            {en.userManagement.cancel}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            className={`w-full ${
              isPrimaryButtonDisabled
                ? "bg-neutral-400 cursor-not-allowed"
                : "bg-primary-500 hover:bg-primary-700"
            }`}
            onClick={handlePrimaryAction}
            disabled={isPrimaryButtonDisabled}
          >
            {buttonName}
          </Button>
        </div>
      </div>
    </div>
  );
};
