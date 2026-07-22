import React, { useState, useCallback, useEffect, useMemo } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea, TextInput } from "@ally-ui-mono/ui-shared";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en, ROUTES } from "@constants";
import { ScenarioLanguage } from "@types";

interface LanguageManagementSidePanelProps {
  selectedLanguage: ScenarioLanguage | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (language: ScenarioLanguage) => void;
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
  hasLanguage: boolean;
}> = ({ onClose, hasLanguage }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {hasLanguage ? en.simulation.editLanguage : en.simulation.createLanguage}
      </span>
    </button>
  </div>
);

export const LanguageManagementSidePanel: React.FC<LanguageManagementSidePanelProps> = ({
  selectedLanguage,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const emptyConfig = useMemo(() => ({}), []);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<Partial<ScenarioLanguage>>({
    label: "",
    value: "",
    translationCode: "",
    llmProviderConfig: emptyConfig,
    sttProviderConfig: emptyConfig,
    active: true,
  });

  const [llmConfigText, setLlmConfigText] = useState<string>(JSON.stringify(emptyConfig, null, 2));
  const [sttConfigText, setSttConfigText] = useState<string>(JSON.stringify(emptyConfig, null, 2));
  const [llmConfigError, setLlmConfigError] = useState<string | null>(null);
  const [sttConfigError, setSttConfigError] = useState<string | null>(null);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const handleFieldChange = useCallback((field: keyof ScenarioLanguage, value: any) => {
    setFormData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  }, []);

  const handleLlmConfigChange = useCallback((text: string) => {
    setLlmConfigText(text);

    if (!text.trim()) {
      setLlmConfigError(en.simulation.configurationCannotBeEmpty);
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
      setLlmConfigError(en.simulation.configurationMustBeJsonObject);
      return;
    }

    try {
      const parsedConfig = JSON.parse(text);
      if (typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
        setLlmConfigError(en.simulation.configurationMustBeJsonObject);
        return;
      }

      setLlmConfigError(null);
      setFormData(previousData => ({
        ...previousData,
        llmProviderConfig: parsedConfig,
      }));
    } catch {
      setLlmConfigError(en.simulation.invalidJsonSyntax);
    }
  }, []);

  const handleSttConfigChange = useCallback((text: string) => {
    setSttConfigText(text);

    if (!text.trim()) {
      setSttConfigError(en.simulation.configurationCannotBeEmpty);
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
      setSttConfigError(en.simulation.configurationMustBeJsonObject);
      return;
    }

    try {
      const parsedConfig = JSON.parse(text);
      if (typeof parsedConfig !== "object" || Array.isArray(parsedConfig)) {
        setSttConfigError(en.simulation.configurationMustBeJsonObject);
        return;
      }

      setSttConfigError(null);
      setFormData(previousData => ({
        ...previousData,
        sttProviderConfig: parsedConfig,
      }));
    } catch {
      setSttConfigError(en.simulation.invalidJsonSyntax);
    }
  }, []);

  useEffect(() => {
    if (selectedLanguage) {
      setFormData(selectedLanguage);
      setLlmConfigText(JSON.stringify(selectedLanguage.llmProviderConfig || emptyConfig, null, 2));
      setSttConfigText(JSON.stringify(selectedLanguage.sttProviderConfig || emptyConfig, null, 2));
      setLlmConfigError(null);
      setSttConfigError(null);
    } else {
      setFormData({
        label: "",
        value: "",
        translationCode: "",
        llmProviderConfig: emptyConfig,
        sttProviderConfig: emptyConfig,
        active: true,
      });
      setLlmConfigText(JSON.stringify(emptyConfig, null, 2));
      setSttConfigText(JSON.stringify(emptyConfig, null, 2));
      setLlmConfigError(null);
      setSttConfigError(null);
    }
  }, [selectedLanguage, emptyConfig]);

  const handleSave = useCallback(() => {
    if (!formData.label || !formData.value || !formData.translationCode) {
      toast.error(en.simulation.languageRequired);
      return;
    }

    if (llmConfigError || sttConfigError) {
      toast.error(en.simulation.fixConfigurationErrorsBeforeSaving);
      return;
    }

    let finalLlmConfig = formData.llmProviderConfig || {};
    let finalSttConfig = formData.sttProviderConfig || {};

    try {
      if (llmConfigText.trim()) {
        finalLlmConfig = JSON.parse(llmConfigText);
      }
      if (sttConfigText.trim()) {
        finalSttConfig = JSON.parse(sttConfigText);
      }
    } catch {
      toast.error(en.simulation.invalidConfigurationJson);
      return;
    }

    const updatedLanguage: ScenarioLanguage = {
      label: formData.label || "",
      value: formData.value || "",
      translationCode: formData.translationCode || "",
      llmProviderConfig: finalLlmConfig,
      sttProviderConfig: finalSttConfig,
      active: formData.active ?? true,
      ...(selectedLanguage?.id && {
        id: selectedLanguage?.id,
        createdAt: selectedLanguage.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    };
    onUpdate(updatedLanguage);
  }, [
    formData,
    selectedLanguage,
    onUpdate,
    llmConfigError,
    sttConfigError,
    llmConfigText,
    sttConfigText,
  ]);

  const handleClose = useCallback(() => {
    // Check if there are unsaved changes
    if (selectedLanguage && JSON.stringify(formData) !== JSON.stringify(selectedLanguage)) {
      setShowConfirmationModal(true);
    } else {
      onClose();
    }
  }, [formData, selectedLanguage, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmationModal(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  // Check if form is valid for saving
  const isFormValid = useMemo(() => {
    return !!(
      formData.label &&
      formData.value &&
      formData.translationCode &&
      !llmConfigError &&
      !sttConfigError
    );
  }, [formData.label, formData.value, formData.translationCode, llmConfigError, sttConfigError]);

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
        <PanelHeader onClose={handleClose} hasLanguage={!!selectedLanguage?.id} />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={formData.label || ""}
              onChange={event => handleFieldChange("label", event.target.value)}
              placeholder="New Language"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <div className="space-y-3">
            <Field label={en.simulation.languageCode}>
              <TextInput
                id="language-code"
                labelText={en.simulation.languageCode}
                hideLabel
                value={formData.value || ""}
                onChange={event => handleFieldChange("value", event.target.value)}
                placeholder={en.simulation.enterLanguageCode}
                className="w-full"
              />
            </Field>

            <Field label={en.simulation.translationCode}>
              <TextInput
                id="language-translation-code"
                labelText={en.simulation.translationCode}
                hideLabel
                value={formData.translationCode || ""}
                onChange={event => handleFieldChange("translationCode", event.target.value)}
                placeholder={en.simulation.enterTranslationCode}
                className="w-full"
              />
            </Field>

            <Field label={en.simulation.llmProviderConfig} multiline={true}>
              <div className="w-full">
                <AutoExpandableTextarea
                  maxLines={15}
                  minHeight={20}
                  value={llmConfigText}
                  onChange={handleLlmConfigChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter LLM configuration as JSON object"
                  className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
                />
                {llmConfigError && (
                  <div className="text-red-600 text-sm mt-2 font-medium">⚠️ {llmConfigError}</div>
                )}
              </div>
            </Field>

            <Field label={en.simulation.sttProviderConfig} multiline={true}>
              <div className="w-full">
                <AutoExpandableTextarea
                  maxLines={15}
                  minHeight={20}
                  value={sttConfigText}
                  onChange={handleSttConfigChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter STT configuration as JSON object"
                  className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
                />
                {sttConfigError && (
                  <div className="text-red-600 text-sm mt-2 font-medium">⚠️ {sttConfigError}</div>
                )}
              </div>
            </Field>
            {selectedLanguage?.id && (
              <Field label="Glossary">
                <div className="w-full py-2">
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={() =>
                      navigate(ROUTES.MANAGE_LANGUAGE_GLOSSARY(selectedLanguage.id as number))
                    }
                  >
                    Manage glossary
                  </Button>
                </div>
              </Field>
            )}
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={!isFormValid}
              title={!isFormValid ? en.simulation.languageRequired : ""}
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
