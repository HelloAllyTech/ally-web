import React, { useState, useCallback, useEffect, useMemo } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useGetAvailableLanguageVoicesQuery } from "@api";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, TextDropdown, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { ScenarioVoice, ScenarioLanguage } from "@types";
import { isObject } from "@utils/common";

interface ScenarioVoiceSidePanelProps {
  selectedVoice: ScenarioVoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (voice: ScenarioVoice) => void;
  existingProviders?: string[];
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
  voiceId: string;
  onClose: () => void;
  hasVoice: boolean;
}> = ({ onClose, hasVoice }) => (
  <div className="flex items-center justify-between p-6">
    <button
      onClick={onClose}
      className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800"
    >
      <DoubleArrowRight width={14} height={14} />
      <span className="text-base font-tertiary font-[500]">
        {hasVoice ? "Edit Voice" : "Create Voice"}
      </span>
    </button>
  </div>
);

export const ScenarioVoiceSidePanel: React.FC<ScenarioVoiceSidePanelProps> = ({
  selectedVoice,
  isOpen,
  onClose,
  onUpdate,
  existingProviders = [],
}) => {
  const { data: languageOptions = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: false,
  }) as {
    data: ScenarioLanguage[];
  };

  const [showCustomProvider, setShowCustomProvider] = useState(false);

  // Create provider options from existing providers
  const providerOptions: Array<{ value: string; label: string }> = [
    ...Array.from(new Set(existingProviders)).map(provider => ({
      value: provider,
      label: provider,
    })),
    { value: "__custom__", label: "Add Custom Provider" },
  ];

  const emptyVoiceConfig = { model: "", age: "", gender: "", name: "", voiceId: "" };

  const [formData, setFormData] = useState<Partial<ScenarioVoice>>({
    name: "",
    provider: "",
    languageId: undefined,
    config: emptyVoiceConfig,
    active: true,
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [configText, setConfigText] = useState<string>(JSON.stringify(emptyVoiceConfig, null, 2));
  const [configError, setConfigError] = useState<string | null>(null);

  const handleFieldChange = useCallback((field: keyof ScenarioVoice, value: any) => {
    setFormData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  }, []);

  useEffect(() => {
    if (selectedVoice) {
      setFormData(selectedVoice);
      setConfigText(JSON.stringify(selectedVoice.config, null, 2));
      setConfigError(null);
    } else {
      setFormData({
        name: "",
        provider: "",
        languageId: undefined,
        config: emptyVoiceConfig,
        active: true,
      });
      setConfigText(JSON.stringify(emptyVoiceConfig, null, 2));
      setConfigError(null);
    }
  }, [selectedVoice]);

  const handleConfigChange = useCallback((text: string) => {
    setConfigText(text);

    // Check if text is empty
    if (!text.trim()) {
      setConfigError(en.simulation.configurationCannotBeEmpty);
      return;
    }

    // Check if text starts with { and ends with }
    const trimmedText = text.trim();
    if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
      setConfigError(en.simulation.configurationMustBeJsonObject);
      return;
    }

    try {
      const parsedConfig = JSON.parse(text);

      // Verify it's an object (not array or other JSON type) using isObject utility
      if (!isObject(parsedConfig)) {
        setConfigError(en.simulation.configurationMustNotBeArray);
        return;
      }

      setConfigError(null);
      setFormData(previousData => ({
        ...previousData,
        config: parsedConfig,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : en.simulation.invalidJsonSyntax;
      toast.error(errorMessage);
      // Invalid JSON syntax
      setConfigError(en.simulation.invalidJsonSyntax);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.name || !formData.provider) {
      toast.error(en.simulation.nameAndProviderRequired);
      return;
    }

    if (configError) {
      toast.error(configError);
      return;
    }

    // Parse the latest configText to ensure we're sending the updated config
    let finalConfig = formData.config || emptyVoiceConfig;

    try {
      if (configText.trim()) {
        finalConfig = JSON.parse(configText);
      }
    } catch {
      toast.error(en.simulation.invalidConfigurationJson);
      return;
    }

    const updatedVoice: ScenarioVoice = {
      name: formData.name || "",
      provider: formData.provider || "",
      languageId: formData.languageId,
      config: finalConfig,
      active: formData.active,
      ...(selectedVoice?.id && {
        id: selectedVoice?.id,
        createdAt: selectedVoice.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    };
    onUpdate(updatedVoice);
  }, [formData, selectedVoice, onUpdate, emptyVoiceConfig, configError, configText]);

  const handleClose = useCallback(() => {
    // Check if there are unsaved changes
    if (selectedVoice && JSON.stringify(formData) !== JSON.stringify(selectedVoice)) {
      setShowConfirmationModal(true);
    } else {
      onClose();
    }
  }, [formData, selectedVoice, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowConfirmationModal(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  // Memoized function to get the current language value
  const getCurrentLanguageValue = useCallback(() => {
    // Find the language option that matches the current languageId
    const currentLang = languageOptions.find(lang => lang.language_id === formData.languageId);
    return currentLang?.label?.toString() || "";
  }, [languageOptions, formData.languageId]);

  // Memoized function to handle language change
  const handleLanguageChange = useCallback(
    (value: string | number) => {
      handleFieldChange("languageId", typeof value === "string" ? parseInt(value) : value);
    },
    [handleFieldChange],
  );

  // Memoized function to handle provider change
  const handleProviderChange = useCallback(
    (value: string) => {
      if (value === "__custom__") {
        setShowCustomProvider(true);
        handleFieldChange("provider", "");
      } else {
        handleFieldChange("provider", value);
      }
    },
    [handleFieldChange],
  );

  // Memoized language options for dropdown
  const languageDropdownOptions = useMemo(
    () =>
      languageOptions.map(lang => ({
        value: lang.language_id?.toString() || "",
        label: lang.label,
      })),
    [languageOptions],
  );

  // Check if form is valid for saving
  const isFormValid = useMemo(() => {
    const hasRequiredFields = !!(formData.name && formData.provider);
    const configIsValid = !configError;
    return hasRequiredFields && configIsValid;
  }, [formData.name, formData.provider, configError]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <PanelHeader
          voiceId={selectedVoice?.id || ""}
          onClose={handleClose}
          hasVoice={!!selectedVoice?.id}
        />

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={formData.name || ""}
              onChange={event => handleFieldChange("name", event.target.value)}
              placeholder="New Voice"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <div className="space-y-3">
            <Field label="Provider">
              {showCustomProvider ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={formData.provider || ""}
                    onChange={event => handleFieldChange("provider", event.target.value)}
                    placeholder="Enter custom provider name"
                    className="border-none focus:outline-none text-base w-full"
                  />
                  <button
                    onClick={() => setShowCustomProvider(false)}
                    className="text-primary-600 hover:text-primary-700 text-sm whitespace-nowrap"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 w-full">
                  <TextDropdown
                    value={formData.provider || ""}
                    options={providerOptions}
                    onChange={handleProviderChange}
                    placeholder="Select or add provider"
                  />
                </div>
              )}
            </Field>

            <Field label="Language">
              <TextDropdown
                value={getCurrentLanguageValue()}
                options={languageDropdownOptions}
                onChange={handleLanguageChange}
                placeholder="Select language"
              />
            </Field>

            <Field label="Configuration" multiline={true}>
              <div className="w-full">
                <AutoExpandableTextarea
                  maxLines={20}
                  minHeight={20}
                  value={configText}
                  onChange={handleConfigChange}
                  placeholder="Enter configuration as JSON object"
                  className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
                />
                {configError && (
                  <div className="text-red-600 text-sm mt-2 font-medium">⚠️ {configError}</div>
                )}
              </div>
            </Field>
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={!isFormValid}
              title={!isFormValid ? en.simulation.nameProviderConfigRequired : ""}
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
        description="You have unsaved changes. Are you sure you want to close?"
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
