import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import {
  useGetAvailableLanguageVoicesQuery,
  useSyncElevenLabsVoiceMutation,
  useLazyLookupElevenLabsVoiceQuery,
} from "@api";
import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, TextDropdown, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import {
  TTS_PROVIDER_OPTIONS,
  VoiceConfigField,
  getProviderSchema,
  getUnknownConfigKeys,
  isMissingGender,
  getElevenLabsV3Warning,
  VOICE_TYPE_SUMMARY,
  isSupportedProvider,
  readConfigField,
  validateVoiceConfig,
} from "@constants/voiceProviders";
import { ScenarioVoice, ScenarioLanguage, ElevenLabsVoiceSyncResult } from "@types";
import { isObject } from "@utils/common";

interface ScenarioVoiceSidePanelProps {
  selectedVoice: ScenarioVoice | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (voice: ScenarioVoice) => void;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  children,
  multiline = false,
  required = false,
  hint,
}) => (
  <div
    className={`flex flex-row min-h-[40px] ${multiline ? "items-start" : "items-center"} text-base justify-between`}
  >
    <div className={`w-[40%] ${multiline && "mt-[8px]"}`}>
      <span className="text-base font-regular text-typography-800">
        {label}
        {required && <span className="text-destructive-500 ml-[2px]">*</span>}
      </span>
      {hint && <p className="text-xs text-typography-500 mt-[2px] pr-4">{hint}</p>}
    </div>
    <div className="w-[60%] flex flex-col text-left justify-start text-neutral-800">{children}</div>
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

const textInputClass =
  "border-b border-border-light focus:outline-none focus:border-primary-500 text-base w-full py-1 bg-transparent";

export const ScenarioVoiceSidePanel: React.FC<ScenarioVoiceSidePanelProps> = ({
  selectedVoice,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { data: languageOptions = [] } = useGetAvailableLanguageVoicesQuery({
    active: true,
    voicesNeeded: false,
  }) as {
    data: ScenarioLanguage[];
  };

  const [formData, setFormData] = useState<Partial<ScenarioVoice>>({
    name: "",
    provider: "",
    languageId: undefined,
    config: {},
    active: true,
  });

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  // The raw-JSON editor is an escape hatch, not the primary path. It stays
  // available because a config can carry keys no provider schema describes.
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [configText, setConfigText] = useState<string>("{}");
  const [configError, setConfigError] = useState<string | null>(null);
  const [isAddingCustomKey, setIsAddingCustomKey] = useState(false);
  const [customKeyName, setCustomKeyName] = useState("");
  const [customKeyError, setCustomKeyError] = useState<string | null>(null);

  const handleFieldChange = useCallback((field: keyof ScenarioVoice, value: any) => {
    setFormData(previousData => ({
      ...previousData,
      [field]: value,
    }));
  }, []);

  const [syncElevenLabsVoice, { isLoading: isSyncing }] = useSyncElevenLabsVoiceMutation();
  const [syncResult, setSyncResult] = useState<ElevenLabsVoiceSyncResult | null>(null);
  const [lookupElevenLabsVoice, { isFetching: isLookingUp }] =
    useLazyLookupElevenLabsVoiceQuery();
  // Guards the debounced auto-lookup below against re-firing for an id it
  // already resolved (e.g. a re-render with no real change to the field).
  const lastLookedUpVoiceIdRef = useRef<string | null>(null);

  useEffect(() => {
    const initial: Partial<ScenarioVoice> = selectedVoice ?? {
      name: "",
      provider: "",
      languageId: undefined,
      config: {},
      active: true,
    };
    setFormData(initial);
    setConfigText(JSON.stringify(initial.config ?? {}, null, 2));
    setConfigError(null);
    setIsJsonMode(false);
    setIsAddingCustomKey(false);
    setCustomKeyName("");
    setCustomKeyError(null);
    // Otherwise a sync/lookup result from whichever voice was open before
    // stays on screen until this one is synced too.
    setSyncResult(null);
    lastLookedUpVoiceIdRef.current = null;
  }, [selectedVoice]);

  const config = useMemo(() => formData.config ?? {}, [formData.config]);
  const providerSchema = useMemo(() => getProviderSchema(formData.provider), [formData.provider]);
  const unknownKeys = useMemo(
    () => getUnknownConfigKeys(formData.provider, config),
    [formData.provider, config],
  );

  /**
   * Turns the free-text Model field into a picker once a sync or lookup has
   * told us which models THIS voice supports — ElevenLabs' own answer, plus
   * v3 (which the API never lists for any voice, but which still renders;
   * getElevenLabsV3Warning carries the caveat, not this list).
   *
   * The currently stored value stays selectable even if it's not in the list
   * — e.g. a legacy or hand-typed model — so an unrelated edit can't silently
   * drop it, matching the pattern already used for a legacy provider value.
   */
  const modelFieldOptions = useMemo(() => {
    if (String(formData.provider ?? "").toUpperCase() !== "ELEVENLABS") return null;
    if (!syncResult?.availableModels?.length) return null;

    const current = String(config.model ?? "").trim();
    const values = current && !syncResult.availableModels.includes(current)
      ? [...syncResult.availableModels, current]
      : syncResult.availableModels;

    return values.map(model => ({
      value: model,
      label:
        model === "eleven_v3"
          ? "eleven_v3 (not listed by ElevenLabs for this voice — see warning below)"
          : model === syncResult.recommendedModel
            ? `${model} (recommended)`
            : model,
    }));
  }, [formData.provider, syncResult, config.model]);

  const effectiveProviderSchema = useMemo(() => {
    if (!modelFieldOptions) return providerSchema;
    return providerSchema.map(field =>
      field.key === "model"
        ? { ...field, type: "select" as const, options: modelFieldOptions }
        : field,
    );
  }, [providerSchema, modelFieldOptions]);

  /**
   * Ask ElevenLabs how this voice was created. The answer cannot be derived
   * locally — the model string and voice id look identical for a Professional
   * and an Instant clone — and a v3 call against a PVC returns 200 either way.
   */
  const handleSyncElevenLabs = useCallback(async () => {
    if (!selectedVoice?.id) return;
    try {
      const result = await syncElevenLabsVoice(selectedVoice.id).unwrap();
      setSyncResult(result);
      setFormData(previous => {
        const previousConfig = previous.config ?? {};
        const nextConfig: Record<string, any> = { ...previousConfig };
        if (result.voiceType) nextConfig.voice_type = result.voiceType;
        // Only suggest a model when the field is blank — never overwrite one
        // someone already chose.
        if (result.recommendedModel && !previousConfig.model) {
          nextConfig.model = result.recommendedModel;
        }
        return { ...previous, config: nextConfig };
      });
      // The plain-English title, not the raw enum — "Voice type: pvc" means
      // nothing to the person configuring the voice. The banner below carries
      // the detail; this only confirms the sync landed.
      toast.success(
        VOICE_TYPE_SUMMARY[result.voiceType ?? ""]?.title ??
          "Synced, but ElevenLabs did not say how this voice was created",
      );
    } catch (error: any) {
      toast.error(error?.data?.message ?? "Could not reach ElevenLabs");
    }
  }, [selectedVoice?.id, syncElevenLabsVoice]);

  /**
   * Auto-check a voice id as it's typed, before the voice is ever saved.
   *
   * Only for a not-yet-saved voice: a saved row has its own explicit
   * "Re-check with ElevenLabs" action below, and this effect would otherwise
   * silently overwrite a voice_type or gender someone already set on it.
   *
   * ElevenLabs ids run ~20 characters — waiting for at least that many avoids
   * firing on every keystroke of a paste-in-progress.
   */
  useEffect(() => {
    const isNewElevenLabsVoice =
      !selectedVoice?.id && String(formData.provider ?? "").toUpperCase() === "ELEVENLABS";
    const voiceId = String(config.voice_id ?? config.voiceId ?? "").trim();
    const looksLikeAnId = voiceId.length >= 18 && voiceId !== lastLookedUpVoiceIdRef.current;

    if (!isNewElevenLabsVoice || !looksLikeAnId) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      lastLookedUpVoiceIdRef.current = voiceId;
      try {
        const result = await lookupElevenLabsVoice(voiceId).unwrap();
        setSyncResult({
          storedVoiceId: result.voiceId,
          resolvedVoiceId: result.resolvedVoiceId,
          voiceIdMismatch: result.voiceIdMismatch,
          category: result.category,
          resolvedName: result.resolvedName,
          voiceType: result.voiceType,
          warning: null,
          persisted: false,
          availableModels: result.availableModels,
          recommendedModel: result.recommendedModel,
        });
        setFormData(previous => {
          const previousConfig = previous.config ?? {};
          const nextConfig: Record<string, any> = { ...previousConfig };
          if (result.voiceType) nextConfig.voice_type = result.voiceType;
          // Never overwrite a gender or model someone already set.
          if (result.gender && !previousConfig.gender) nextConfig.gender = result.gender;
          if (result.recommendedModel && !previousConfig.model) {
            nextConfig.model = result.recommendedModel;
          }
          return { ...previous, config: nextConfig };
        });
      } catch (error: any) {
        setSyncResult(null);
        toast.error(error?.data?.message ?? "Could not look up this voice on ElevenLabs");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [config.voice_id, config.voiceId, formData.provider, selectedVoice?.id, lookupElevenLabsVoice]);

  /**
   * Write a schema field into the config.
   *
   * Clearing a value removes the key rather than storing "" — the runtime reads
   * a present-but-empty key as set, which is how a voice ends up dispatching
   * with a blank model id. Editing a field stored under a legacy alias
   * (ElevenLabs `voiceId`) migrates it to the canonical key so the two spellings
   * can't drift apart.
   */
  const setConfigValue = useCallback((field: VoiceConfigField, value: any) => {
    setFormData(previousData => {
      const nextConfig = { ...(previousData.config ?? {}) };
      (field.aliases ?? []).forEach(alias => delete nextConfig[alias]);

      if (value === "" || value === undefined || value === null) {
        delete nextConfig[field.key];
      } else {
        nextConfig[field.key] = value;
      }
      return { ...previousData, config: nextConfig };
    });
  }, []);

  const removeConfigKey = useCallback((key: string) => {
    setFormData(previousData => {
      const nextConfig = { ...(previousData.config ?? {}) };
      delete nextConfig[key];
      return { ...previousData, config: nextConfig };
    });
  }, []);

  const setUnknownKeyValue = useCallback((key: string, value: string) => {
    setFormData(previousData => ({
      ...previousData,
      config: { ...(previousData.config ?? {}), [key]: value },
    }));
  }, []);

  /**
   * Add a config key the provider's schema doesn't describe.
   *
   * Exists so adding one doesn't mean dropping into raw JSON. The key lands in
   * the "not read by <provider>" list above, which is where the warning lives —
   * anything `from_config()` doesn't name is ignored at runtime.
   */
  const commitCustomKey = useCallback(() => {
    const key = customKeyName.trim();

    if (!key) {
      setCustomKeyError("Enter a key name.");
      return;
    }
    // Checked before "already set" so typing a schema field's name always
    // points at its real input, whether or not it currently has a value —
    // otherwise it would appear twice, once as a proper field and once as an
    // "ignored" key.
    const schemaMatch = providerSchema.find(
      field => field.key === key || (field.aliases ?? []).includes(key),
    );
    if (schemaMatch) {
      setCustomKeyError(
        `"${key}" is a ${formData.provider} field — use the ${schemaMatch.label} input above.`,
      );
      return;
    }
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      setCustomKeyError(`"${key}" is already set.`);
      return;
    }

    setFormData(previousData => ({
      ...previousData,
      config: { ...(previousData.config ?? {}), [key]: "" },
    }));
    setCustomKeyName("");
    setCustomKeyError(null);
    setIsAddingCustomKey(false);
  }, [customKeyName, config, providerSchema, formData.provider]);

  const cancelCustomKey = useCallback(() => {
    setCustomKeyName("");
    setCustomKeyError(null);
    setIsAddingCustomKey(false);
  }, []);

  const handleConfigTextChange = useCallback((text: string) => {
    setConfigText(text);

    if (!text.trim()) {
      setConfigError(en.simulation.configurationCannotBeEmpty);
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText.startsWith("{") || !trimmedText.endsWith("}")) {
      setConfigError(en.simulation.configurationMustBeJsonObject);
      return;
    }

    try {
      const parsedConfig = JSON.parse(text);
      if (!isObject(parsedConfig)) {
        setConfigError(en.simulation.configurationMustNotBeArray);
        return;
      }
      setConfigError(null);
      setFormData(previousData => ({ ...previousData, config: parsedConfig }));
    } catch {
      setConfigError(en.simulation.invalidJsonSyntax);
    }
  }, []);

  const toggleJsonMode = useCallback(() => {
    setIsJsonMode(previous => {
      // Entering raw mode: serialise whatever the fields currently hold, so the
      // two editors never show different configs.
      if (!previous) {
        setConfigText(JSON.stringify(config, null, 2));
        setConfigError(null);
      }
      return !previous;
    });
  }, [config]);

  const handleProviderChange = useCallback(
    (value: string) => {
      handleFieldChange("provider", value);
    },
    [handleFieldChange],
  );

  const configErrors = useMemo(
    () => validateVoiceConfig(formData.provider, config),
    [formData.provider, config],
  );

  const handleSave = useCallback(() => {
    if (!formData.name || !formData.provider) {
      toast.error(en.simulation.nameAndProviderRequired);
      return;
    }

    if (configError) {
      toast.error(configError);
      return;
    }

    if (configErrors.length) {
      toast.error(configErrors[0]);
      return;
    }

    const updatedVoice: ScenarioVoice = {
      name: formData.name || "",
      provider: formData.provider || "",
      languageId: formData.languageId,
      config,
      active: formData.active,
      ...(selectedVoice?.id && {
        id: selectedVoice?.id,
        createdAt: selectedVoice.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    };
    onUpdate(updatedVoice);
  }, [formData, config, configError, configErrors, selectedVoice, onUpdate]);

  const handleClose = useCallback(() => {
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

  const getCurrentLanguageValue = useCallback(() => {
    const currentLang = languageOptions.find(lang => lang.language_id === formData.languageId);
    return currentLang?.label?.toString() || "";
  }, [languageOptions, formData.languageId]);

  const handleLanguageChange = useCallback(
    (value: string | number) => {
      handleFieldChange("languageId", typeof value === "string" ? parseInt(value) : value);
    },
    [handleFieldChange],
  );

  const languageDropdownOptions = useMemo(
    () =>
      languageOptions.map(lang => ({
        value: lang.language_id?.toString() || "",
        label: lang.label,
      })),
    [languageOptions],
  );

  /**
   * A voice already stored with a provider the runtime can't dispatch to keeps
   * its value in the list — dropping it would silently rewrite the row the
   * moment anyone saved an unrelated field.
   */
  const providerDropdownOptions = useMemo(() => {
    const stored = formData.provider;
    if (stored && !isSupportedProvider(stored)) {
      return [...TTS_PROVIDER_OPTIONS, { value: stored, label: `${stored} (unsupported)` }];
    }
    return TTS_PROVIDER_OPTIONS;
  }, [formData.provider]);

  const isFormValid = useMemo(
    () => !!(formData.name && formData.provider) && !configError && configErrors.length === 0,
    [formData.name, formData.provider, configError, configErrors],
  );

  const renderConfigField = (field: VoiceConfigField) => {
    const value = readConfigField(config, field);

    if (field.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={event => setConfigValue(field, event.target.checked)}
          className="w-4 h-4 mt-2 accent-primary-600"
          aria-label={field.label}
        />
      );
    }

    if (field.type === "select") {
      return (
        <TextDropdown
          value={value ?? ""}
          options={field.options ?? []}
          onChange={(next: string) => setConfigValue(field, next)}
          placeholder={`Select ${field.label.toLowerCase()}`}
        />
      );
    }

    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={event => setConfigValue(field, event.target.value)}
        placeholder={field.placeholder ?? ""}
        className={textInputClass}
        aria-label={field.label}
      />
    );
  };

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
            <Field label="Provider" required>
              <TextDropdown
                value={formData.provider || ""}
                options={providerDropdownOptions}
                onChange={handleProviderChange}
                placeholder="Select provider"
              />
            </Field>

            <Field label="Language">
              <TextDropdown
                value={getCurrentLanguageValue()}
                options={languageDropdownOptions}
                onChange={handleLanguageChange}
                placeholder="Select language"
              />
            </Field>
          </div>

          {formData.provider && !isSupportedProvider(formData.provider) && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              The voice agent has no client for <strong>{formData.provider}</strong>. Calls using
              this voice fall back to a default Deepgram voice. Pick a supported provider to fix it.
            </div>
          )}

          {/*
            Advisory, not a validation error — the voice still plays fine. It's
            language coverage that suffers, so say which effect it has rather
            than just flagging a blank field.
          */}
          {formData.provider && isMissingGender(config) && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No gender set. This voice still works, but a language is only offered for simulation
              creation once it has both a male and a female voice — so leaving this blank can keep
              its language out of the studio.
            </div>
          )}

          {/*
            eleven_v3 cannot render from a fine-tuned voice, and a Professional
            clone is one — so it silently substitutes a ~30-90s render and still
            returns 200. Advisory rather than blocking: a same-voice A/B was
            perceptually identical, so the pairing is unsupported, not proven
            harmful. Silence is what let 23 production rows end up here.
          */}
          {getElevenLabsV3Warning(formData.provider, config) && (
            <div
              data-testid="elevenlabs-v3-warning"
              className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {getElevenLabsV3Warning(formData.provider, config)}
            </div>
          )}

          {!selectedVoice?.id &&
            isLookingUp &&
            String(formData.provider ?? "").toUpperCase() === "ELEVENLABS" && (
              <div className="mt-4 text-sm text-typography-500">
                Looking up this voice on ElevenLabs…
              </div>
            )}

          {syncResult && (
            <div
              data-testid="elevenlabs-sync-result"
              className={`mt-4 rounded-md border px-3 py-2 text-sm ${
                syncResult.voiceIdMismatch
                  ? "border-destructive-500 bg-destructive-50 text-typography-800"
                  : "border-success-400 bg-success-50 text-typography-800"
              }`}
            >
              {/*
                Reports only what the sync FOUND. The v3 verdict belongs to the
                amber banner above and is deliberately not repeated here — both
                render together after a sync, and once both were written in
                plain English they were visibly saying the same sentence twice.
              */}
              <div className="font-medium">
                {VOICE_TYPE_SUMMARY[syncResult.voiceType ?? ""]?.title ??
                  "ElevenLabs did not say how this voice was created"}
              </div>
              {syncResult.category && (
                // Their own value, kept small — traceability without making it
                // the headline.
                <div className="mt-1 text-xs text-typography-500">
                  ElevenLabs category: {syncResult.category}
                </div>
              )}
              {syncResult.voiceIdMismatch && (
                // The stored id is not the voice that renders. Observed on 7 of
                // 77 production ids, all well-known public-library ids.
                <div className="mt-1">
                  This id resolves to a <b>different voice</b>: stored{" "}
                  <code>{syncResult.storedVoiceId}</code> → actually{" "}
                  <code>{syncResult.resolvedVoiceId}</code> ({syncResult.resolvedName}). What plays
                  is the second one.
                </div>
              )}
            </div>
          )}

          {/*
            Demoted from a primary button: new voices auto-check as the id is
            typed, and the whole workspace is kept in sync by a monthly job
            plus an admin-triggered bulk sync from the voices list. This link
            is only for the rare case of re-checking one voice ElevenLabs may
            have changed since — not the everyday path anymore.
          */}
          {selectedVoice?.id &&
            String(formData.provider ?? "").toUpperCase() === "ELEVENLABS" && (
              <button
                type="button"
                onClick={handleSyncElevenLabs}
                disabled={isSyncing}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 disabled:opacity-50"
              >
                {isSyncing ? "Checking…" : "Re-check with ElevenLabs"}
              </button>
            )}

          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-[500] text-typography-900">Configuration</h2>
              <button
                type="button"
                onClick={toggleJsonMode}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {isJsonMode ? "Back to fields" : "Edit as JSON"}
              </button>
            </div>

            {isJsonMode ? (
              <div className="w-full">
                <AutoExpandableTextarea
                  maxLines={20}
                  minHeight={20}
                  value={configText}
                  onChange={handleConfigTextChange}
                  placeholder="Enter configuration as JSON object"
                  className="py-2 pt-[16px] px-0 border-none focus:outline-none text-base w-full resize-none overflow-y-auto custom-scrollbar"
                />
                {configError && (
                  <div className="text-red-600 text-sm mt-2 font-medium">⚠️ {configError}</div>
                )}
              </div>
            ) : !formData.provider ? (
              <p className="text-sm text-typography-500">
                Pick a provider to configure this voice.
              </p>
            ) : (
              <div className="space-y-3">
                {effectiveProviderSchema.map(field => (
                  <Field
                    key={field.key}
                    label={field.label}
                    required={field.required}
                    hint={field.hint}
                  >
                    {renderConfigField(field)}
                  </Field>
                ))}

                <div className="pt-4 mt-4 border-t border-border-light">
                  {unknownKeys.length > 0 && (
                    <>
                      {/*
                        Stated plainly because it's the whole risk of this
                        section: `from_config()` in ally-ai-learn reads named
                        keys, so an extra one persists but changes nothing at
                        runtime — and looks like it worked.
                      */}
                      <p className="text-sm text-typography-600 mb-2">
                        These keys aren&apos;t read by {formData.provider} — the voice agent ignores
                        them at runtime. They&apos;re kept so nothing is lost on save. Making one
                        take effect needs a change in the voice agent first.
                      </p>
                      {unknownKeys.map(key => (
                        <Field key={key} label={key}>
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              value={
                                typeof config[key] === "object"
                                  ? JSON.stringify(config[key])
                                  : String(config[key] ?? "")
                              }
                              onChange={event => setUnknownKeyValue(key, event.target.value)}
                              disabled={typeof config[key] === "object"}
                              className={textInputClass}
                              aria-label={key}
                            />
                            <button
                              type="button"
                              onClick={() => removeConfigKey(key)}
                              className="text-sm text-destructive-500 hover:text-destructive-700 whitespace-nowrap"
                            >
                              Remove
                            </button>
                          </div>
                        </Field>
                      ))}
                    </>
                  )}

                  {isAddingCustomKey ? (
                    <div className="flex items-start gap-2 mt-2">
                      <input
                        type="text"
                        value={customKeyName}
                        onChange={event => setCustomKeyName(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitCustomKey();
                          }
                          if (event.key === "Escape") cancelCustomKey();
                        }}
                        placeholder="Key name, e.g. speed"
                        className={textInputClass}
                        aria-label="New config key"
                        autoFocus
                      />
                      <Button variant={ButtonVariant.SECONDARY} onClick={commitCustomKey}>
                        Add
                      </Button>
                      <Button variant={ButtonVariant.SECONDARY} onClick={cancelCustomKey}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomKey(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                    >
                      + Add custom key
                    </button>
                  )}

                  {customKeyError && (
                    <p className="text-sm text-destructive-500 mt-2">{customKeyError}</p>
                  )}
                </div>
              </div>
            )}

            {!isJsonMode && configErrors.length > 0 && (
              <ul className="mt-3 text-sm text-destructive-500 list-disc pl-5">
                {configErrors.map(error => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}
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
