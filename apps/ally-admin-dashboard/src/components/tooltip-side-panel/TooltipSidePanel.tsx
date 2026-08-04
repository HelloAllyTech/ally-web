import React, { useState, useCallback, useEffect, useMemo } from "react";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button, ToggleSwitch } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { Tooltip } from "@types";
import { fromLocationSlug } from "@utils";

interface TooltipSidePanelProps {
  selectedTooltip: Tooltip | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (tooltip: Partial<Tooltip>) => void;
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, required, children, multiline = false }) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{ onClose: () => void; isEditing: boolean }> = ({
  onClose,
  isEditing,
}) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {isEditing ? en.tooltip.editTooltip : en.tooltip.createTooltip}
      </span>
    </button>
  </div>
);

export const TooltipSidePanel: React.FC<TooltipSidePanelProps> = ({
  selectedTooltip,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<Partial<Tooltip>>({
    location: "",
    tipText: "",
    active: false,
  });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedTooltip) {
      setFormData({
        location: fromLocationSlug(selectedTooltip.location),
        tipText: selectedTooltip.tipText,
        active: selectedTooltip.active,
      });
    } else {
      setFormData({ location: "", tipText: "", active: false });
    }
  }, [selectedTooltip, isOpen]);

  const handleFieldChange = useCallback((field: keyof Tooltip, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const isFormValid = useMemo(
    () =>
      !!(formData.location?.trim() && formData.tipText?.trim() && formData.tipText.length <= 200),
    [formData.location, formData.tipText],
  );

  const validationMessage = useMemo(() => {
    if (!formData.location?.trim() || !formData.tipText?.trim()) return en.tooltip.locationRequired;
    if ((formData.tipText?.length ?? 0) > 200) return en.tooltip.tipTextTooLong;
    return "";
  }, [formData.location, formData.tipText]);

  const handleSave = useCallback(() => {
    if (!isFormValid) return;
    onSave(formData);
  }, [formData, isFormValid, onSave]);

  const handleClose = useCallback(() => {
    const original = selectedTooltip
      ? {
          location: fromLocationSlug(selectedTooltip.location),
          tipText: selectedTooltip.tipText,
          active: selectedTooltip.active,
        }
      : { location: "", tipText: "", active: false };

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(original);
    if (hasChanges) {
      setShowConfirmationModal(true);
    } else {
      onClose();
    }
  }, [formData, selectedTooltip, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmationModal(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  if (!isOpen) return null;

  const tipTextLength = formData.tipText?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <PanelHeader onClose={handleClose} isEditing={!!selectedTooltip?.id} />

        <div className="flex-1 min-h-0 px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={formData.location || ""}
              onChange={e => handleFieldChange("location", e.target.value)}
              placeholder="Tooltip Location"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
            <p className="text-sm text-typography-400 mt-1">
              The UI element or page section where the tooltip will appear (e.g., &quot;Login
              Button&quot;, &quot;Profile Icon&quot;)
            </p>
          </div>

          <div className="space-y-3">
            <Field label={en.tooltip.tipText} required multiline={true}>
              <div className="w-full">
                <TextArea
                  id="tooltip-tip-text"
                  labelText={en.tooltip.tipText}
                  hideLabel
                  value={formData.tipText || ""}
                  onChange={e => handleFieldChange("tipText", e.target.value)}
                  placeholder="Enter tip text..."
                  rows={4}
                />
                <div
                  className={`text-xs text-right mt-1 ${tipTextLength > 200 ? "text-red-600" : "text-typography-400"}`}
                >
                  {tipTextLength}/200
                </div>
              </div>
            </Field>

            <Field label={en.tooltip.status}>
              <ToggleSwitch
                enabled={formData.active ?? false}
                onChange={value => handleFieldChange("active", value)}
                label={en.tooltip.status}
              />
            </Field>
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={!isFormValid}
              title={validationMessage}
            >
              Save
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirmationModal}
        onClose={handleCancelClose}
        title="Unsaved Changes"
        description={en.tooltip.unsavedChangesWarning}
        primaryButton={{ label: "Close Anyway", onClick: handleConfirmClose }}
        secondaryButton={{ label: "Keep Editing", onClick: handleCancelClose }}
      />
    </div>
  );
};
