import React, { useState, useCallback, useEffect, useMemo } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useRevertPromptMutation } from "@api";
import { Refresh, DoubleArrowRight } from "@assets";
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

function parseVariablesFromPrompt(text: string): string[] {
  const vars = new Set<string>();
  const singleBrace = text.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g); // {var_name} - ally-ai-learn
  const doubleMatch = text.matchAll(/\{\{(\w+)\}\}/g);
  const angleMatch = text.matchAll(/<(\w+)>/g);
  for (const m of singleBrace) vars.add(m[1]);
  for (const m of doubleMatch) vars.add(m[1]);
  for (const m of angleMatch) vars.add(m[1]);
  return Array.from(vars).sort();
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
  onRestore: () => void;
  showRestore: boolean;
}> = ({ onClose, onRestore, showRestore }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500] text-typography-900">
        {en.simulation.editPrompt}
      </span>
    </button>
    {showRestore && (
      <button
        onClick={onRestore}
        className="flex items-center gap-1.5 text-typography-600 hover:text-neutral-800 transition-colors"
        title={en.simulation.restoreDefault}
      >
        <Refresh width={16} height={16} />
        <span className="text-sm font-medium">{en.simulation.restoreDefault}</span>
      </button>
    )}
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
    useDashboardOverride: false,
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRevertConfirmModal, setShowRevertConfirmModal] = useState(false);
  const [revertPrompt, { isLoading: isReverting }] = useRevertPromptMutation();

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
        useDashboardOverride: false,
      });
    }
  }, [selectedPrompt]);

  const availableVariables = useMemo(() => {
    const promptEdited = formData.prompt !== selectedPrompt?.prompt;
    if (promptEdited) {
      return parseVariablesFromPrompt(formData.prompt || "");
    }
    if (selectedPrompt?.availableVariables?.length) {
      return selectedPrompt.availableVariables;
    }
    return parseVariablesFromPrompt(formData.prompt || "");
  }, [selectedPrompt?.availableVariables, selectedPrompt?.prompt, formData.prompt]);

  const handleSave = useCallback(() => {
    const promptCode = selectedPrompt?.promptCode ?? formData.promptCode ?? "";
    if (!formData.name || !formData.description || !promptCode || !formData.prompt) {
      toast.error(en.simulation.promptRequired);
      return;
    }

    const updatedPrompt: Prompt = {
      name: formData.name || "",
      description: formData.description || "",
      promptCode,
      prompt: formData.prompt || "",
      useDashboardOverride: true, // Automatically enable override when saved
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

  const handleRevertClick = useCallback(() => {
    setShowRevertConfirmModal(true);
  }, []);

  const handleRevertConfirm = useCallback(async () => {
    if (!selectedPrompt?.id) return;
    try {
      // Revert should also disable the dashboard override to "fall back" to codebase
      await onUpdate({
        ...selectedPrompt,
        useDashboardOverride: false,
      });
      toast.success(en.simulation.revertPromptSuccess);
      setShowRevertConfirmModal(false);
      onClose();
    } catch {
      toast.error(en.simulation.revertPromptFailed);
    }
  }, [selectedPrompt, onUpdate, onClose]);

  const handleRevertCancel = useCallback(() => {
    setShowRevertConfirmModal(false);
  }, []);

  // Check if form is valid for saving
  const isFormValid = useMemo(() => {
    const promptCode = selectedPrompt?.promptCode ?? formData.promptCode;
    return !!(formData.name && formData.description && promptCode && formData.prompt);
  }, [
    formData.name,
    formData.description,
    formData.promptCode,
    formData.prompt,
    selectedPrompt?.promptCode,
  ]);

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

  if (!isOpen || !selectedPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <PanelHeader
          onClose={handleClose}
          onRestore={handleRevertClick}
          showRestore={Boolean(selectedPrompt?.useDashboardOverride)}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <Field label="Prompt Code">
              <span className="font-mono text-base text-typography-800">
                {selectedPrompt?.promptCode ?? formData.promptCode ?? "—"}
              </span>
            </Field>

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

            {availableVariables.length > 0 && (
              <Field label={en.simulation.availableVariables}>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map(v => (
                    <span
                      key={v}
                      className="inline-flex px-2 py-0.5 rounded text-sm bg-neutral-100 text-typography-700 font-mono"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </Field>
            )}
          </div>

          <div className="flex flex-row items-center justify-between mt-8 pb-6">
            <div className="w-[40%]" />
            <div className="w-[60%] flex gap-3 justify-start items-center">
              <Button variant={ButtonVariant.SECONDARY} onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleSave}
                disabled={!isFormValid}
                title={!isFormValid ? en.simulation.promptRequired : ""}
              >
                Save
              </Button>
            </div>
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
      <ActionConfirmationPopup
        isOpen={showRevertConfirmModal}
        onClose={handleRevertCancel}
        title={en.simulation.restoreDefault}
        description={en.simulation.revertToDefaultConfirm}
        primaryButton={{
          label: "Revert",
          onClick: handleRevertConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: handleRevertCancel,
        }}
      />
    </div>
  );
};
