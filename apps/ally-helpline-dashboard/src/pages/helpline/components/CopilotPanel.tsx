import { FC, ReactNode, useState } from "react";

import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HELPLINE_STAGES } from "@constants/helpline";
import type {
  AckRiskFlagBody,
  ChatDetailDto,
  CopilotSuggestion,
  ListenerSettingsDto,
  NudgeMetadata,
  RiskFlagDto,
  StaffMessageDto,
  SuggestionMetadata,
  SummaryDto,
} from "@types";

import { HelpTip, WithTooltip } from "./HelpTip";
import { RiskBanner, RiskNotedChip } from "./RiskBanner";
import { latestMessageOfType, openRiskFlags, skillLabelKey } from "../utils";

type Rating = "UP" | "DOWN";

interface CopilotPanelProps {
  detail: ChatDetailDto;
  settings: ListenerSettingsDto;
  canUseCopilot: boolean;
  canAcknowledge: boolean;
  canEditSummary: boolean;
  onUseSuggestion: (suggestion: CopilotSuggestion, messageId: number) => void;
  onAcknowledge: (flag: RiskFlagDto, body: AckRiskFlagBody) => Promise<boolean>;
  onFeedback: (messageId: number, index: number | undefined, rating: Rating) => Promise<boolean>;
  onEditFinalSummary: () => void;
  /** The listener of record's Alert a supervisor control, shown in each risk banner. */
  alertSupervisor?: ReactNode;
}

const Card: FC<{
  title: string;
  children: React.ReactNode;
  testId?: string;
  aside?: React.ReactNode;
}> = ({ title, children, testId, aside }) => (
  <section className="rounded-xl border border-border-light bg-white p-3" data-testid={testId}>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="font-primary text-sm font-semibold text-typography-900">{title}</h3>
      {aside}
    </div>
    {children}
  </section>
);

const Thumbs: FC<{
  value: Rating | undefined;
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}> = ({ value, onRate, disabled }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t("helplineWorkspace.copilot.helpful")}
        aria-pressed={value === "UP"}
        disabled={disabled}
        onClick={() => onRate("UP")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          value === "UP" ? "text-primary-600" : "text-typography-600"
        }`}
      >
        <ThumbsUp
          aria-hidden="true"
          className="h-4 w-4"
          fill={value === "UP" ? "currentColor" : "none"}
        />
      </button>
      <button
        type="button"
        aria-label={t("helplineWorkspace.copilot.notHelpful")}
        aria-pressed={value === "DOWN"}
        disabled={disabled}
        onClick={() => onRate("DOWN")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          value === "DOWN" ? "text-primary-600" : "text-typography-600"
        }`}
      >
        <ThumbsDown
          aria-hidden="true"
          className="h-4 w-4"
          fill={value === "DOWN" ? "currentColor" : "none"}
        />
      </button>
    </div>
  );
};

const SummaryFields: FC<{ summary: SummaryDto; settings: ListenerSettingsDto }> = ({
  summary,
  settings,
}) => {
  const labelled = settings.summaryFields.filter(field => summary.fields[field.key]?.trim());
  const extra = Object.keys(summary.fields).filter(
    key => summary.fields[key]?.trim() && !settings.summaryFields.some(field => field.key === key),
  );
  return (
    <dl className="flex flex-col gap-2 font-primary text-sm">
      {labelled.map(field => (
        <div key={field.key}>
          <dt className="text-xs font-medium text-typography-700">{field.label}</dt>
          <dd className="whitespace-pre-wrap break-words text-typography-900">
            {summary.fields[field.key]}
          </dd>
        </div>
      ))}
      {extra.map(key => (
        <div key={key}>
          <dt className="text-xs font-medium text-typography-700">{key}</dt>
          <dd className="whitespace-pre-wrap break-words text-typography-900">
            {summary.fields[key]}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/**
 * Staff-only assistance beside the transcript. Everything here was written by
 * a model or a supervisor and none of it reaches the talker: suggestions are
 * inserted into the composer for the listener to edit, never sent.
 */
export const CopilotPanel: FC<CopilotPanelProps> = ({
  detail,
  settings,
  canUseCopilot,
  canAcknowledge,
  canEditSummary,
  onUseSuggestion,
  onAcknowledge,
  onFeedback,
  onEditFinalSummary,
  alertSupervisor,
}) => {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const { chat, messages, riskFlags, summaries, copilot } = detail;
  const isEnded = chat.status === "ENDED";
  const open = openRiskFlags(riskFlags);
  const acknowledged = riskFlags.filter(
    flag => flag.acknowledgedAt || flag.outcome !== "UNREVIEWED",
  );
  const talkerHasWritten = messages.some(
    message => message.type === "TEXT" && message.senderRole === "TALKER",
  );
  const suggestionMessage = latestMessageOfType(messages, "SUGGESTION");
  const suggestionMeta = suggestionMessage?.metadata as unknown as SuggestionMetadata | null;
  const nudgeMessage = latestMessageOfType(messages, "NUDGE");
  const whispers = messages.filter(message => message.type === "WHISPER");
  const stage =
    copilot.stage && (HELPLINE_STAGES as readonly string[]).includes(copilot.stage)
      ? copilot.stage
      : null;

  const rate = async (message: StaffMessageDto, index: number | undefined, rating: Rating) => {
    const key = `${message.id}:${index ?? "nudge"}`;
    const previous = ratings[key];
    setRatings(current => ({ ...current, [key]: rating }));
    const ok = await onFeedback(message.id, index, rating);
    if (!ok) setRatings(current => ({ ...current, [key]: previous }));
  };

  const ratingFor = (message: StaffMessageDto, index?: number): Rating | undefined => {
    const local = ratings[`${message.id}:${index ?? "nudge"}`];
    if (local) return local;
    if (index === undefined) return (message.metadata as unknown as NudgeMetadata | null)?.feedback;
    return (message.metadata as unknown as SuggestionMetadata | null)?.feedback?.[index];
  };

  // Every copilot feature is switched on for this org, yet the server says
  // OFF/UNAVAILABLE: that's an outage (an early backend reported OFF for it),
  // not the org's choice — so never tell the listener their org turned it off.
  const allFeaturesOn =
    settings.copilot.suggestions && settings.copilot.nudges && settings.copilot.riskClassifier;
  const statusDot =
    copilot.status === "OK"
      ? null
      : allFeaturesOn
        ? t("helplineWorkspace.copilot.unavailableNow")
        : copilot.status === "UNAVAILABLE"
          ? t("helplineWorkspace.copilot.unavailable")
          : t("helplineWorkspace.copilot.off");
  const showUnavailableHint =
    copilot.status === "UNAVAILABLE" || (copilot.status === "OFF" && allFeaturesOn);

  return (
    <div className="ph-no-capture flex flex-col gap-3 p-3" data-testid="copilot-panel">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 font-primary text-base font-semibold text-typography-900">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-ai-600" />
          {t("helplineWorkspace.copilot.title")}
          <HelpTip
            label={t("helplineWorkspace.copilot.about")}
            ariaLabel={t("helplineWorkspace.copilot.title")}
          />
        </h2>
        {statusDot && (
          <span
            role="status"
            title={showUnavailableHint ? t("helplineWorkspace.copilot.unavailableHint") : undefined}
            className="inline-flex items-center gap-1.5 rounded-full bg-status-ochreBg px-2 py-0.5 font-primary text-xs text-status-ochreFg"
            data-testid="copilot-status"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-status-ochreDot" />
            {statusDot}
          </span>
        )}
      </div>

      {/* Risk first, and never behind a copilot switch: keyword screening runs regardless. */}
      {open.map(flag => (
        <RiskBanner
          key={flag.id}
          flag={flag}
          checklist={settings.escalationChecklist}
          canAcknowledge={canAcknowledge && !isEnded}
          onAcknowledge={body => onAcknowledge(flag, body)}
          alertSupervisor={isEnded ? undefined : alertSupervisor}
          supportContact={settings.listenerSupportContact}
        />
      ))}
      {acknowledged.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {acknowledged.map(flag => (
            <RiskNotedChip key={flag.id} flag={flag} />
          ))}
        </div>
      )}

      {isEnded ? (
        <Card
          title={t("helplineWorkspace.copilot.finalSummaryTitle")}
          testId="final-summary"
          aside={
            canEditSummary && (
              <button
                type="button"
                onClick={onEditFinalSummary}
                className="rounded-full border border-border-medium px-3 py-1 font-primary text-xs text-typography-900 hover:bg-background-secondary"
              >
                {t("helplineWorkspace.copilot.editSummary")}
              </button>
            )
          }
        >
          {summaries.final && Object.values(summaries.final.fields).some(value => value?.trim()) ? (
            <>
              <SummaryFields summary={summaries.final} settings={settings} />
              {summaries.final.editedByName && (
                <p className="mt-2 font-primary text-xs text-typography-700">
                  {t("helplineWorkspace.copilot.editedBy", { name: summaries.final.editedByName })}
                </p>
              )}
            </>
          ) : (
            <p className="font-primary text-sm text-typography-700">
              {t("helplineWorkspace.copilot.finalSummaryEmpty")}
            </p>
          )}
        </Card>
      ) : !canUseCopilot ? null : (
        <>
          {showUnavailableHint && (
            <p className="rounded-lg bg-background-secondary p-2 font-primary text-xs text-typography-800">
              {t("helplineWorkspace.copilot.unavailableHint")}
            </p>
          )}

          {settings.copilot.suggestions && (
            <Card
              title={t("helplineWorkspace.copilot.suggestionsTitle")}
              testId="copilot-suggestions"
            >
              {!talkerHasWritten ? (
                <p className="font-primary text-sm text-typography-700">
                  {t("helplineWorkspace.copilot.beforeFirst")}
                </p>
              ) : !suggestionMessage || !suggestionMeta?.suggestions?.length ? (
                <p className="font-primary text-sm text-typography-700">
                  {t("helplineWorkspace.copilot.noSuggestions")}
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {suggestionMeta.suggestions.map(suggestion => {
                    const labelKey = skillLabelKey(suggestion.skillKey);
                    return (
                      <li
                        key={suggestion.index}
                        className="rounded-lg border border-ai-200 bg-ai-50 p-2"
                        data-testid={`suggestion-${suggestion.index}`}
                      >
                        {labelKey && (
                          <span className="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 font-primary text-xs text-ai-800">
                            {t(labelKey)}
                          </span>
                        )}
                        <p className="whitespace-pre-wrap break-words font-primary text-sm text-typography-900">
                          {suggestion.text}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          {/* Named "Use this suggestion" (visible text stays "Use"); what it does
                              is its description, so a screen reader says the name first. */}
                          <WithTooltip label={t("helplineWorkspace.copilot.useHint")}>
                            <button
                              type="button"
                              aria-label={t("helplineWorkspace.copilot.useLabel")}
                              onClick={() => onUseSuggestion(suggestion, suggestionMessage.id)}
                              className="min-h-[32px] rounded-full bg-white px-3 font-primary text-xs font-medium text-typography-900 shadow-sm hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                              {t("helplineWorkspace.copilot.use")}
                            </button>
                          </WithTooltip>
                          <Thumbs
                            value={ratingFor(suggestionMessage, suggestion.index)}
                            onRate={rating =>
                              void rate(suggestionMessage, suggestion.index, rating)
                            }
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {settings.copilot.nudges && (nudgeMessage || stage) && (
            <Card
              title={t("helplineWorkspace.copilot.nudgeTitle")}
              testId="copilot-nudge"
              aside={
                stage && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ai-100 px-2 py-0.5 font-primary text-xs text-ai-800">
                    {t("helplineWorkspace.copilot.stageLabel")}:{" "}
                    {t(`helplineWorkspace.copilot.stages.${stage}`)}
                  </span>
                )
              }
            >
              {nudgeMessage && (
                <div className="rounded-lg border border-ai-700 p-2">
                  <p className="whitespace-pre-wrap break-words font-primary text-sm text-typography-900">
                    {nudgeMessage.content}
                  </p>
                  <div className="mt-1 flex justify-end">
                    <Thumbs
                      value={ratingFor(nudgeMessage)}
                      onRate={rating => void rate(nudgeMessage, undefined, rating)}
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card title={t("helplineWorkspace.copilot.summaryTitle")} testId="rolling-summary">
            {summaries.rolling &&
            Object.values(summaries.rolling.fields).some(value => value?.trim()) ? (
              <SummaryFields summary={summaries.rolling} settings={settings} />
            ) : (
              <p className="font-primary text-sm text-typography-700">
                {t("helplineWorkspace.copilot.summaryEmpty")}
              </p>
            )}
          </Card>
        </>
      )}

      {whispers.length > 0 && (
        <Card title={t("helplineWorkspace.copilot.whispersTitle")} testId="whispers">
          <ul className="flex flex-col gap-2">
            {whispers.map(whisper => (
              <li
                key={whisper.id}
                className="rounded-lg bg-status-mauveBg p-2 font-primary text-sm text-status-mauveFg"
              >
                {whisper.senderName && (
                  <span className="block text-xs font-medium">{whisper.senderName}</span>
                )}
                <span className="whitespace-pre-wrap break-words">{whisper.content}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};
