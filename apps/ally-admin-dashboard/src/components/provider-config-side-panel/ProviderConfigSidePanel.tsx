import React, { useCallback, useEffect, useMemo, useState } from "react";

import { DoubleArrowRight } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  getProviderSchemaFields,
  ProviderConfigField,
  ProviderConfigSchema,
  readConfigField,
  validateProviderConfig,
} from "@constants";

export interface ProviderConfigRow {
  id: string;
  name: string;
  provider: string;
  config: Record<string, any>;
  active: boolean;
}

export type ProviderConfigPayload = Omit<ProviderConfigRow, "id">;

interface ProviderConfigSidePanelProps {
  selected: ProviderConfigRow | null;
  isOpen: boolean;
  /** e.g. "STT config" — used in the title and the empty-name placeholder. */
  subject: string;
  schema: ProviderConfigSchema;
  providerOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSave: (payload: ProviderConfigPayload, id?: string) => Promise<void>;
  onDelete?: (row: ProviderConfigRow) => void;
}

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex flex-row min-h-[40px] items-center text-base justify-between">
    <div className="w-[40%] pr-4">
      <div className="text-typography-700">{label}</div>
      {hint && <div className="text-typography-500 text-sm mt-1">{hint}</div>}
    </div>
    <div className="w-[60%]">{children}</div>
  </div>
);

const textInputClass =
  "w-full border border-border-light rounded-md h-10 px-3 text-typography-900 bg-transparent";

/**
 * Create/edit form for one row of any provider-config registry.
 *
 * The provider's fields are rendered from its schema rather than hardcoded, so
 * Speech Recognition and Language Model share this component and adding a
 * provider parameter is a schema edit. Model inputs stay free text on purpose:
 * providers ship new models faster than we redeploy, and a stale allow-list
 * would block a legitimate `nova-4` on launch day.
 */
export const ProviderConfigSidePanel: React.FC<ProviderConfigSidePanelProps> = ({
  selected,
  isOpen,
  subject,
  schema,
  providerOptions,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<string>(providerOptions[0]?.value ?? "");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    setName(selected?.name ?? "");
    setProvider(selected?.provider ?? providerOptions[0]?.value ?? "");
    setConfig({ ...(selected?.config ?? {}) });
    setActive(selected?.active ?? true);
  }, [selected, isOpen, providerOptions]);

  const fields = useMemo(() => getProviderSchemaFields(schema, provider), [schema, provider]);

  const validationError = useMemo(() => {
    if (!name.trim()) return "Name is required.";
    return validateProviderConfig(schema, provider, config)[0] ?? null;
  }, [name, schema, provider, config]);

  const isDirty = useMemo(() => {
    if (!selected) return !!name.trim() || Object.keys(config).length > 0;
    return (
      name !== selected.name ||
      provider !== selected.provider ||
      JSON.stringify(config) !== JSON.stringify(selected.config ?? {}) ||
      active !== selected.active
    );
  }, [selected, name, provider, config, active]);

  const setFieldValue = useCallback((field: ProviderConfigField, value: any) => {
    setConfig(previous => {
      const next = { ...previous };
      // Clear the legacy spellings too, so an alias can't shadow the edit.
      for (const alias of field.aliases ?? []) delete next[alias];
      // Drop empty values rather than sending "" — the provider would treat it
      // as a real (invalid) value.
      if (value === "" || value === undefined || value === null) delete next[field.key];
      else next[field.key] = value;
      return next;
    });
  }, []);

  const handleClose = useCallback(() => {
    if (isDirty) setShowConfirmationModal(true);
    else onClose();
  }, [isDirty, onClose]);

  const handleSave = useCallback(async () => {
    if (validationError) return;
    setIsSaving(true);
    try {
      // Numbers arrive from text inputs as strings; coerce the ones the schema
      // declares numeric so the backend gets the type it validates.
      const coerced: Record<string, any> = { ...config };
      for (const field of fields) {
        if (field.type === "number" && coerced[field.key] !== undefined) {
          coerced[field.key] = Number(coerced[field.key]);
        }
      }
      await onSave({ name: name.trim(), provider, config: coerced, active }, selected?.id);
    } finally {
      setIsSaving(false);
    }
  }, [validationError, config, fields, name, provider, active, onSave, selected?.id]);

  if (!isOpen) return null;

  const renderField = (field: ProviderConfigField) => {
    const value = readConfigField(config, field);

    if (field.type === "boolean") {
      return (
        <input
          type="checkbox"
          checked={value === true}
          onChange={event => setFieldValue(field, event.target.checked)}
          aria-label={field.label}
          className="h-5 w-5"
        />
      );
    }

    if (field.type === "select") {
      return (
        <select
          aria-label={field.label}
          className={textInputClass}
          value={value ?? ""}
          onChange={event => setFieldValue(field, event.target.value)}
        >
          <option value="">Not set</option>
          {(field.options ?? []).map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        aria-label={field.label}
        className={textInputClass}
        value={value ?? ""}
        placeholder={field.placeholder ?? ""}
        onChange={event => setFieldValue(field, event.target.value)}
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex" data-testid="provider-config-side-panel">
      <div className="flex-1 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="w-[50%] min-w-[700px] bg-white shadow-xl border-l-[1px] border-border-light overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between px-10 pl-[46px] py-4 border-b border-border-light">
          <button
            type="button"
            onClick={handleClose}
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

        <div className="h-[calc(100vh-100px)] px-10 pl-[46px] pt-2 overflow-y-auto custom-scrollbar">
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={`New ${subject}`}
              aria-label="Name"
              className="border-none focus:outline-none text-2xl font-light w-full"
            />
          </div>

          <div className="space-y-3">
            <Field label="Provider">
              {/* Native select rather than the Carbon Dropdown: its absolutely
                  positioned hidden label leaks onto <html> and creates phantom
                  horizontal scroll in this admin app. */}
              <select
                aria-label="Provider"
                className={textInputClass}
                value={provider}
                onChange={event => setProvider(event.target.value)}
              >
                {providerOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            {fields.map(field => (
              <Field key={field.key} label={field.label} hint={field.hint}>
                {renderField(field)}
              </Field>
            ))}

            <Field
              label="Active"
              hint="Inactive configs keep working for whatever already points at them, but stop being offered as a new choice."
            >
              <input
                type="checkbox"
                checked={active}
                onChange={event => setActive(event.target.checked)}
                aria-label="Active"
                className="h-5 w-5"
              />
            </Field>

            {validationError && (
              <div className="text-red-600 text-sm mt-2 font-medium">⚠️ {validationError}</div>
            )}
          </div>

          <div className="flex gap-3 mt-8 pb-6 justify-center">
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={handleSave}
              disabled={isSaving || !!validationError}
              title={validationError ?? ""}
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="Unsaved Changes"
        description="You have unsaved changes. Closing will discard them."
        primaryButton={{
          label: "Close Anyway",
          onClick: () => {
            setShowConfirmationModal(false);
            onClose();
          },
        }}
        secondaryButton={{ label: "Keep Editing", onClick: () => setShowConfirmationModal(false) }}
      />
    </div>
  );
};
