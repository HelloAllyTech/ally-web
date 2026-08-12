import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import {
  AutoExpandableTextarea,
  InlineNotification,
  NumberInput,
  TextInput,
  CarbonToggle,
  SkeletonText,
} from "@ally-ui-mono/ui-shared";
import {
  useGetWaProviderHealthQuery,
  useGetWaSettingsQuery,
  useUpdateWaSettingsMutation,
} from "@api";
import { Button } from "@components";
import { TooltipHint } from "@components/app-tooltip";
import { ButtonVariant } from "@components/types";
import { en, TooltipLocation } from "@constants";
import { WaBotSettings } from "@types";

/**
 * Bot settings.
 *
 * Everything here is read per message by ally-be, so a save takes effect on the next inbound
 * message — the retrieval thresholds in particular are what make tuning possible without a deploy.
 *
 * Two deliberate omissions:
 *  - Provider credentials are shown as present/absent only. They live in the environment, and
 *    returning a secret to prove it is set would put it in the browser and in any screenshot.
 *  - The prompt and answering model are NOT edited here. They belong to the existing Manage Prompts
 *    surface (prompt codes starting `ally_ai_knowledge`), which already handles versioning and the
 *    per-prompt model/temperature. A second prompt editor scoped to two codes would duplicate a
 *    thousand-line panel and give two places to change the same thing.
 */
export const BotSettingsTab: React.FC = () => {
  const { data, isLoading, isError } = useGetWaSettingsQuery();
  const { data: health } = useGetWaProviderHealthQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateWaSettingsMutation();

  const [draft, setDraft] = useState<WaBotSettings | null>(null);

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  const set = <K extends keyof WaBotSettings>(key: K, value: WaBotSettings[K]) =>
    setDraft(current => (current ? { ...current, [key]: value } : current));

  const setRetrieval = <K extends keyof WaBotSettings["retrieval"]>(
    key: K,
    value: WaBotSettings["retrieval"][K],
  ) =>
    setDraft(current =>
      current ? { ...current, retrieval: { ...current.retrieval, [key]: value } } : current,
    );

  const setRateLimit = <K extends keyof WaBotSettings["rateLimit"]>(
    key: K,
    value: WaBotSettings["rateLimit"][K],
  ) =>
    setDraft(current =>
      current ? { ...current, rateLimit: { ...current.rateLimit, [key]: value } } : current,
    );

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updateSettings(draft).unwrap();
      toast.success(en.whatsappBot.settings.saved);
    } catch {
      toast.error(en.whatsappBot.settings.saveFailed);
    }
  };

  if (isError) {
    return (
      <div className="pt-4">
        <InlineNotification
          kind="error"
          title={en.whatsappBot.settings.saveFailed}
          lowContrast
          hideCloseButton
        />
      </div>
    );
  }

  if (isLoading || !draft) {
    return (
      <div className="pt-6">
        <SkeletonText paragraph lineCount={10} />
      </div>
    );
  }

  return (
    <div className="pt-4 flex flex-col gap-8 max-w-3xl">
      <p className="text-sm text-typography-600">{en.whatsappBot.settings.subtitle}</p>

      {/* The kill switch sits first and alone: it is the one control someone reaches for in an
          incident, and it should not be buried under thresholds. */}
      <section className="border border-border-light rounded-md p-4">
        <CarbonToggle
          id="wa-enabled"
          labelText={en.whatsappBot.settings.enabledLabel}
          size="sm"
          toggled={draft.enabled}
          onToggle={(checked: boolean) => set("enabled", checked)}
        />
        <p className="text-xs text-typography-500 pt-1">{en.whatsappBot.settings.enabledHelp}</p>

        {/* Sits with the kill switch rather than among the retrieval thresholds: both are safety
            controls, and burying this one next to topK would frame it as a tuning knob. */}
        <div className="pt-4 border-t border-border-light mt-4">
          <CarbonToggle
            id="wa-crisis-classifier"
            labelText={en.whatsappBot.settings.crisisClassifier}
            size="sm"
            toggled={draft.crisisClassifierEnabled}
            onToggle={(checked: boolean) => set("crisisClassifierEnabled", checked)}
          />
          <p className="flex items-center gap-1 text-xs text-typography-500 pt-1">
            {en.whatsappBot.settings.crisisClassifierHelp}
            <TooltipHint location={TooltipLocation.WA_CRISIS_CLASSIFIER} />
          </p>
          {!draft.crisisClassifierEnabled && (
            <div className="pt-2">
              <InlineNotification
                kind="warning"
                title={en.whatsappBot.settings.crisisClassifierOffWarning}
                lowContrast
                hideCloseButton
              />
            </div>
          )}
        </div>
      </section>

      <Section title={en.whatsappBot.settings.providerSection}>
        <p className="text-xs text-typography-500 pb-2">{en.whatsappBot.settings.providerHelp}</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <HealthRow
            label={en.whatsappBot.settings.verifyToken}
            ok={health?.verifyTokenConfigured}
          />
          <HealthRow label={en.whatsappBot.settings.appSecret} ok={health?.appSecretConfigured} />
          <HealthRow
            label={en.whatsappBot.settings.phoneNumberId}
            ok={health?.phoneNumberIdConfigured}
          />
          <HealthRow
            label={en.whatsappBot.settings.accessToken}
            ok={health?.accessTokenConfigured}
          />
          <HealthRow
            label={en.whatsappBot.settings.inboundQueue}
            ok={health?.inboundQueueConfigured}
          />
        </div>
      </Section>

      <Section title={en.whatsappBot.settings.messagesSection}>
        <TextArea
          label={en.whatsappBot.settings.disclaimerLabel}
          help={en.whatsappBot.settings.disclaimerHelp}
          value={draft.disclaimerText}
          onChange={value => set("disclaimerText", value)}
        />
        <TextArea
          label={en.whatsappBot.settings.crisisLabel}
          value={draft.crisisEscalationText}
          onChange={value => set("crisisEscalationText", value)}
        />
        <TextArea
          label={en.whatsappBot.settings.declineLabel}
          value={draft.declineText}
          onChange={value => set("declineText", value)}
        />
        <TextArea
          label={en.whatsappBot.settings.fallbackLabel}
          value={draft.fallbackText}
          onChange={value => set("fallbackText", value)}
        />
        <TextArea
          label={en.whatsappBot.settings.unsupportedMediaLabel}
          value={draft.unsupportedMediaText}
          onChange={value => set("unsupportedMediaText", value)}
        />
        <TextArea
          label={en.whatsappBot.settings.rateLimitLabel}
          value={draft.rateLimitText}
          onChange={value => set("rateLimitText", value)}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm text-typography-900">
            {en.whatsappBot.settings.helplineNumbersLabel}
          </label>
          <TextInput
            id="wa-helpline"
            labelText=""
            hideLabel
            value={draft.helplineNumbers}
            onChange={event => set("helplineNumbers", event.target.value)}
          />
          <span className="text-xs text-typography-400">
            {en.whatsappBot.settings.helplineNumbersHelp}
          </span>
        </div>
      </Section>

      <Section title={en.whatsappBot.settings.limitsSection}>
        <p className="text-xs text-typography-500">{en.whatsappBot.settings.limitsHelp}</p>
        <div className="grid grid-cols-3 gap-4">
          <Num
            label={en.whatsappBot.settings.perMinute}
            value={draft.rateLimit.perMinute}
            min={0}
            onChange={value => setRateLimit("perMinute", value)}
          />
          <Num
            label={en.whatsappBot.settings.perHour}
            value={draft.rateLimit.perHour}
            min={0}
            onChange={value => setRateLimit("perHour", value)}
          />
          <Num
            label={en.whatsappBot.settings.perDay}
            value={draft.rateLimit.perDay}
            min={0}
            onChange={value => setRateLimit("perDay", value)}
          />
        </div>
      </Section>

      <Section title={en.whatsappBot.settings.retrievalSection}>
        <div className="grid grid-cols-2 gap-4">
          <Num
            label={en.whatsappBot.settings.topK}
            value={draft.retrieval.topK}
            min={1}
            max={50}
            onChange={value => setRetrieval("topK", value)}
          />
          <Num
            label={en.whatsappBot.settings.maxPassages}
            value={draft.retrieval.maxPassages}
            min={1}
            max={20}
            onChange={value => setRetrieval("maxPassages", value)}
          />
          <Num
            label={en.whatsappBot.settings.minSimilarity}
            help={en.whatsappBot.settings.minSimilarityHelp}
            tooltipLocation={TooltipLocation.WA_MIN_SIMILARITY}
            value={draft.retrieval.minSimilarity}
            min={0}
            max={1}
            step={0.01}
            onChange={value => setRetrieval("minSimilarity", value)}
          />
          <Num
            label={en.whatsappBot.settings.declineSimilarity}
            help={en.whatsappBot.settings.declineSimilarityHelp}
            tooltipLocation={TooltipLocation.WA_DECLINE_SIMILARITY}
            value={draft.retrieval.declineSimilarity}
            min={0}
            max={1}
            step={0.01}
            onChange={value => setRetrieval("declineSimilarity", value)}
          />
        </div>

        {/* A floor above the decision threshold means retrieval never returns anything the gate
            would accept, so the bot declines everything. Warned about rather than silently clamped,
            because clamping would hide a misconfiguration the admin needs to understand. */}
        {draft.retrieval.minSimilarity > draft.retrieval.declineSimilarity && (
          <InlineNotification
            kind="warning"
            title="The retrieval floor is above the answer threshold, so the bot will decline every question."
            lowContrast
            hideCloseButton
          />
        )}

        <div className="pt-2">
          <CarbonToggle
            id="wa-translate"
            labelText={en.whatsappBot.settings.translateQuery}
            size="sm"
            toggled={draft.retrieval.translateQuery}
            onToggle={(checked: boolean) => setRetrieval("translateQuery", checked)}
          />
          <p className="text-xs text-typography-500 pt-1">
            {en.whatsappBot.settings.translateQueryHelp}
          </p>
        </div>
      </Section>

      <Section title={en.whatsappBot.settings.replySection}>
        <div className="grid grid-cols-3 gap-4">
          <Num
            label={en.whatsappBot.settings.maxAnswerChars}
            value={draft.maxAnswerChars}
            min={100}
            onChange={value => set("maxAnswerChars", value)}
          />
          <Num
            label={en.whatsappBot.settings.maxReplyChars}
            help={en.whatsappBot.settings.maxReplyCharsHelp}
            value={draft.maxReplyChars}
            min={100}
            max={4096}
            onChange={value => set("maxReplyChars", value)}
          />
          <Num
            label={en.whatsappBot.settings.maxCitations}
            value={draft.maxCitations}
            min={0}
            max={10}
            onChange={value => set("maxCitations", value)}
          />
        </div>
        <Num
          label={en.whatsappBot.settings.conversationIdle}
          help={en.whatsappBot.settings.conversationIdleHelp}
          tooltipLocation={TooltipLocation.WA_CONVERSATION_IDLE}
          value={draft.conversationIdleMinutes}
          min={5}
          onChange={value => set("conversationIdleMinutes", value)}
        />
        <Num
          label={en.whatsappBot.settings.retentionDays}
          help={en.whatsappBot.settings.retentionDaysHelp}
          tooltipLocation={TooltipLocation.WA_RETENTION_DAYS}
          value={draft.retentionDays}
          min={0}
          onChange={value => set("retentionDays", value)}
        />
        {/* Warned about explicitly rather than left to the reader to infer from a 0. Indefinite
            retention of workers' clinical questions against their phone numbers is a decision, and it
            should look like one on the screen where it is made. */}
        {draft.retentionDays === 0 && (
          <InlineNotification
            kind="warning"
            title={en.whatsappBot.settings.retentionOffWarning}
            lowContrast
            hideCloseButton
          />
        )}
      </Section>

      <InlineNotification
        kind="info"
        title={en.whatsappBot.settings.promptsNote}
        lowContrast
        hideCloseButton
      />

      <div>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => void handleSave()}
          disabled={isSaving}
        >
          {en.whatsappBot.settings.save}
        </Button>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="flex flex-col gap-3">
    <h3 className="text-base text-typography-900 font-secondary">{title}</h3>
    {children}
  </section>
);

const HealthRow: React.FC<{ label: string; ok?: boolean }> = ({ label, ok }) => (
  <div className="flex justify-between border-b border-border-light py-1">
    <span className="text-typography-600">{label}</span>
    <span className={ok ? "text-green-700" : "text-destructive-600"}>
      {ok ? en.whatsappBot.settings.providerHealthy : en.whatsappBot.settings.providerMissing}
    </span>
  </div>
);

const TextArea: React.FC<{
  label: string;
  help?: string;
  value: string;
  onChange: (value: string) => void;
  /** See {@link Num} — data-driven, and silent until a superadmin enables it. */
  tooltipLocation?: string;
}> = ({ label, help, value, onChange, tooltipLocation }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-typography-900">{label}</label>
    <AutoExpandableTextarea value={value} onChange={onChange} minHeight={70} />
    {(help || tooltipLocation) && (
      <span className="flex items-center gap-1 text-xs text-typography-400">
        {help}
        <TooltipHint location={tooltipLocation} />
      </span>
    )}
  </div>
);

const Num: React.FC<{
  label: string;
  help?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  /**
   * Data-driven tooltip slug. Renders nothing until a superadmin authors the text and enables it
   * under Manage Tooltips — so a field carries no explanation rather than a developer's guess at one.
   */
  tooltipLocation?: string;
}> = ({ label, help, value, min, max, step, onChange, tooltipLocation }) => (
  <div className="flex flex-col gap-1">
    <NumberInput
      id={`wa-${label.replace(/\s+/g, "-").toLowerCase()}`}
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      hideSteppers
      onChange={(_event: unknown, state: { value: number | string } | undefined) => {
        const next = Number(state?.value);
        if (!Number.isNaN(next)) onChange(next);
      }}
    />
    {(help || tooltipLocation) && (
      <span className="flex items-center gap-1 text-xs text-typography-400">
        {help}
        <TooltipHint location={tooltipLocation} />
      </span>
    )}
  </div>
);
