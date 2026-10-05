import { FC, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { useGetHelplineAdminSettingsQuery, useUpdateHelplineAdminSettingsMutation } from "@src/api";
import { TooltipIcon } from "@src/assets";
import { ToggleSwitch } from "@src/components/toggle-switch";
import { en } from "@src/constants";
import { HelplineAdminSettingsDto, HelplineSettings } from "@src/types";

import { AvailabilitySection } from "./text-helpline/AvailabilitySection";
import { CopilotSection } from "./text-helpline/CopilotSection";
import { primaryButtonClass, secondaryButtonClass } from "./text-helpline/formControls";
import {
  buildPublicLink,
  cloneSettings,
  getApiErrorMessage,
  isSettingsDirty,
  normaliseSettings,
  validateSettings,
} from "./text-helpline/helpers";
import { LanguagesSection } from "./text-helpline/LanguagesSection";
import { PublicLinkRow } from "./text-helpline/PublicLinkRow";
import { RetentionSection } from "./text-helpline/RetentionSection";
import { SafetySection } from "./text-helpline/SafetySection";
import { SummaryFieldsSection } from "./text-helpline/SummaryFieldsSection";
import { TalkerTextSection } from "./text-helpline/TalkerTextSection";

interface TextHelplineSettingsProps {
  /** The organisation's uuid or code — the backend normalises either. */
  tenantId: string;
}

/**
 * Org detail > Text helpline. Platform-admin only (the route needs EDIT_GLOBAL_SETTINGS, and so does
 * the page that hosts this tab).
 *
 * Two independent pieces of state, both held locally so the screen never waits on the query cache:
 *  - the enable switch, saved immediately and rolled back if the server refuses;
 *  - the settings form, saved explicitly with Save after validation.
 */
export const TextHelplineSettings: FC<TextHelplineSettingsProps> = ({ tenantId }) => {
  const { data, isLoading, isError, error, refetch } = useGetHelplineAdminSettingsQuery(tenantId);

  if (!data) {
    if (isError) {
      const detail = getApiErrorMessage(error, "");
      return (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 max-w-3xl border border-border-light rounded-md p-4"
        >
          <p className="text-sm text-typography-900">{en.textHelpline.loadFailed}</p>
          {detail !== "" && <p className="text-sm text-typography-700">{detail}</p>}
          <button type="button" className={secondaryButtonClass} onClick={() => void refetch()}>
            {en.textHelpline.retry}
          </button>
        </div>
      );
    }
    // Covers the first load and the instant before the request starts; neither is "empty".
    return (
      <div
        role="status"
        aria-busy={isLoading}
        className="flex flex-col gap-3 max-w-3xl animate-pulse"
      >
        <div className="h-9 bg-neutral-200 rounded w-1/2" />
        <div className="h-9 bg-neutral-200 rounded w-full" />
        <div className="h-40 bg-neutral-200 rounded w-full" />
        <span className="text-sm text-typography-700">{en.textHelpline.loading}</span>
      </div>
    );
  }

  // Keyed so switching organisations starts a fresh form rather than carrying edits across.
  return <TextHelplineForm key={tenantId} tenantId={tenantId} data={data} />;
};

const TextHelplineForm: FC<{ tenantId: string; data: HelplineAdminSettingsDto }> = ({
  tenantId,
  data,
}) => {
  const text = en.textHelpline;
  // Separate hook instances: a mutation hook tracks only its latest call, so sharing one would make
  // a toggle in flight look like a save in flight (and the reverse).
  const [updateEnabled] = useUpdateHelplineAdminSettingsMutation();
  const [saveSettings, { isLoading: isSaving }] = useUpdateHelplineAdminSettingsMutation();

  // ---- Enable switch (Character Library pattern: local state, optimistic, roll back on failure) ----
  const [localEnabled, setLocalEnabled] = useState(data.enabled);
  const [isTogglingEnabled, setIsTogglingEnabled] = useState(false);

  useEffect(() => {
    setLocalEnabled(data.enabled);
  }, [data.enabled]);

  const handleEnabledToggle = async () => {
    const next = !localEnabled;
    setLocalEnabled(next);
    setIsTogglingEnabled(true);
    try {
      await updateEnabled({ tenantId, enabled: next }).unwrap();
    } catch (error) {
      // Roll the switch back rather than leaving the UI claiming a state the server never accepted.
      setLocalEnabled(!next);
      toast.error(getApiErrorMessage(error, text.enableFailed));
    } finally {
      setIsTogglingEnabled(false);
    }
  };

  // ---- Settings form ----
  const [form, setForm] = useState<HelplineSettings>(() => cloneSettings(data.settings));
  const [showErrors, setShowErrors] = useState(false);

  // When the server value changes, take it only if the admin has nothing unsaved — judged against
  // the value they started from, so an edit in progress is never overwritten by a refetch.
  const previousServerSettings = useRef(data.settings);
  useEffect(() => {
    const previous = previousServerSettings.current;
    previousServerSettings.current = data.settings;
    if (previous === data.settings) return;
    setForm(current =>
      isSettingsDirty(current, previous) ? current : cloneSettings(data.settings),
    );
  }, [data.settings]);

  const isDirty = useMemo(() => isSettingsDirty(form, data.settings), [form, data.settings]);
  // Quiet until the first failed Save, then live, so a fix clears its message as it is typed.
  const errors = useMemo(() => (showErrors ? validateSettings(form) : {}), [form, showErrors]);

  const handleChange = (patch: Partial<HelplineSettings>) =>
    setForm(current => ({ ...current, ...patch }));

  const handleDiscard = () => {
    setForm(cloneSettings(data.settings));
    setShowErrors(false);
  };

  const handleSave = async () => {
    setShowErrors(true);
    const problems = Object.keys(validateSettings(form)).length;
    if (problems > 0) {
      toast.error(text.fixErrors(problems));
      return;
    }
    try {
      const saved = await saveSettings({
        tenantId,
        settings: normaliseSettings(form),
      }).unwrap();
      toast.success(text.saved);
      if (saved?.settings) setForm(cloneSettings(saved.settings));
      setShowErrors(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, text.saveFailed));
    }
  };

  const sectionProps = { form, defaults: data.defaults, errors, onChange: handleChange };

  return (
    <div className="flex flex-col gap-6 max-w-3xl pb-4 font-primary">
      <div className="flex flex-col gap-4">
        <div className="flex h-9 flex-row justify-between items-center">
          <div className="flex flex-row items-center gap-2 text-sm text-typography-700 font-normal">
            {text.enableLabel}
            <Tooltip label={text.enableHint} align="top">
              <button
                type="button"
                className="cursor-pointer inline-flex items-center"
                aria-label={text.moreInfo}
              >
                <TooltipIcon />
              </button>
            </Tooltip>
          </div>
          <div className="flex flex-row items-center gap-2">
            <ToggleSwitch
              enabled={localEnabled}
              onChange={() => void handleEnabledToggle()}
              label={text.enableLabel}
              disabled={isTogglingEnabled}
            />
            <span className="text-sm text-typography-900 font-normal">
              {localEnabled ? en.common.enabled : en.common.disabled}
            </span>
          </div>
        </div>

        <PublicLinkRow url={buildPublicLink(data.publicPath)} />
      </div>

      <AvailabilitySection {...sectionProps} />
      <LanguagesSection {...sectionProps} />
      <TalkerTextSection {...sectionProps} />
      <SafetySection {...sectionProps} />
      <CopilotSection {...sectionProps} />
      <RetentionSection {...sectionProps} />
      <SummaryFieldsSection {...sectionProps} />

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-border-light bg-white py-3">
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!isDirty || isSaving}
          onClick={() => void handleSave()}
        >
          {isSaving ? text.saving : text.save}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={!isDirty || isSaving}
          onClick={handleDiscard}
        >
          {text.discard}
        </button>
        {isDirty && <span className="text-sm text-typography-700">{text.unsavedChanges}</span>}
      </div>
    </div>
  );
};
