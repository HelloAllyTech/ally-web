import React, { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  Button,
  CarbonToggle,
  InlineNotification,
  NumberInput,
  Select,
  SelectItem,
  SkeletonText,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  useGetBuilderRepoMapsQuery,
  useGetBuilderSettingsQuery,
  useGetLlmModelsQuery,
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
  | "autoReviewEnabled"
  | "autoApproveEnabled"
  | "autoReleaseEnabled"
  | "autoFixEnabled"
  | "maxFixRunsPerPr"
  | "maxConcurrentBuilds"
  | "defaultBudgetUsd"
  | "defaultEngine"
  | "plannerModel"
  | "coderModel"
  | "verifierModel"
>;

/**
 * Only what Builder will actually run — the same list as the AI models tab's,
 * and it has to stay the same list. ally-be holds an engine ALLOWLIST
 * (`builderAllowedEngines`) and overrules anything off it wherever the value
 * came from, including this row, so offering `claude-code` here would be a
 * control that appears to work and silently does not.
 *
 * This picker was missed when the models tab's was corrected, which is worse
 * than it sounds: a `<select>` whose value is absent from its options renders
 * as the first one, so with prod on `opencode` this page read "Claude Code" —
 * a settings screen stating the opposite of what is stored.
 *
 * Putting Claude back is one environment variable on ally-be plus an entry
 * here, in that order — the list is what decides, this is only what offers.
 */
const BUILDER_ENGINE_OPTIONS = [
  { value: "gemini", text: "Gemini CLI" },
  { value: "opencode", text: "opencode (multi-provider harness)" },
];

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
  const { data: models = [] } = useGetLlmModelsQuery();

  const [draft, setDraft] = useState<SettingsDraft | null>(null);

  useEffect(() => {
    if (data) {
      setDraft({
        enabled: data.enabled,
        autoReviewEnabled: data.autoReviewEnabled,
        autoApproveEnabled: data.autoApproveEnabled,
        autoReleaseEnabled: data.autoReleaseEnabled,
        autoFixEnabled: data.autoFixEnabled,
        maxFixRunsPerPr: data.maxFixRunsPerPr,
        maxConcurrentBuilds: data.maxConcurrentBuilds,
        defaultBudgetUsd: data.defaultBudgetUsd,
        defaultEngine: data.defaultEngine,
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
        autoReviewEnabled: draft.autoReviewEnabled,
        autoApproveEnabled: draft.autoApproveEnabled,
        autoReleaseEnabled: draft.autoReleaseEnabled,
        autoFixEnabled: draft.autoFixEnabled,
        maxFixRunsPerPr: draft.maxFixRunsPerPr,
        maxConcurrentBuilds: draft.maxConcurrentBuilds,
        ...(draft.defaultBudgetUsd !== null
          ? { defaultBudgetUsd: Number(draft.defaultBudgetUsd) }
          : {}),
        defaultEngine: draft.defaultEngine ?? "",
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

          {/* Ordered by how much they let go of, not by when they were built:
              review only reads, approve vouches for the result, fix writes to
              a branch someone may be reading. Each is independent, so the
              middle setting — findings land, nothing pushes — is reachable. */}
          <section className="rounded-md border border-border-light p-4">
            <CarbonToggle
              id="builder-settings-auto-review"
              labelText={strings.autoReviewLabel}
              size="sm"
              toggled={draft.autoReviewEnabled}
              onToggle={(checked: boolean) => set("autoReviewEnabled", checked)}
            />
            <p className="pt-1 text-xs text-typography-500">{strings.autoReviewHelp}</p>
            {draft.autoReviewEnabled && (
              <div className="mt-3 border-t border-border-light pt-3">
                <CarbonToggle
                  id="builder-settings-auto-approve"
                  labelText={strings.autoApproveLabel}
                  size="sm"
                  toggled={draft.autoApproveEnabled}
                  onToggle={(checked: boolean) => set("autoApproveEnabled", checked)}
                />
                <p className="pt-1 text-xs text-typography-500">{strings.autoApproveHelp}</p>

                {/* Nested one level deeper again. Releasing something nobody
                    approved is not a setting anyone should be able to reach by
                    accident, and the ladder — read, vouch, ship — is the whole
                    shape of how much each switch lets go of. */}
                {draft.autoApproveEnabled && (
                  <div className="mt-3 border-t border-border-light pt-3">
                    <CarbonToggle
                      id="builder-settings-auto-release"
                      labelText={strings.autoReleaseLabel}
                      size="sm"
                      toggled={draft.autoReleaseEnabled}
                      onToggle={(checked: boolean) => set("autoReleaseEnabled", checked)}
                    />
                    <p className="pt-1 text-xs text-typography-500">{strings.autoReleaseHelp}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Next to the kill switch, not under the thresholds. This decides
              whether an agent may push commits to a pull request a person is
              in the middle of reviewing — which makes it the second most
              consequential control here, and it had no control at all until
              now: the field existed, the API accepted it, and the only way to
              change it was a hand-written PATCH. */}
          <section className="rounded-md border border-border-light p-4">
            <CarbonToggle
              id="builder-settings-auto-fix"
              labelText={strings.autoFixLabel}
              size="sm"
              toggled={draft.autoFixEnabled}
              onToggle={(checked: boolean) => set("autoFixEnabled", checked)}
            />
            <p className="pt-1 text-xs text-typography-500">{strings.autoFixHelp}</p>
            {draft.autoFixEnabled && (
              <div className="pt-3">
                <Field label={strings.maxFixRunsPerPrLabel} hint={strings.maxFixRunsPerPrHelp}>
                  <NumberInput
                    id="builder-settings-max-fix-runs"
                    label={strings.maxFixRunsPerPrLabel}
                    hideLabel
                    hideSteppers
                    min={0}
                    max={10}
                    value={draft.maxFixRunsPerPr}
                    onChange={(_event: unknown, state: { value: number | string } | undefined) => {
                      const next = Number(state?.value);
                      if (!Number.isNaN(next)) set("maxFixRunsPerPr", next);
                    }}
                  />
                </Field>
              </div>
            )}
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
            <Field label={strings.engineLabel} hint={strings.engineHelp}>
              <Select
                id="builder-settings-engine"
                labelText={strings.engineLabel}
                hideLabel
                value={draft.defaultEngine ?? BUILDER_ENGINE_OPTIONS[0].value}
                onChange={event => set("defaultEngine", event.target.value)}
              >
                {BUILDER_ENGINE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Field>
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
              {/* Picked from the catalog rather than typed. A tier is a model
                  id the runner passes straight to the CLI, so a typo used to
                  reach production and fail at dispatch — ally-be's preflight
                  now rejects an unknown model, but refusing a build is a worse
                  answer than not offering the mistake. Empty means the platform
                  default, which is why every list carries a blank first row. */}
              {(
                [
                  ["plannerModel", "builder-settings-planner-model", strings.plannerModelLabel],
                  ["coderModel", "builder-settings-coder-model", strings.coderModelLabel],
                  ["verifierModel", "builder-settings-verifier-model", strings.verifierModelLabel],
                ] as const
              ).map(([field, id, label]) => (
                <Select
                  key={field}
                  id={id}
                  labelText={label}
                  value={draft[field] ?? ""}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    set(field, event.target.value || null)
                  }
                >
                  <SelectItem value="" text={strings.modelPlaceholder} />
                  {/* A tier already pointing at something the catalog no longer
                      offers keeps its own row, so opening this page cannot
                      silently reset a deliberate choice. */}
                  {draft[field] && !models.some(model => model.model === draft[field]) ? (
                    <SelectItem value={draft[field] as string} text={draft[field] as string} />
                  ) : null}
                  {models.map(model => (
                    <SelectItem
                      key={model.model}
                      value={model.model}
                      text={model.label ? `${model.label} (${model.model})` : model.model}
                    />
                  ))}
                </Select>
              ))}
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
