import React, { useState, useCallback, useEffect, useMemo } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { Prompt } from "@types";

interface PromptSidePanelProps {
  selectedPrompt: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (prompt: Prompt) => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, children, multiline = false }) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">{label}</span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const PanelHeader: React.FC<{
  onClose: () => void;
  hasPrompt: boolean;
}> = ({ onClose, hasPrompt }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {hasPrompt ? en.simulation.editPrompt : en.simulation.createPrompt}
      </span>
    </button>
  </div>
);

export const PromptSidePanel: React.FC<PromptSidePanelProps> = ({
  selectedPrompt,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [formData, setFormData] = useState<Partial<Prompt>>({
    name: "",
    description: "",
    promptCode: "",
    prompt: "",
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleFieldChange = useCallback((field: keyof Prompt, value: any) => {
    setFormData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  }, []);

  useEffect(() => {
    if (selectedPrompt) {
      setFormData(selectedPrompt);
    } else {
      setFormData({
        name: "",
        description: "",
        promptCode: "",
        prompt: "",
      });
    }
  }, [selectedPrompt]);

  const handleSave = useCallback(() => {
    if (!formData.name || !formData.description || !formData.promptCode || !formData.prompt) {
      toast.error(en.simulation.promptRequired);
      return;
    }

    const updatedPrompt: Prompt = {
      name: formData.name || "",
      description: formData.description || "",
      promptCode: formData.promptCode || "",
      prompt: formData.prompt || "",
      ...(selectedPrompt?.id && {
        id: selectedPrompt.id,
        createdAt: selectedPrompt.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    };
    onUpdate(updatedPrompt);
  }, [formData, selectedPrompt, onUpdate]);

  const handleClose = useCallback(() => {
    // Check if there are unsaved changes
    if (selectedPrompt && JSON.stringify(formData) !== JSON.stringify(selectedPrompt)) {
      setShowConfirmationModal(true);
    } else {
      onClose();
    }
  }, [formData, selectedPrompt, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmationModal(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  // Check if form is valid for saving
  const isFormValid = useMemo(() => {
    return !!(formData.name && formData.description && formData.promptCode && formData.prompt);
  }, [formData.name, formData.description, formData.promptCode, formData.prompt]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac) to save
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && isFormValid) {
        event.preventDefault();
        handleSave();
      }
    },
    [isFormValid, handleSave],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <PanelHeader onClose={handleClose} hasPrompt={!!selectedPrompt?.id} />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={formData.promptCode || ""}
              onChange={event => handleFieldChange("promptCode", event.target.value)}
              placeholder={en.simulation.enterPromptCode}
              disabled={!!selectedPrompt?.id}
              className="border-none focus:outline-none text-2xl font-light w-full disabled:text-typography-500 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-3">
            <Field label={en.simulation.promptName}>
              <input
                type="text"
                value={formData.name || ""}
                onChange={event => handleFieldChange("name", event.target.value)}
                placeholder={en.simulation.enterPromptName}
                className="border-none focus:outline-none text-base w-full px-0"
              />
            </Field>

            <Field label={en.simulation.promptDescription}>
              <input
                type="text"
                value={formData.description || ""}
                onChange={event => handleFieldChange("description", event.target.value)}
                placeholder={en.simulation.enterPromptDescription}
                className="border-none focus:outline-none text-base w-full px-0"
              />
            </Field>

            <Field label={en.simulation.promptText} multiline={true}>
              <div className="w-full">
                <AutoExpandableTextarea
                  maxLines={15}
                  minHeight={20}
                  value={formData.prompt || ""}
                  onChange={value => handleFieldChange("prompt", value)}
                  onKeyDown={handleKeyDown}
                  placeholder={en.simulation.enterPrompt}
                  className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
                />
              </div>
            </Field>
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={!isFormValid}
              title={!isFormValid ? en.simulation.promptRequired : ""}
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
        description={en.simulation.unsavedChangesWarning}
        primaryButton={{
          label: "Close Anyway",
          onClick: handleConfirmClose,
        }}
        secondaryButton={{
          label: "Keep Editing",
          onClick: handleCancelClose,
        }}
      />
    </div>
  );
};
