import React, { useState, useCallback, useEffect, useMemo } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { Refresh, DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { Prompt } from "@types";

interface PromptSidePanelProps {
  selectedPrompt: Prompt | null;
  allPrompts: Prompt[];
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

const BlockEditorPopup: React.FC<{
  block: Prompt | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: Prompt) => void;
}> = ({ block, isOpen, onClose, onSave }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    if (block) setText(block.prompt);
  }, [block]);

  if (!isOpen || !block) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border-light flex justify-between items-center">
          <h3 className="text-xl font-secondary text-typography-900">Edit Block: {block.name}</h3>
          <button onClick={onClose} className="text-typography-500 hover:text-typography-900">
            ✕
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-typography-600 block mb-1">
                Prompt Code
              </span>
              <span className="font-mono text-sm bg-neutral-50 px-2 py-1 rounded">
                {block.promptCode}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-typography-600 block mb-2">
                Block Content
              </span>
              <AutoExpandableTextarea
                maxLines={20}
                minHeight={150}
                value={text}
                onChange={setText}
                placeholder="Enter block content..."
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-border-light flex justify-end gap-3">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            onClick={() => onSave({ ...block, prompt: text, useDashboardOverride: true })}
          >
            Save Block
          </Button>
        </div>
      </div>
    </div>
  );
};

export const PromptSidePanel: React.FC<PromptSidePanelProps> = ({
  selectedPrompt,
  allPrompts,
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
  const [editingBlock, setEditingBlock] = useState<Prompt | null>(null);

  const getBlockByCode = useCallback(
    (code: string) => {
      return allPrompts.find(p => p.promptCode === code);
    },
    [allPrompts],
  );

  const handleBlockClick = useCallback(
    (code: string) => {
      const block = getBlockByCode(code);
      if (block) {
        setEditingBlock(block);
      } else {
        toast.error(`Block with code "${code}" not found.`);
      }
    },
    [getBlockByCode],
  );

  const handleBlockUpdate = useCallback(
    async (blockData: Prompt) => {
      onUpdate(blockData);
      setEditingBlock(null);
    },
    [onUpdate],
  );

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
    const vars = selectedPrompt?.availableVariables;

    if (!vars || vars.length === 0) {
      return [];
    }

    // Filter out block placeholders to keep the UI clean
    const filtered = vars.filter(
      v => !v.endsWith("_block") && !v.endsWith("_prompt") && !v.includes("prompt_"),
    );

    return [...filtered].sort();
  }, [selectedPrompt?.availableVariables]);

  const hasAnyBlocks = useMemo(() => {
    return (
      (selectedPrompt?.usesBlocks?.length ?? 0) > 0 ||
      selectedPrompt?.availableVariables?.some((v: string) => v.endsWith("_block"))
    );
  }, [selectedPrompt?.usesBlocks, selectedPrompt?.availableVariables]);

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

            {hasAnyBlocks && (
              <Field label={en.simulation.usedBlocks} multiline={true}>
                <div className="w-full space-y-3 pt-2">
                  <div className="rounded-md border border-border-light bg-neutral-50 px-3 py-3">
                    <div className="text-sm font-medium text-typography-900">
                      {en.simulation.blocksHelpTitle}
                    </div>
                    <p className="mt-1 text-sm leading-5 text-typography-700">
                      {en.simulation.blocksHelpText}
                    </p>
                  </div>

                  {selectedPrompt.usesBlocks && selectedPrompt.usesBlocks.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedPrompt.usesBlocks.map(code => (
                        <button
                          key={code}
                          onClick={() => handleBlockClick(code)}
                          className="inline-flex px-2 py-0.5 rounded text-sm bg-neutral-100 text-typography-800 hover:bg-neutral-200 transition-colors font-mono border border-border-light"
                          title="Click to edit block"
                        >
                          {code.replace("ally_ai_learn_system_", "")}
                        </button>
                      ))}
                    </div>
                  )}
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

      <BlockEditorPopup
        isOpen={!!editingBlock}
        block={editingBlock}
        onClose={() => setEditingBlock(null)}
        onSave={handleBlockUpdate}
      />
    </div>
  );
};
