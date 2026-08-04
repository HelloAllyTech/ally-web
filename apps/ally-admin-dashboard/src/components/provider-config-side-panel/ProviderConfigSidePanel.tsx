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
  /**
   * Run a live check against the provider for a saved row.
   *
   * Optional so a registry without a meaningful test (STT needs audio input,
   * not a text prompt) simply doesn't render the control. Resolves with a
   * human-readable outcome; rejects only if the request itself failed.
   */
  onTest?: (id: string) => Promise<ProviderConfigTestResult>;
}

export interface ProviderConfigTestResult {
  ok: boolean;
  /** One line for the happy path, e.g. "ok · 312 ms · 8→2 tokens". */
  summary: string;
  /** The provider's own error, shown verbatim and allowed to wrap. */
  detail?: string;
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
  onTest,
}) => {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<string>(providerOptions[0]?.value ?? "");
  const [config, setConfig] = useState<Record<string, any>>({});
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderConfigTestResult | null>(null);

  useEffect(() => {
    setName(selected?.name ?? "");
    setProvider(selected?.provider ?? providerOptions[0]?.value ?? "");
    setConfig({ ...(selected?.config ?? {}) });
    setActive(selected?.active ?? true);
    // A result from the previously opened row would otherwise read as if it
    // described this one.
    setTestResult(null);
  }, [selected, isOpen, providerOptions]);

  const handleTest = useCallback(async () => {
    if (!onTest || !selected?.id) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      setTestResult(await onTest(selected.id));
    } catch (error: any) {
      setTestResult({
        ok: false,
        summary: "Could not run the test",
        detail: error?.data?.message ?? error?.message ?? "Request failed",
      });
    } finally {
      setIsTesting(false);
    }
  }, [onTest, selected?.id]);

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
          <div className="flex items-center gap-3">
            {/* Only for a saved row: the test runs against what is stored, not
                what is currently typed in the form. */}
            {selected && onTest && (
              <Button variant={ButtonVariant.SECONDARY} onClick={handleTest} disabled={isTesting}>
                {isTesting ? "Testing…" : "Test model"}
              </Button>
            )}
            {selected && onDelete && (
              <Button variant={ButtonVariant.SECONDARY} onClick={() => onDelete(selected)}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {testResult && (
          <div
            data-testid="provider-config-test-result"
            className={`mx-10 ml-[46px] mt-4 rounded-md border px-4 py-3 text-sm ${
              testResult.ok
                ? "border-success-400 bg-success-50 text-typography-800"
                : "border-destructive-500 bg-destructive-50 text-typography-800"
            }`}
          >
            <div className="font-medium">
              {testResult.ok ? "Model responded" : "Model did not respond"}
            </div>
            <div className="mt-1 text-typography-700">{testResult.summary}</div>
            {testResult.detail && (
              // The provider's own wording, wrapped rather than truncated — a
              // deprecation notice names the replacement model, and cutting it
              // off would hide the one useful part.
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-typography-700">
                {testResult.detail}
              </pre>
            )}
          </div>
        )}

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
