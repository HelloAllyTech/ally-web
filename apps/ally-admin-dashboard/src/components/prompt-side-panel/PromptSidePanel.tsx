import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";

import { createPortal } from "react-dom";
import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import { useGetPromptUsageQuery, useGetLlmModelsQuery } from "@api";
import { Refresh, DoubleArrowRight, Copy, Delete, CheckCircle, ArrowDown } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  en,
  MAIN_AGENT_PROMPT_VARIABLE_CATALOG,
  PROMPT_LLM_MODEL_OPTIONS,
  PROMPT_TEMPERATURE_DEFAULT,
  providerForModel,
} from "@constants";
import { useCreatePortal } from "@hooks";
import { Prompt, LlmProviderName } from "@types";

import PromptTranslationsSection from "./PromptTranslationsSection";
import {
  getAvailableVariableName,
  normalizeAvailableVariables,
} from "../../utils/availableVariables";

/** Prompt types whose templates are auto-translated (mirrors ally-be). */
const TRANSLATABLE_PROMPT_TYPES = new Set(["main_agent", "branching"]);

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

/** Idle time after the last edit before an auto-save is persisted. */
const AUTO_SAVE_DEBOUNCE_MS = 700;

interface PromptSidePanelProps {
  selectedPrompt: Prompt | null;
  allPrompts: Prompt[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (prompt: Prompt) => void;
  /**
   * Silent persistence path used by the panel's auto-save. Unlike `onUpdate`
   * (which toasts and closes the panel — kept for the block editor and the
   * revert-to-default action), this MUST NOT toast or close: the panel drives
   * a debounced save on every edit and reflects the result in its own inline
   * status indicator. Implementations should let errors propagate (throw /
   * reject) so the panel can surface a "couldn't save" state.
   */
  onAutoSave?: (prompt: Prompt) => Promise<void>;
  /**
   * Optional duplicate action. When provided, a "Duplicate as variant"
   * icon button appears in the panel header for prompts that have a promptType
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
}

/**
 * Carbon "productive" text-input shape reused across every editable control
 * in the panel: gray-10 field fill (`$field-01`), a single bottom border that
 * thickens to the brand blue on focus (`$focus`), square corners, no rounding.
 * Applied to native <input>/<select> and the auto-expanding textarea so they
 * all read as one Carbon form. `w-full` because the panel is single-column now
 * — the label sits above the control, both spanning the full drawer width.
 */
const CARBON_FIELD =
  "w-full h-10 rounded-none border-0 border-b border-border-dark bg-secondary-50 px-3 text-base text-neutral-800 placeholder:text-typography-600 focus:outline-none focus:border-b-2 focus:border-primary-500 transition-colors";

// AutoExpandableTextarea bakes in `px-0 py-0` and a negative `mt-[-8px]`
// (leftovers from the old borderless inline layout); `!` overrides are needed
// for the Carbon padding/margin to win — the component already uses `!text-md`,
// so this matches its own precedence strategy.
const CARBON_FIELD_TEXTAREA =
  "w-full rounded-none border-0 border-b border-border-dark bg-secondary-50 !px-3 !py-2 !mt-0 text-neutral-800 placeholder:text-typography-600 focus:outline-none focus:border-b-2 focus:border-primary-500 resize-none overflow-y-auto custom-scrollbar transition-colors";

/**
 * Single-column field: Carbon-style label (12px, secondary text) stacked
 * directly above its control, both full width. Replaces the former 40/60
 * two-column row that wasted horizontal space and truncated long values.
 */
const Field: React.FC<FieldProps> = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs tracking-[0.32px] text-neutral-600">{label}</label>
    <div className="text-base text-neutral-800">{children}</div>
  </div>
);

/** Auto-save lifecycle surfaced inline in the panel header. */
type SaveState = "saved" | "unsaved" | "saving" | "error";

/**
 * Compact, self-explanatory save-status pill shown next to the panel title.
 * Everything the user types is persisted automatically, so this is the only
 * feedback that a change landed — hence it distinguishes the debounce window
 * ("Unsaved changes"), the in-flight request ("Saving…"), success ("Saved"),
 * failure (with a retry affordance), and the blocked-by-validation case.
 */
const SaveStatusIndicator: React.FC<{
  state: SaveState;
  isDirty: boolean;
  isValid: boolean;
  onRetry: () => void;
}> = ({ state, isDirty, isValid, onRetry }) => {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-typography-700">
        <span className="w-3 h-3 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 text-sm text-destructive-500 hover:text-destructive-600 transition-colors"
        title="Retry saving"
      >
        <Refresh width={14} height={14} />
        Couldn’t save — retry
      </button>
    );
  }
  if (isDirty && !isValid) {
    return (
      <span className="text-sm text-warning-text">Name, description &amp; prompt required</span>
    );
  }
  if (isDirty) {
    return <span className="text-sm text-typography-600">Unsaved changes…</span>;
  }
  return (
    <span className="flex items-center gap-1.5 text-sm text-typography-600">
      <CheckCircle width={14} height={14} className="text-success-500" />
      Saved
    </span>
  );
};

/** Carbon ghost icon button (square, no radius) for the header actions. */
const IconButton: React.FC<{
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ title, onClick, disabled = false, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    className="flex items-center justify-center w-9 h-9 rounded-none text-typography-700 hover:bg-secondary-50 hover:text-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    {children}
  </button>
);

interface LlmModelGroup {
  provider: string;
  label: string;
  models: { value: string; label: string }[];
}

/** One selectable row in the LLM-model menu. */
const LlmModelOption: React.FC<{
  label: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ label, selected, onSelect }) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    onClick={onSelect}
    className={
      "w-full text-left px-3 py-2 text-base transition-colors " +
      (selected
        ? "bg-primary-50 text-primary-600 font-medium"
        : "text-neutral-800 hover:bg-secondary-50")
    }
  >
    {label}
  </button>
);

/**
 * Custom LLM-model picker matching the panel's Carbon fields (gray-10 fill,
 * bottom border, brand-blue focus underline) instead of a native <select>.
 * The menu is portalled to <body> and positioned by useCreatePortal so the
 * drawer's `overflow-y-auto` can't clip it (see the drawer-tooltip-clip
 * gotcha); it flips/clamps to the viewport. Options are grouped by provider
 * with a leading "Default (inherit)" row.
 */
const LlmModelDropdown: React.FC<{
  value: string; // "" → inherit
  groups: LlmModelGroup[];
  onSelect: (value: string) => void;
}> = ({ value, groups, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const position = useCreatePortal(triggerRef, isOpen, {
    matchTriggerWidth: true,
    dropdownRef: menuRef,
    dropdownHeight: 288,
  });

  const selectedLabel = useMemo(() => {
    if (!value) return "Default (inherit)";
    for (const group of groups) {
      const match = group.models.find(model => model.value === value);
      if (match) return match.label;
    }
    return value; // unknown/legacy model — show the raw id rather than blank
  }, [value, groups]);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  const handleSelect = useCallback(
    (next: string) => {
      onSelect(next);
      close();
    },
    [onSelect, close],
  );

  return (
    <div className="relative w-full" ref={triggerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className={
          CARBON_FIELD +
          " flex items-center justify-between gap-2 text-left cursor-pointer" +
          (isOpen ? " !border-b-2 !border-primary-500" : "")
        }
      >
        <span className="truncate">{selectedLabel}</span>
        <ArrowDown
          width={16}
          height={16}
          className={
            "shrink-0 text-typography-700 transition-transform duration-200" +
            (isOpen ? " rotate-180" : "")
          }
        />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] bg-white border border-border-light shadow-lg animate-fadeIn overflow-auto custom-scrollbar py-1"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: 288,
            }}
          >
            <LlmModelOption
              label="Default (inherit)"
              selected={!value}
              onSelect={() => handleSelect("")}
            />
            {groups.map(group => (
              <div key={group.provider}>
                <div className="px-3 pt-2 pb-1 text-xs tracking-[0.32px] uppercase text-neutral-500">
                  {group.label}
                </div>
                {group.models.map(model => (
                  <LlmModelOption
                    key={model.value}
                    label={model.label}
                    selected={model.value === value}
                    onSelect={() => handleSelect(model.value)}
                  />
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

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
  onAutoSave,
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

  const [showRevertConfirmModal, setShowRevertConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Prompt | null>(null);

  // ── Auto-save ────────────────────────────────────────────────────────────
  // Every field edit is debounced and persisted silently via `onAutoSave`;
  // `saveState` drives the inline header indicator. `lastSavedRef` holds the
  // serialized editable fields of the last-persisted state so we can tell a
  // real edit from a no-op (and from the initial load, which must not save).
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const lastSavedRef = useRef<string>("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doSaveRef = useRef<() => void>(() => {});
  const formDataRef = useRef(formData);
  formDataRef.current = formData;
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // Only the fields this panel can edit — used both for change detection and
  // as the shape the parent persists. Model/temperature are normalized so a
  // no-op reselect of the same value doesn't register as a change.
  const serializeEditable = useCallback(
    (d: Partial<Prompt>) =>
      JSON.stringify({
        name: d.name ?? "",
        description: d.description ?? "",
        prompt: d.prompt ?? "",
        model: d.model ?? "",
        temperature: typeof d.temperature === "number" ? d.temperature : null,
        translationEnabled: !!d.translationEnabled,
      }),
    [],
  );

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
    // A prompt carries no declaration of which runtime consumes it — the voice
    // agent, ally-ai and ally-be all read prompts — so the picker cannot know
    // where a model will be asked to run. It therefore offers only models EVERY
    // runtime can execute.
    //
    // This matters concretely: ai-learn's factory raises
    // `Unsupported LLM provider` for Anthropic, so offering a Claude model for
    // a main-agent prompt would fail the session outright. Ollama and vLLM are
    // the mirror case — only the voice agent can reach them.
    //
    // Derived from each model's `runtimes` rather than a fixed provider list,
    // so it widens by itself once a provider gains a branch in the remaining
    // runtimes. Per-prompt runtime metadata would let this narrow to exactly
    // the consuming runtime; see the LLM-config ADR.
    const runtimeCount = new Set(llmModels.flatMap(m => m.runtimes)).size;
    const eligible = llmModels.filter(
      m => new Set(m.runtimes).size === runtimeCount,
    );

    return PROVIDER_ORDER.map(({ provider, label }) => ({
      provider,
      label,
      models: eligible
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
    // A new prompt loaded (or the panel reopened): reset the form and treat the
    // loaded values as the saved baseline so auto-save doesn't fire on open.
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (selectedPrompt) {
      setFormData(selectedPrompt);
      lastSavedRef.current = serializeEditable(selectedPrompt);
    } else {
      const empty = {
        name: "",
        description: "",
        promptCode: "",
        prompt: "",
        useDashboardOverride: false,
      };
      setFormData(empty);
      lastSavedRef.current = serializeEditable(empty);
    }
    setSaveState("saved");
  }, [selectedPrompt, serializeEditable]);

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

  // Assemble the persisted payload from the current form. Returns null when a
  // required field is missing (auto-save then simply waits). Mirrors what the
  // old explicit Save button sent — including auto-enabling the dashboard
  // override the moment an admin edits.
  const buildPayload = useCallback((): Prompt | null => {
    const promptCode = selectedPrompt?.promptCode ?? formData.promptCode ?? "";
    if (!formData.name || !formData.description || !promptCode || !formData.prompt) {
      return null;
    }
    return {
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
      // Opt-in translation flag. Toggling it triggers the same auto-save as any
      // edit; enabling it kicks off an initial translation server-side.
      translationEnabled:
        formData.translationEnabled ?? selectedPrompt?.translationEnabled ?? false,
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
  }, [formData, selectedPrompt, resolveProvider, selectedModelSupportsTemperature]);

  // Required-field gate — the same rule the old Save button enforced.
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

  // Serialized editable state vs the last-persisted baseline → is there an
  // unsaved edit right now?
  const currentSerialized = useMemo(
    () => serializeEditable(formData),
    [formData, serializeEditable],
  );
  const isDirty = currentSerialized !== lastSavedRef.current;

  // Latest-ref save closure: reassigned every render so the debounce timer and
  // the flush-on-close path always persist the newest values (no stale reads).
  doSaveRef.current = () => {
    if (!onAutoSave) return;
    const payload = buildPayload();
    if (!payload) return;
    const snapshot = currentSerialized;
    setSaveState("saving");
    onAutoSave(payload)
      .then(() => {
        if (!mountedRef.current) return;
        lastSavedRef.current = snapshot;
        // If the user kept typing during the request, stay "unsaved" so the
        // follow-up debounce persists the newer content.
        setSaveState(
          serializeEditable(formDataRef.current) === lastSavedRef.current ? "saved" : "unsaved",
        );
      })
      .catch(() => {
        if (mountedRef.current) setSaveState("error");
      });
  };

  // Debounce: persist ~700ms after the last edit. Re-runs only when the
  // serialized content, its validity, or the target prompt changes. A single
  // return (cleanup | undefined) keeps every code path returning the same
  // shape — avoids TS7030 "not all code paths return a value".
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    if (selectedPrompt?.id && onAutoSave && isDirty) {
      if (isFormValid) {
        setSaveState("unsaved");
        const timer = setTimeout(() => doSaveRef.current(), AUTO_SAVE_DEBOUNCE_MS);
        saveTimerRef.current = timer;
        cleanup = () => clearTimeout(timer);
      } else {
        setSaveState("unsaved"); // blocked on required fields — don't persist
      }
    }
    return cleanup;
    // doSaveRef is a stable ref; isDirty derives from currentSerialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSerialized, isDirty, isFormValid, selectedPrompt?.id, onAutoSave]);

  // Persist any pending edit immediately (used on close and Cmd/Ctrl+Enter).
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (
      selectedPrompt?.id &&
      onAutoSave &&
      isFormValid &&
      serializeEditable(formDataRef.current) !== lastSavedRef.current
    ) {
      doSaveRef.current();
    }
  }, [selectedPrompt?.id, onAutoSave, isFormValid, serializeEditable]);

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
    // Everything is auto-saved, so there's no "discard?" prompt anymore — just
    // flush any edit still inside the debounce window before the panel closes.
    flushSave();
    onClose();
  }, [flushSave, onClose]);

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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac) forces an immediate save
      // instead of waiting out the debounce.
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        flushSave();
      }
    },
    [flushSave],
  );

  if (!isOpen || !selectedPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="flex flex-row items-center justify-center gap-2 text-typography-600 hover:text-neutral-800 shrink-0"
            >
              <DoubleArrowRight width={14} height={14} />
              <span className="text-base font-tertiary font-[500] text-typography-900">
                {en.simulation.editPrompt}
              </span>
            </button>
            <span className="h-4 w-px bg-border-light shrink-0" aria-hidden />
            <SaveStatusIndicator
              state={saveState}
              isDirty={isDirty}
              isValid={isFormValid}
              onRetry={flushSave}
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {onDuplicate && selectedPrompt?.id && selectedPrompt?.promptType && (
              <IconButton
                title={isDuplicating ? "Duplicating…" : "Duplicate as variant"}
                onClick={handleDuplicate}
                disabled={isDuplicating}
              >
                <Copy width={18} height={18} />
              </IconButton>
            )}
            {onDelete && selectedPrompt?.id && isDuplicate && (
              <IconButton
                title={
                  isUsageLoading
                    ? "Checking usage…"
                    : isInUse
                      ? `Used by ${inUseCount} simulation${inUseCount === 1 ? "" : "s"} — switch ${inUseCount === 1 ? "it" : "them"} to another prompt before deleting`
                      : "Delete variant"
                }
                onClick={handleDeleteClick}
                disabled={isDeleting || isUsageLoading || isInUse}
              >
                <span className="relative flex">
                  <Delete width={18} height={18} />
                  {isInUse && (
                    <span className="absolute -top-2 -right-2 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-neutral-500 text-white text-[10px] leading-none tabular-nums">
                      {inUseCount}
                    </span>
                  )}
                </span>
              </IconButton>
            )}
            {Boolean(selectedPrompt?.useDashboardOverride) && (
              <button
                onClick={handleRevertClick}
                className="flex items-center gap-1.5 pl-2 pr-1 h-9 text-typography-600 hover:text-neutral-800 transition-colors"
                title={en.simulation.restoreDefault}
              >
                <Refresh width={16} height={16} />
                <span className="text-sm font-medium">{en.simulation.restoreDefault}</span>
              </button>
            )}
          </div>
        </div>

        <div className="h-[calc(100vh-100px)] px-8 pt-2 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            <Field label="UUID">
              <div className="w-full select-all border-b border-border-light bg-secondary-50 px-3 py-2 font-mono text-base text-neutral-700 break-all">
                {selectedPrompt?.id ?? "—"}
              </div>
            </Field>

            <Field label="Prompt Code">
              <div className="w-full select-all border-b border-border-light bg-secondary-50 px-3 py-2 font-mono text-base text-neutral-700 break-all">
                {selectedPrompt?.promptCode ?? formData.promptCode ?? "—"}
              </div>
            </Field>

            <Field label={en.simulation.promptName}>
              <input
                type="text"
                value={formData.name || ""}
                onChange={event => handleFieldChange("name", event.target.value)}
                placeholder={en.simulation.enterPromptName}
                className={CARBON_FIELD}
              />
            </Field>

            <Field label={en.simulation.promptDescription}>
              <input
                type="text"
                value={formData.description || ""}
                onChange={event => handleFieldChange("description", event.target.value)}
                placeholder={en.simulation.enterPromptDescription}
                className={CARBON_FIELD}
              />
            </Field>

            <Field label={en.simulation.promptText}>
              <AutoExpandableTextarea
                maxLines={15}
                minHeight={120}
                value={formData.prompt || ""}
                onChange={value => handleFieldChange("prompt", value)}
                onKeyDown={handleKeyDown}
                placeholder={en.simulation.enterPrompt}
                className={CARBON_FIELD_TEXTAREA}
              />
            </Field>

            <Field label="LLM Model">
              <LlmModelDropdown
                value={formData.model ?? ""}
                groups={modelGroups}
                onSelect={selected => {
                  const value = selected || undefined;
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
              />
            </Field>

            <Field label="LLM Temperature">
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
              <Field label="Available variables">
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
              <Field label={en.simulation.usedBlocks}>
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

            {selectedPrompt?.id &&
              TRANSLATABLE_PROMPT_TYPES.has(
                selectedPrompt?.promptType ?? formData.promptType ?? "",
              ) && (
                <Field label="Translations">
                  <PromptTranslationsSection
                    promptId={selectedPrompt.id}
                    translationEnabled={
                      formData.translationEnabled ?? selectedPrompt.translationEnabled ?? false
                    }
                    onToggleEnabled={value => handleFieldChange("translationEnabled", value)}
                  />
                </Field>
              )}
          </div>

          <div className="pb-6" />
        </div>
      </div>

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
