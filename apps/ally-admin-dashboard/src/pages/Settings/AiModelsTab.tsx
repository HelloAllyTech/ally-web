import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  Button,
  InlineNotification,
  Select,
  SelectItem,
  SkeletonText,
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

/**
 * The Claude Code models Bug Hunter's pipeline runs on, and Builder's when
 * its engine is claude-code. Not the full platform model catalog (that
 * includes OpenAI entries neither pipeline can use — there's no autonomous
 * coding-agent CLI for OpenAI's models wired in here). Ordered cheap to
 * expensive so the trade-off reads directly from the list.
 */
const CLAUDE_CODE_MODEL_OPTIONS = [
  { value: "claude-haiku-4-5", text: "claude-haiku-4-5 (fastest, cheapest)" },
  { value: "claude-sonnet-5", text: "claude-sonnet-5 (balanced — current default)" },
  { value: "claude-opus-5", text: "claude-opus-5 (strongest, most expensive)" },
];

/**
 * Builder's default engine, proven end to end: a full unattended run on
 * 2026-09-23 planned, coded, caught its own missed requirement, remediated,
 * reviewed and merged ally-web#694.
 */
const GEMINI_MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", text: "gemini-2.5-flash (fastest, cheapest)" },
  { value: "gemini-2.5-pro", text: "gemini-2.5-pro (strongest)" },
];

/**
 * Only what Builder will actually run.
 *
 * ally-be holds an engine ALLOWLIST (`builderAllowedEngines`) and overrules
 * anything off it wherever the value came from — the run override, the
 * session, or this very row. `claude-code` is off that list, deliberately, so
 * offering it here would be a control that appears to work and silently does
 * not: pick it, save it, and every build still runs on Gemini. A picker whose
 * choice is quietly ignored is the exact failure this platform has spent a
 * week removing, so the option is gone rather than disabled with an asterisk.
 *
 * Putting Claude back is one environment variable on ally-be plus an entry
 * here, in that order — the list is what decides, this is only what offers.
 */
const BUILDER_ENGINE_OPTIONS = [{ value: "opencode", text: "opencode (multi-provider harness)" }];

/**
 * Gemini CLI has no equivalent to the Task-tool subagent dispatch
 * `.claude/agents/bug-escalation.md` relies on, so a gemini-engine sweep/fix
 * session skips escalation entirely rather than pretending to honor it — see
 * bug-hunt-sweep.yml's/bug-fix-session.yml's engine-resolution step.
 */
const BUG_HUNTER_ENGINE_OPTIONS = [
  { value: "claude-code", text: "Claude Code" },
  { value: "gemini", text: "Gemini CLI (skips escalation)" },
];

/**
 * opencode is a harness rather than a vendor: it runs whichever provider it
 * holds a key for, and Builder points it at Gemini models by default.
 *
 * ally-be no longer filters models by engine at all — the filter existed for
 * engines that ran one vendor each, and they are gone. run-engine.sh derives
 * the provider from the model id, so naming a model is how a vendor is chosen.
 * Bug Hunter keeps its own engines and its own picker above; it is a separate
 * harness with a separate lifecycle.
 */
const modelOptionsForEngine = (engine: string) =>
  engine === "claude-code" ? CLAUDE_CODE_MODEL_OPTIONS : GEMINI_MODEL_OPTIONS;

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

/** Builder's own engine + three tiers, trimmed to just the fields this tab edits. */
type BuilderModelDraft = {
  defaultEngine: string | null;
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

  const engine = draft?.engine ?? "claude-code";

  const handleEngineChange = (nextEngine: string) =>
    setDraft(current =>
      current
        ? {
            ...current,
            engine: nextEngine,
            // A Claude model id left behind under Gemini (or the reverse)
            // would be silently meaningless rather than caught early — same
            // reasoning as Builder's engine switch below.
            defaultModel: modelOptionsForEngine(nextEngine)[0].value,
          }
        : current,
    );

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
          <div className="mt-3">
            <Field label={strings.bugHunterEngineLabel} hint={strings.bugHunterEngineHelp}>
              <Select
                id="settings-ai-models-bug-hunter-engine"
                labelText={strings.bugHunterEngineLabel}
                hideLabel
                value={engine}
                onChange={event => handleEngineChange(event.target.value)}
              >
                {BUG_HUNTER_ENGINE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={strings.defaultModelLabel} hint={strings.defaultModelHelp}>
              <Select
                id="settings-ai-models-bug-hunter-default-model"
                labelText={strings.defaultModelLabel}
                hideLabel
                value={draft.defaultModel}
                onChange={event => set("defaultModel", event.target.value)}
              >
                {modelOptionsForEngine(engine).map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Field>
            {engine === "gemini" ? (
              <Field
                label={strings.escalationModelLabel}
                hint={strings.escalationModelDisabledHelp}
              >
                <Select
                  id="settings-ai-models-bug-hunter-escalation-model"
                  labelText={strings.escalationModelLabel}
                  hideLabel
                  disabled
                  value=""
                >
                  <SelectItem value="" text={strings.escalationModelDisabledOption} />
                </Select>
              </Field>
            ) : (
              <Field label={strings.escalationModelLabel} hint={strings.escalationModelHelp}>
                <Select
                  id="settings-ai-models-bug-hunter-escalation-model"
                  labelText={strings.escalationModelLabel}
                  hideLabel
                  value={draft.escalationModel}
                  onChange={event => set("escalationModel", event.target.value)}
                >
                  {CLAUDE_CODE_MODEL_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} text={option.text} />
                  ))}
                </Select>
              </Field>
            )}
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
        defaultEngine: data.defaultEngine,
        plannerModel: data.plannerModel,
        coderModel: data.coderModel,
        verifierModel: data.verifierModel,
      });
    }
  }, [data]);

  const set = (key: keyof BuilderModelDraft, value: string | null) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const engine = draft?.defaultEngine ?? "claude-code";

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings({
        defaultEngine: draft.defaultEngine ?? "",
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
          <div className="mt-3">
            <Field label={strings.builderEngineLabel} hint={strings.builderEngineHelp}>
              <Select
                id="settings-ai-models-builder-engine"
                labelText={strings.builderEngineLabel}
                hideLabel
                value={engine}
                onChange={event =>
                  // Switching engine clears the per-tier models too — a
                  // Claude model id left behind under Gemini (or the reverse)
                  // would be silently meaningless rather than caught early.
                  setDraft(current =>
                    current
                      ? {
                          ...current,
                          defaultEngine: event.target.value,
                          plannerModel: null,
                          coderModel: null,
                          verifierModel: null,
                        }
                      : current,
                  )
                }
              >
                {BUILDER_ENGINE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value} text={option.text} />
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              id="settings-ai-models-builder-planner-model"
              labelText={builderStrings.plannerModelLabel}
              value={draft.plannerModel ?? ""}
              onChange={event => set("plannerModel", event.target.value || null)}
            >
              <SelectItem value="" text={builderStrings.modelPlaceholder} />
              {modelOptionsForEngine(engine).map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
            <Select
              id="settings-ai-models-builder-coder-model"
              labelText={builderStrings.coderModelLabel}
              value={draft.coderModel ?? ""}
              onChange={event => set("coderModel", event.target.value || null)}
            >
              <SelectItem value="" text={builderStrings.modelPlaceholder} />
              {modelOptionsForEngine(engine).map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
            <Select
              id="settings-ai-models-builder-verifier-model"
              labelText={builderStrings.verifierModelLabel}
              value={draft.verifierModel ?? ""}
              onChange={event => set("verifierModel", event.target.value || null)}
            >
              <SelectItem value="" text={builderStrings.modelPlaceholder} />
              {modelOptionsForEngine(engine).map(option => (
                <SelectItem key={option.value} value={option.value} text={option.text} />
              ))}
            </Select>
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
