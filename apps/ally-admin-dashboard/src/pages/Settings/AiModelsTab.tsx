import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  Button,
  InlineNotification,
  SkeletonText,
  TextInput,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useGetBugHunterModelSettingsQuery,
  useGetBuilderSettingsQuery,
  useUpdateBugHunterModelSettingsMutation,
  useUpdateBuilderSettingsMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { en } from "@constants";
import { BugHunterModelSettings } from "@types";

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium text-typography-900">{label}</span>
      {hint && (
        <Tooltip label={hint} align="top">
          <button type="button" className="inline-flex cursor-pointer items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      )}
    </div>
    {children}
  </div>
);

/** Builder's own three tiers, trimmed to just the fields this tab edits. */
type BuilderModelDraft = {
  plannerModel: string | null;
  coderModel: string | null;
  verifierModel: string | null;
};

/**
 * Bug Hunter's model settings. Uses
 * `useUpdateBugHunterModelSettingsMutation` — a `GlobalSettings` row, not a
 * bespoke column, so this tab doesn't repeat the one-off settings table
 * Builder's own `builder_settings` already copied from Bug Hunter's.
 */
const BugHunterModelSection: React.FC = () => {
  const strings = en.settings.aiModels;
  const { data, isLoading, isError } = useGetBugHunterModelSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateBugHunterModelSettingsMutation();
  const [draft, setDraft] = useState<BugHunterModelSettings | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const set = <K extends keyof BugHunterModelSettings>(key: K, value: BugHunterModelSettings[K]) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings(draft).unwrap();
      toast.success(strings.saved);
    } catch {
      toast.error(strings.bugHunterSaveFailed);
    }
  };

  return (
    <section className="rounded-md border border-border-light p-4">
      <h3 className="text-base font-secondary text-typography-900">{strings.bugHunterHeading}</h3>

      {isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={strings.bugHunterLoadFailed}
        />
      )}

      {isLoading || !draft ? (
        <SkeletonText paragraph lineCount={4} className="mt-3" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={strings.defaultModelLabel} hint={strings.defaultModelHelp}>
              <TextInput
                id="settings-ai-models-bug-hunter-default-model"
                labelText={strings.defaultModelLabel}
                hideLabel
                value={draft.defaultModel}
                onChange={event => set("defaultModel", event.target.value)}
              />
            </Field>
            <Field label={strings.escalationModelLabel} hint={strings.escalationModelHelp}>
              <TextInput
                id="settings-ai-models-bug-hunter-escalation-model"
                labelText={strings.escalationModelLabel}
                hideLabel
                value={draft.escalationModel}
                onChange={event => set("escalationModel", event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Button kind="primary" size="sm" disabled={isSaving} onClick={() => void handleSave()}>
              {strings.save}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

/**
 * Builder's planner/coder/verifier tiers. Its other settings (kill switch,
 * concurrency, budget, repo maps) stay on `/builder/settings` — this section
 * only edits the three model fields, via the same
 * `useUpdateBuilderSettingsMutation` that page already uses (every field on
 * it is optional, so sending just these three is a normal partial update).
 */
const BuilderModelSection: React.FC = () => {
  const strings = en.settings.aiModels;
  const builderStrings = en.builder.settings;
  const { data, isLoading, isError } = useGetBuilderSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateBuilderSettingsMutation();
  const [draft, setDraft] = useState<BuilderModelDraft | null>(null);

  useEffect(() => {
    if (data) {
      setDraft({
        plannerModel: data.plannerModel,
        coderModel: data.coderModel,
        verifierModel: data.verifierModel,
      });
    }
  }, [data]);

  const set = (key: keyof BuilderModelDraft, value: string | null) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings({
        // "" clears a tier back to the platform default — see api/builder.ts.
        plannerModel: draft.plannerModel ?? "",
        coderModel: draft.coderModel ?? "",
        verifierModel: draft.verifierModel ?? "",
      }).unwrap();
      toast.success(strings.saved);
    } catch {
      toast.error(strings.builderSaveFailed);
    }
  };

  return (
    <section className="mt-4 rounded-md border border-border-light p-4">
      <h3 className="text-base font-secondary text-typography-900">{strings.builderHeading}</h3>

      {isError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          title={strings.builderLoadFailed}
        />
      )}

      {isLoading || !draft ? (
        <SkeletonText paragraph lineCount={4} className="mt-3" />
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextInput
              id="settings-ai-models-builder-planner-model"
              labelText={builderStrings.plannerModelLabel}
              placeholder={builderStrings.modelPlaceholder}
              value={draft.plannerModel ?? ""}
              onChange={event => set("plannerModel", event.target.value || null)}
            />
            <TextInput
              id="settings-ai-models-builder-coder-model"
              labelText={builderStrings.coderModelLabel}
              placeholder={builderStrings.modelPlaceholder}
              value={draft.coderModel ?? ""}
              onChange={event => set("coderModel", event.target.value || null)}
            />
            <TextInput
              id="settings-ai-models-builder-verifier-model"
              labelText={builderStrings.verifierModelLabel}
              placeholder={builderStrings.modelPlaceholder}
              value={draft.verifierModel ?? ""}
              onChange={event => set("verifierModel", event.target.value || null)}
            />
          </div>
          <div className="mt-4">
            <Button kind="primary" size="sm" disabled={isSaving} onClick={() => void handleSave()}>
              {strings.save}
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

/**
 * Bug Hunter's and Builder's model tiers, one tab. Each section still reads
 * and writes its own feature's backend independently — Bug Hunter's a
 * `GlobalSettings` row, Builder's its own `builder_settings` columns — so
 * this tab is a UI convenience layered on top of two separate storage
 * locations, not a merge of them. Builder's model fields stay editable from
 * `/builder/settings` too; this doesn't replace that page, only adds a
 * second, combined way to reach the same data.
 */
export const AiModelsTab: React.FC = () => (
  <div>
    <BugHunterModelSection />
    <BuilderModelSection />
  </div>
);
