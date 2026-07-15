import React, { useState, useCallback, useEffect, useMemo } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useGetPromptUsageQuery, useGetLlmModelsQuery } from "@api";
import { Refresh, DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  MAIN_AGENT_PROMPT_VARIABLE_CATALOG,
  PROMPT_LLM_MODEL_OPTIONS,
  PROMPT_TEMPERATURE_DEFAULT,
  providerForModel,
} from "@constants";
import { Prompt, LlmProviderName } from "@types";

import {
  getAvailableVariableName,
  normalizeAvailableVariables,
} from "../../utils/availableVariables";

/**
 * Placeholders that the runtime substitutes but the studio shouldn't
 * advertise in the available-variables chip list. Mirrors
 * `HIDDEN_PLACEHOLDERS` in ally-ai-learn/scripts/sync_prompts.py — that
 * one filters server-side, this one filters the FE's live-parsed list
 * (the chip list re-parses prompt body text on every render and would
 * otherwise re-add anything found, including these). Keep both in sync.
 *
 * - `language_characteristics`: per-scenario language-style override.
 *   The merged-in resolved value reaches the prompt via `{language_label}`;
 *   the raw override placeholder only differs in the empty-when-absent
 *   pattern, which doesn't justify a chip alongside `{name}` / `{age}`.
 */
const HIDDEN_PLACEHOLDERS = new Set<string>(["language_characteristics"]);

interface PromptSidePanelProps {
  selectedPrompt: Prompt | null;
  allPrompts: Prompt[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (prompt: Prompt) => void;
  /**
   * Optional duplicate action. When provided, a "Duplicate as variant"
   * button appears in the panel header for prompts that have a promptType
   * set. The parent owns the mutation and is expected to refresh the list
   * and open the new variant in the panel.
   */
  onDuplicate?: (sourceId: string) => Promise<void> | void;
  /**
   * Optional delete action — exposed only for prompts that originated from
   * a "Duplicate as variant" copy (their promptCode contains `_copy_`).
   * File-backed prompts are not deletable through this path; they must
   * first be obsoleted by removing the .txt file in the codebase.
   */
  onDelete?: (id: string) => Promise<void> | void;
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
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono text-sm"
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
  onDuplicate,
  onDelete,
}) => {
  const [formData, setFormData] = useState<Partial<Prompt>>({
    name: "",
    description: "",
    promptCode: "",
    prompt: "",
    useDashboardOverride: false,
  });
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showRevertConfirmModal, setShowRevertConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
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

  // The LLM model picker is driven by the backend registry (single source of
  // truth) so adding a model server-side surfaces here without an FE change.
  // Falls back to the static constant while the request is in flight / on error.
  const { data: llmModels } = useGetLlmModelsQuery();

  // Per-prompt overrides only route to OpenAI/Gemini in every runtime today
  // (Anthropic is autofill/copilot-only, not a per-prompt path), so the picker
  // is scoped to those providers. Widen here once a runtime consumes Anthropic
  // via a prompt-management prompt.
  const modelGroups = useMemo(() => {
    const PROVIDER_ORDER: { provider: LlmProviderName; label: string }[] = [
      { provider: "openai", label: "OpenAI" },
      { provider: "gemini", label: "Gemini" },
    ];
    if (!llmModels?.length) {
      return PROMPT_LLM_MODEL_OPTIONS.map(group => ({
        provider: group.provider,
        label: group.label,
        models: group.models.map(m => ({ ...m, supportsTemperature: true })),
      }));
    }
    return PROVIDER_ORDER.map(({ provider, label }) => ({
      provider,
      label,
      models: llmModels
        .filter(m => m.provider === provider)
        .map(m => ({
          value: m.model,
          label: m.label,
          supportsTemperature: m.supportsTemperature,
        })),
    })).filter(group => group.models.length > 0);
  }, [llmModels]);

  // Flat lookups for the selected model: its provider and whether it accepts a
  // custom temperature (reasoning models like gpt-5 don't).
  const { providerByModel, tempSupportByModel } = useMemo(() => {
    const providerMap = new Map<string, LlmProviderName>();
    const tempMap = new Map<string, boolean>();
    for (const group of modelGroups) {
      for (const m of group.models) {
        providerMap.set(m.value, group.provider);
        tempMap.set(m.value, m.supportsTemperature);
      }
    }
    return { providerByModel: providerMap, tempSupportByModel: tempMap };
  }, [modelGroups]);

  const resolveProvider = useCallback(
    (model?: string): string | undefined =>
      model ? (providerByModel.get(model) ?? providerForModel(model)) : undefined,
    [providerByModel],
  );

  // No model selected (inherit) leaves the temperature override available.
  const selectedModelSupportsTemperature =
    !formData.model || (tempSupportByModel.get(formData.model) ?? true);

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

  // Live parse the current textarea content for `{name}` placeholders.
  // Mirrors the regex used server-side in parseVariablesFromPrompt; the
  // server still owns reconcile on save, but having a live view here lets
  // the chip list reflect what's in the editor right now instead of what
  // was last saved. Skips block placeholders for cleanliness (same as the
  // post-save view did via the .endsWith filter below).
  const liveUsedNames = useMemo(() => {
    const text = formData.prompt ?? "";
    const names = new Set<string>();
    const matches = text.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g);
    for (const match of matches) {
      names.add(match[1]);
    }
    return names;
  }, [formData.prompt]);

  const availableVariables = useMemo(() => {
    // For each name actually present in the text right now, prefer the
    // server-side metadata's label/required when available, else render as
    // a bare `{ name }` chip. This way newly-typed placeholders show up
    // immediately and stale ones (still in the persisted availableVariables
    // but no longer in the text) disappear immediately.
    const metaByName = new Map<string, ReturnType<typeof normalizeAvailableVariables>[number]>();
    for (const entry of normalizeAvailableVariables(selectedPrompt?.availableVariables)) {
      metaByName.set(entry.name, entry);
    }

    // Only surface variables that are recognised (in server-side metadata or
    // the catalog). Unknown placeholders typed into the body are silently
    // ignored — they reach the runtime via SafeFormatter but shouldn't
    // pollute the chip list with unvalidated names.
    const catalogNames = new Set(MAIN_AGENT_PROMPT_VARIABLE_CATALOG.map(e => e.name));
    const items = Array.from(liveUsedNames)
      .filter(name => metaByName.has(name) || catalogNames.has(name))
      .map(name => metaByName.get(name) ?? { name });

    // Drop block placeholders to keep the UI focused on author-facing vars.
    // Also drop the HIDDEN_PLACEHOLDERS set — runtime substitutes them but
    // they don't fit the "one chip = one author input" mental model (see
    // sync_prompts.py for the BE-side equivalent + rationale). Without
    // this client-side mirror, the chip list re-parses the prompt body
    // and silently re-adds them even though the BE excludes them from
    // availableVariables.
    const filtered = items.filter(
      v =>
        !v.name.endsWith("_block") &&
        !v.name.endsWith("_prompt") &&
        !v.name.includes("prompt_") &&
        !HIDDEN_PLACEHOLDERS.has(v.name),
    );

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [liveUsedNames, selectedPrompt?.availableVariables]);

  // Names currently referenced by the prompt text (the "used" set), for
  // catalog filtering below. Same source as the chip list — live from text.
  const usedNames = liveUsedNames;

  // Catalog entries the platform can substitute but this prompt isn't
  // referencing. Returned as a flat list — categories used to surface as
  // group headers (Scenario / Persona / Character / Behavior /
  // System-computed) but that added visual noise without aiding picker
  // use, so we now render every available placeholder as a single
  // unordered chip cluster. The `group` field is still in the catalog
  // for future grouping needs but is no longer rendered. Only shown for
  // main_agent prompts since the catalog is main-agent-specific; for
  // branching / multilingual we'd need separate catalogs.
  const unusedVariables = useMemo(() => {
    const promptType = selectedPrompt?.promptType ?? formData.promptType;
    if (promptType !== "main_agent") return [];

    const hasStatesEnabled = Boolean(selectedPrompt?.hasStates ?? formData.hasStates);

    const flat: typeof MAIN_AGENT_PROMPT_VARIABLE_CATALOG = [];
    for (const entry of MAIN_AGENT_PROMPT_VARIABLE_CATALOG) {
      if (entry.statesOnly && !hasStatesEnabled) continue;
      if (usedNames.has(entry.name)) continue;
      // Same denylist as the "used" chips above — keeps the unused
      // section consistent with the sync_prompts.py HIDDEN_PLACEHOLDERS
      // semantics. Entries flagged here are still resolvable at runtime
      // for variants that explicitly reference them.
      if (HIDDEN_PLACEHOLDERS.has(entry.name)) continue;
      flat.push(entry);
    }
    return flat;
  }, [
    selectedPrompt?.promptType,
    selectedPrompt?.hasStates,
    formData.promptType,
    formData.hasStates,
    usedNames,
  ]);

  const hasAnyBlocks = useMemo(() => {
    return (
      (selectedPrompt?.usesBlocks?.length ?? 0) > 0 ||
      selectedPrompt?.availableVariables?.some(v => getAvailableVariableName(v).endsWith("_block"))
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
      // Preserve promptType (role tag, immutable after creation in this UI).
      // hasStates is intentionally NOT in the payload — it's set at create
      // time by either the file-sync (meta JSON) or the duplicate endpoint,
      // and prompt management edits should not flip it.
      promptType: formData.promptType ?? selectedPrompt?.promptType,
      // Prompt-level LLM overrides. Empty model / non-numeric temperature are
      // sent as explicit clears ("" / null) so the runtime falls back to the
      // code/language default. Provider is derived from the model. Temperature
      // is cleared for models that reject a custom one (e.g. gpt-5).
      provider: formData.model ? (resolveProvider(formData.model) ?? "") : "",
      model: formData.model ?? "",
      temperature:
        selectedModelSupportsTemperature && typeof formData.temperature === "number"
          ? formData.temperature
          : null,
      ...(selectedPrompt?.id && {
        id: selectedPrompt.id,
        createdAt: selectedPrompt.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    } as unknown as Prompt;
    onUpdate(updatedPrompt);
  }, [formData, selectedPrompt, onUpdate, resolveProvider, selectedModelSupportsTemperature]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedPrompt?.id || !onDuplicate || isDuplicating) return;
    try {
      setIsDuplicating(true);
      await onDuplicate(selectedPrompt.id);
    } finally {
      setIsDuplicating(false);
    }
  }, [selectedPrompt?.id, onDuplicate, isDuplicating]);

  // Only "Duplicate as variant" copies are deletable from this panel.
  // The promptCode suffix is the only durable marker — name and description
  // are author-editable and can't be trusted.
  const isDuplicate = useMemo(
    () => Boolean(selectedPrompt?.promptCode?.includes("_copy_")),
    [selectedPrompt?.promptCode],
  );

  // Fetch in-use count only for duplicates (the only deletable rows) — file-
  // backed prompts can't be removed via this panel, so the usage info would
  // be noise. `skip` avoids firing the query for everything else.
  const { data: usageData, isFetching: isUsageLoading } = useGetPromptUsageQuery(
    selectedPrompt?.id ?? "",
    { skip: !selectedPrompt?.id || !isDuplicate },
  );
  const inUseCount = usageData?.count ?? 0;
  const isInUse = inUseCount > 0;

  const handleDeleteClick = useCallback(() => {
    if (!selectedPrompt?.id || !onDelete || isDeleting || isInUse) return;
    setShowDeleteConfirmModal(true);
  }, [selectedPrompt?.id, onDelete, isDeleting, isInUse]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedPrompt?.id || !onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(selectedPrompt.id);
      setShowDeleteConfirmModal(false);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedPrompt?.id, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmModal(false);
  }, []);

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
            <Field label="UUID">
              <span className="font-mono text-base text-typography-800 break-all">
                {selectedPrompt?.id ?? "—"}
              </span>
            </Field>

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

            <Field label="LLM Model">
              <select
                value={formData.model ?? ""}
                onChange={event => {
                  const value = event.target.value || undefined;
                  handleFieldChange("model", value);
                  // Send the explicit provider alongside the model so runtimes
                  // don't infer it from the model name.
                  handleFieldChange("provider", resolveProvider(value));
                  // A model that rejects a custom temperature (e.g. gpt-5)
                  // clears any existing override so we don't send an invalid value.
                  const supportsTemp = !value || (tempSupportByModel.get(value) ?? true);
                  if (!supportsTemp && typeof formData.temperature === "number") {
                    handleFieldChange("temperature", undefined);
                  }
                }}
                className="border-none focus:outline-none text-base w-full px-0 bg-transparent cursor-pointer"
              >
                <option value="">Default (inherit)</option>
                {modelGroups.map(group => (
                  <optgroup key={group.provider} label={group.label}>
                    {group.models.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label="LLM Temperature" multiline>
              <div className="w-full flex flex-col gap-3 py-1">
                <label
                  className={
                    "flex items-center gap-2 text-base " +
                    (selectedModelSupportsTemperature
                      ? "text-typography-900 cursor-pointer"
                      : "text-typography-400 cursor-not-allowed")
                  }
                >
                  <input
                    type="checkbox"
                    disabled={!selectedModelSupportsTemperature}
                    checked={typeof formData.temperature === "number"}
                    onChange={event =>
                      handleFieldChange(
                        "temperature",
                        event.target.checked ? PROMPT_TEMPERATURE_DEFAULT : undefined,
                      )
                    }
                  />
                  Override temperature for this prompt
                </label>
                {!selectedModelSupportsTemperature && (
                  <span className="text-typography-500 text-sm">
                    {formData.model} doesn’t support a custom temperature.
                  </span>
                )}
                {selectedModelSupportsTemperature && typeof formData.temperature === "number" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-typography-500 text-sm">0 – 2</span>
                      <span className="text-primary-600 text-base font-medium tabular-nums">
                        {formData.temperature.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={formData.temperature}
                      onChange={event =>
                        handleFieldChange("temperature", parseFloat(event.target.value))
                      }
                      aria-label="LLM Temperature"
                      className="w-full accent-primary-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </Field>

            {(availableVariables.length > 0 || unusedVariables.length > 0) && (
              <Field label="Available variables" multiline>
                {/*
                  Single chip cluster covering BOTH "used in this prompt"
                  and "available but not used" variables. Used chips
                  render with a solid neutral background; unused chips
                  are muted with a dashed border so the author can see
                  at a glance which placeholders are already in their
                  template vs which they could still add. The chip text
                  is always the exact `{name}` an author types into the
                  prompt body — labels would invite typos like `{Name}`.

                  Sorted alphabetically across the merged set so the
                  list stays stable as the author types new placeholders
                  (used) or removes them (back to unused).
                */}
                <div className="flex flex-wrap gap-2">
                  {[
                    ...availableVariables.map(v => ({
                      name: v.name,
                      isUsed: true,
                    })),
                    ...unusedVariables.map(entry => ({
                      name: entry.name,
                      isUsed: false,
                    })),
                  ]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(chip => (
                      <span
                        key={chip.name}
                        className={
                          chip.isUsed
                            ? "inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm bg-neutral-100 text-typography-700 font-mono"
                            : "inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm bg-neutral-50 border border-dashed border-border-light text-typography-500 font-mono"
                        }
                      >
                        <span>{`{${chip.name}}`}</span>
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
              {/*
                Variant-creation actions. Available to everyone now that
                the selectable-prompts feature is GA — was previously
                gated by a testing-phase email allowlist.
              */}
              {onDuplicate && selectedPrompt?.id && selectedPrompt?.promptType && (
                <Button
                  variant={ButtonVariant.SECONDARY}
                  onClick={handleDuplicate}
                  disabled={isDuplicating}
                  title="Create a new variant from this prompt"
                >
                  {isDuplicating ? "Duplicating…" : "Duplicate as variant"}
                </Button>
              )}
              {onDelete && selectedPrompt?.id && isDuplicate && (
                <Button
                  variant={ButtonVariant.SECONDARY}
                  onClick={handleDeleteClick}
                  disabled={isDeleting || isUsageLoading || isInUse}
                  title={
                    isUsageLoading
                      ? "Checking usage…"
                      : isInUse
                        ? `Used by ${inUseCount} simulation${inUseCount === 1 ? "" : "s"} — switch ${inUseCount === 1 ? "it" : "them"} to another prompt before deleting`
                        : "Permanently delete this duplicated variant"
                  }
                >
                  {isDeleting ? "Deleting…" : isInUse ? `In use (${inUseCount})` : "Delete variant"}
                </Button>
              )}
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
      <ActionConfirmationPopup
        isOpen={showDeleteConfirmModal}
        onClose={handleDeleteCancel}
        title="Delete variant"
        description={
          "This will permanently remove the duplicated variant. Simulations " +
          "still pointing to it will fall back to the default. This cannot " +
          "be undone."
        }
        primaryButton={{
          label: isDeleting ? "Deleting…" : "Delete",
          onClick: handleDeleteConfirm,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: handleDeleteCancel,
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
