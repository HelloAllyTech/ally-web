import React, { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Button,
  CarbonToggle,
  InlineNotification,
  NumberInput,
  SkeletonText,
  TextInput,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useGetBuilderRepoMapsQuery,
  useGetBuilderSettingsQuery,
  useUpdateBuilderSettingsMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { en, ROUTES } from "@constants";
import { BuilderSettings as BuilderSettingsType } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

/** Local editable copy of the fields this page actually exposes. */
type SettingsDraft = Pick<
  BuilderSettingsType,
  | "enabled"
  | "maxConcurrentBuilds"
  | "defaultBudgetUsd"
  | "plannerModel"
  | "coderModel"
  | "verifierModel"
>;

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

/**
 * Platform-wide Builder controls: the kill switch, the concurrency ceiling,
 * the default spend cap, and the per-tier model defaults — everything a
 * per-build override in `StartBuildDialog` sits above (session override →
 * these → the runner's own hardcoded fallback).
 *
 * Read-only repo-map freshness lives here too rather than as its own page:
 * it's the one piece of context worth checking before turning Builder back on
 * after an incident — a stale map means the agent's read of a repo may not
 * reflect what actually merged since.
 */
export const BuilderSettings: React.FC = () => {
  const strings = en.builder.settings;
  const navigate = useNavigate();

  const { data, isLoading, isError } = useGetBuilderSettingsQuery();
  const { data: repoMapsData } = useGetBuilderRepoMapsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateBuilderSettingsMutation();

  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  useEffect(() => {
    if (data) {
      setDraft({
        enabled: data.enabled,
        maxConcurrentBuilds: data.maxConcurrentBuilds,
        defaultBudgetUsd: data.defaultBudgetUsd,
        plannerModel: data.plannerModel,
        coderModel: data.coderModel,
        verifierModel: data.verifierModel,
      });
    }
  }, [data]);

  const set = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings({
        enabled: draft.enabled,
        maxConcurrentBuilds: draft.maxConcurrentBuilds,
        ...(draft.defaultBudgetUsd !== null
          ? { defaultBudgetUsd: Number(draft.defaultBudgetUsd) }
          : {}),
        // "" clears a tier back to the platform default — see api/builder.ts.
        plannerModel: draft.plannerModel ?? "",
        coderModel: draft.coderModel ?? "",
        verifierModel: draft.verifierModel ?? "",
      }).unwrap();
      toast.success(strings.saved);
    } catch {
      toast.error(strings.saveFailed);
    }
  };

  const repoMaps = repoMapsData?.maps ?? [];

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-6">
      <header>
        <Button kind="ghost" size="sm" onClick={() => navigate(ROUTES.BUILDER)}>
          ← {strings.backToBuilder}
        </Button>
        <h1 className="mt-2 text-xl font-semibold text-typography-900">{strings.title}</h1>
        <p className="mt-1 text-sm text-typography-600">{strings.subtitle}</p>
      </header>

      {isError && (
        <InlineNotification kind="error" lowContrast hideCloseButton title={strings.loadFailed} />
      )}

      {isLoading || !draft ? (
        <SkeletonText paragraph lineCount={10} />
      ) : (
        <>
          {/* The kill switch sits first and alone, same as WhatsApp's settings
              page — it's the control someone reaches for in an incident and
              shouldn't be buried under thresholds. */}
          <section className="rounded-md border border-border-light p-4">
            <CarbonToggle
              id="builder-settings-enabled"
              labelText={strings.enabledLabel}
              size="sm"
              toggled={draft.enabled}
              onToggle={(checked: boolean) => set("enabled", checked)}
            />
            <p className="pt-1 text-xs text-typography-500">{strings.enabledHelp}</p>
          </section>

          <section className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={strings.maxConcurrentBuildsLabel}
                hint={strings.maxConcurrentBuildsHelp}
              >
                <NumberInput
                  id="builder-settings-max-concurrent"
                  label={strings.maxConcurrentBuildsLabel}
                  hideLabel
                  hideSteppers
                  min={1}
                  max={20}
                  value={draft.maxConcurrentBuilds}
                  onChange={(_event: unknown, state: { value: number | string } | undefined) => {
                    const next = Number(state?.value);
                    if (!Number.isNaN(next)) set("maxConcurrentBuilds", next);
                  }}
                />
              </Field>
              <Field label={strings.defaultBudgetLabel} hint={strings.defaultBudgetHelp}>
                <NumberInput
                  id="builder-settings-default-budget"
                  label={strings.defaultBudgetLabel}
                  hideLabel
                  hideSteppers
                  min={0}
                  value={draft.defaultBudgetUsd ?? ""}
                  onChange={(_event: unknown, state: { value: number | string } | undefined) =>
                    set(
                      "defaultBudgetUsd",
                      state?.value === undefined || state.value === "" ? null : String(state.value),
                    )
                  }
                />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-secondary text-typography-900">
                {strings.modelsHeading}
              </h3>
              <Tooltip label={strings.modelsHelp} align="top">
                <button type="button" className="inline-flex cursor-pointer items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextInput
                id="builder-settings-planner-model"
                labelText={strings.plannerModelLabel}
                placeholder={strings.modelPlaceholder}
                value={draft.plannerModel ?? ""}
                onChange={event => set("plannerModel", event.target.value || null)}
              />
              <TextInput
                id="builder-settings-coder-model"
                labelText={strings.coderModelLabel}
                placeholder={strings.modelPlaceholder}
                value={draft.coderModel ?? ""}
                onChange={event => set("coderModel", event.target.value || null)}
              />
              <TextInput
                id="builder-settings-verifier-model"
                labelText={strings.verifierModelLabel}
                placeholder={strings.modelPlaceholder}
                value={draft.verifierModel ?? ""}
                onChange={event => set("verifierModel", event.target.value || null)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-secondary text-typography-900">
                {strings.repoMapsHeading}
              </h3>
              <Tooltip label={strings.repoMapsHelp} align="top">
                <button type="button" className="inline-flex cursor-pointer items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </div>
            {repoMaps.length === 0 ? (
              <p className="text-sm text-typography-500">{strings.repoMapNeverGenerated}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {repoMaps.map(map => (
                  <li
                    key={map.repo}
                    className="flex items-center justify-between gap-2 border-b border-border-light py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-typography-900">
                      {map.repo}
                    </span>
                    <span
                      className="shrink-0 text-xs text-typography-500"
                      title={map.generatedAt ? formatDate(map.generatedAt) : undefined}
                    >
                      {map.generatedAt && map.commitSha
                        ? strings.repoMapGeneratedAt(
                            formatRelativeTime(map.generatedAt),
                            map.commitSha.slice(0, 7),
                          )
                        : strings.repoMapNeverGenerated}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div>
            <Button kind="primary" disabled={isSaving} onClick={() => void handleSave()}>
              {strings.save}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
