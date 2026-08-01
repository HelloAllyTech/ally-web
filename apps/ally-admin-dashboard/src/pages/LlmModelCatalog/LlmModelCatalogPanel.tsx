import React, { useEffect, useState } from "react";

import { DoubleArrowRight } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { LLM_PROVIDER_OPTIONS } from "@constants";
import { LlmCatalogModel, LlmCatalogModelPayload } from "@types";

interface LlmModelCatalogPanelProps {
  selected: LlmCatalogModel | null;
  onClose: () => void;
  onSave: (payload: LlmCatalogModelPayload, id?: string) => Promise<void>;
  onDelete?: (row: LlmCatalogModel) => void;
}

const inputClass =
  "w-full border border-border-light rounded-md px-3 py-2 text-base focus:outline-none focus:border-primary-500";

/**
 * Add or edit one model in the catalog.
 *
 * Only providers the runtimes can actually execute are offered — the backend
 * rejects anything else, because a provider with no code branch produces a
 * silently wrong client rather than an error.
 */
export const LlmModelCatalogPanel: React.FC<LlmModelCatalogPanelProps> = ({
  selected,
  onClose,
  onSave,
  onDelete,
}) => {
  const [provider, setProvider] = useState(LLM_PROVIDER_OPTIONS[0]?.value ?? "openai");
  const [model, setModel] = useState("");
  const [label, setLabel] = useState("");
  const [supportsTemperature, setSupportsTemperature] = useState(true);
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProvider(selected?.provider ?? LLM_PROVIDER_OPTIONS[0]?.value ?? "openai");
    setModel(selected?.model ?? "");
    setLabel(selected?.label ?? "");
    setSupportsTemperature(selected?.supportsTemperature ?? true);
    setActive(selected?.active ?? true);
  }, [selected]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        {
          provider,
          model: model.trim(),
          // Blank label falls back to the model id, matching the backend.
          label: label.trim() || model.trim(),
          supportsTemperature,
          active,
        },
        selected?.id,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="llm-model-catalog-panel">
      <div className="flex-1 bg-black bg-opacity-50" onClick={onClose} />
      <div className="w-[50%] min-w-[600px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-10 py-4 border-b border-border-light">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="text-typography-700"
          >
            <DoubleArrowRight />
          </button>
          {selected && onDelete && (
            <Button variant={ButtonVariant.SECONDARY} onClick={() => onDelete(selected)}>
              Delete
            </Button>
          )}
        </div>

        <div className="px-10 pt-6 space-y-5">
          <h2 className="text-2xl font-light">{selected ? "Edit model" : "Add model"}</h2>

          <div>
            <label htmlFor="catalog-provider" className="block text-sm text-typography-700 mb-1">
              Provider
            </label>
            <select
              id="catalog-provider"
              className={inputClass}
              value={provider}
              onChange={event => setProvider(event.target.value)}
            >
              {LLM_PROVIDER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-typography-500">
              Only providers a runtime can execute are listed. Adding a new provider is a code
              change, not a config change.
            </p>
          </div>

          <div>
            <label htmlFor="catalog-model" className="block text-sm text-typography-700 mb-1">
              Model id
            </label>
            <input
              id="catalog-model"
              className={inputClass}
              value={model}
              onChange={event => setModel(event.target.value)}
              placeholder="gpt-5-mini"
            />
            <p className="mt-1 text-xs text-typography-500">
              Exactly as the provider names it — this string is sent on every call.
            </p>
          </div>

          <div>
            <label htmlFor="catalog-label" className="block text-sm text-typography-700 mb-1">
              Display name
            </label>
            <input
              id="catalog-label"
              className={inputClass}
              value={label}
              onChange={event => setLabel(event.target.value)}
              placeholder="GPT-5 mini"
            />
            <p className="mt-1 text-xs text-typography-500">
              Shown in the pickers. Defaults to the model id.
            </p>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={supportsTemperature}
              onChange={event => setSupportsTemperature(event.target.checked)}
            />
            <span>
              <span className="text-typography-800">Accepts a custom temperature</span>
              <span className="block text-xs text-typography-500">
                Turn this off for reasoning models (o-series, GPT-5), which reject any non-default
                temperature. The picker then hides the slider instead of sending a value the
                provider refuses.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={active}
              onChange={event => setActive(event.target.checked)}
            />
            <span>
              <span className="text-typography-800">Active</span>
              <span className="block text-xs text-typography-500">
                Inactive models drop out of the pickers. Anything already pointing at this model
                keeps working — deactivating is the safe way to retire one.
              </span>
            </span>
          </label>

          <div className="pt-2 pb-10">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={!model.trim() || isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
