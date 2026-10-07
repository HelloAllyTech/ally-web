import { FC, ReactNode, useEffect, useId, useRef, useState } from "react";

import { ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";
import type { AckRiskFlagBody, RiskFlagDto } from "@types";

interface RiskBannerProps {
  flag: RiskFlagDto;
  checklist: string[];
  canAcknowledge: boolean;
  onAcknowledge: (body: AckRiskFlagBody) => Promise<boolean>;
  /** The Alert a supervisor control, for the listener of record. */
  alertSupervisor?: ReactNode;
  /** The org's listener support contact, for the "nobody could be alerted" line. */
  supportContact?: string | null;
}

/** The checklist step about telling a supervisor, if the org wrote one. */
const SUPERVISOR_STEP = /supervisor/i;

/**
 * An unacknowledged risk flag. It stays until the listener acknowledges it or
 * marks it a false positive — there is no dismiss — because in a crisis the
 * listener needs direct guidance, not a notification they can swipe away
 * ("When Supervisors Must Give Direct Advice"). The org's escalation checklist
 * sits right in the banner. The ticks are a working aid for this moment and
 * are not saved.
 *
 * Fold-until-acknowledged: repeated hits fold into this one flag, so the
 * banner says how many and quotes the latest instead of stacking banners. A
 * "possible risk" banner may fold its steps away to keep the chat readable;
 * a high-risk one never can, and an upgrade to high risk opens it again,
 * scrolls it into view and says so.
 */
export const RiskBanner: FC<RiskBannerProps> = ({
  flag,
  checklist,
  canAcknowledge,
  onAcknowledge,
  alertSupervisor,
  supportContact = null,
}) => {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState<AckRiskFlagBody["outcome"] | null>(null);
  const [failed, setFailed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [raised, setRaised] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const previousLevel = useRef(flag.level);
  const noteId = useId();
  const stepId = useId();
  const detailsId = useId();
  const isHigh = flag.level === "HIGH";
  const showDetails = isHigh || !collapsed;
  const hits = flag.hitCount ?? 1;
  const latestSignal = flag.latestSignal ?? flag.signal;

  useEffect(() => {
    const before = previousLevel.current;
    previousLevel.current = flag.level;
    if (before === "ELEVATED" && flag.level === "HIGH") {
      setCollapsed(false);
      setRaised(true);
      // Into view, never focus: the listener may be mid-reply in the composer.
      sectionRef.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    }
  }, [flag.level]);
  // null/absent: the server didn't say (older payloads) — so neither do we.
  const alerted = flag.supervisorsAlerted;
  const supervisorStep = checklist.findIndex(item => SUPERVISOR_STEP.test(item));

  const submit = async (outcome: AckRiskFlagBody["outcome"]) => {
    setSaving(outcome);
    setFailed(false);
    const trimmed = note.trim().slice(0, HELPLINE_LIMITS.RISK_NOTE_MAX);
    const ok = await onAcknowledge({ outcome, ...(trimmed ? { note: trimmed } : {}) });
    if (!ok) {
      setFailed(true);
      setSaving(null);
    }
  };

  return (
    <section
      ref={sectionRef}
      role={isHigh ? "alert" : "status"}
      aria-label={t(`helplineWorkspace.riskBanner.title.${flag.level}`)}
      className={`ph-no-capture rounded-xl border-2 p-3 font-primary ${
        isHigh
          ? "border-status-alarmDot bg-status-alarmBg text-status-alarmFg"
          : "border-status-ochreDot bg-status-ochreBg text-status-ochreFg"
      } ${raised ? "ring-2 ring-status-alarmDot ring-offset-2" : ""}`}
      data-testid={`risk-banner-${flag.id}`}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-semibold">
              {t(`helplineWorkspace.riskBanner.title.${flag.level}`)}
            </p>
            {!isHigh && (
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls={detailsId}
                onClick={() => setCollapsed(current => !current)}
                className="min-h-[40px] flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium underline-offset-2 md:min-h-0 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {collapsed
                  ? t("helplineWorkspace.riskBanner.showSteps")
                  : t("helplineWorkspace.riskBanner.hideSteps")}
              </button>
            )}
          </div>
          {raised && (
            <p className="text-sm font-semibold" data-testid="risk-raised">
              {t("helplineWorkspace.riskBanner.raised")}
            </p>
          )}
          <p className="text-xs">
            {t(`helplineWorkspace.riskBanner.source.${flag.source}`)}
            {flag.subject === "OTHER" ? ` · ${t("helplineWorkspace.riskBanner.subjectOther")}` : ""}
          </p>
          {flag.signal && (
            <p className="mt-1 break-words text-sm italic">
              {t("helplineWorkspace.riskBanner.signal", { signal: flag.signal })}
            </p>
          )}
          {hits > 1 && (
            <p className="mt-1 break-words text-sm font-medium" data-testid="risk-fold">
              {latestSignal
                ? t("helplineWorkspace.riskBanner.foldedLatest", {
                    count: hits,
                    signal: latestSignal,
                  })
                : t("helplineWorkspace.riskBanner.folded", { count: hits })}
            </p>
          )}
          {typeof alerted === "number" && alerted > 0 && (
            <p className="mt-1 text-sm font-medium" data-testid="risk-supervisor-alerted">
              {t("helplineWorkspace.riskBanner.supervisorAlerted")}
            </p>
          )}
          {alerted === 0 && (
            <p className="mt-1 text-sm font-medium" data-testid="risk-no-supervisor">
              {t("helplineWorkspace.riskBanner.noSupervisorAlerted")}
              {supportContact
                ? ` ${t("helplineWorkspace.alertSupervisor.supportContact", { contact: supportContact })}`
                : ""}
            </p>
          )}
          {isHigh && flag.resourcesSent && (
            <p className="text-sm">{t("helplineWorkspace.riskBanner.resourcesSent")}</p>
          )}
        </div>
      </div>

      <div id={detailsId} hidden={!showDetails} data-testid="risk-details">
        {checklist.length > 0 && (
          <fieldset className="mt-3">
            <legend className="text-sm font-semibold">
              {t("helplineWorkspace.riskBanner.checklistTitle")}
            </legend>
            <ul className="mt-1 flex flex-col gap-1">
              {checklist.map((item, index) => (
                <li key={`${index}-${item}`} className="flex flex-col gap-1.5">
                  <label className="flex items-start gap-2 text-sm text-typography-900">
                    {/* Named explicitly: some accessibility trees read a wrapped
                      checkbox by its value ("on") rather than its label. */}
                    <input
                      type="checkbox"
                      aria-labelledby={`${stepId}-${index}`}
                      checked={Boolean(ticked[index])}
                      onChange={event =>
                        setTicked(current => ({ ...current, [index]: event.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 flex-shrink-0"
                    />
                    <span id={`${stepId}-${index}`}>{item}</span>
                  </label>
                  {alertSupervisor && index === supervisorStep && (
                    <div className="pl-6">{alertSupervisor}</div>
                  )}
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {alertSupervisor && supervisorStep < 0 && <div className="mt-3">{alertSupervisor}</div>}

        {canAcknowledge && (
          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor={noteId} className="text-xs font-medium">
              {t("helplineWorkspace.riskBanner.noteLabel")}
            </label>
            <textarea
              id={noteId}
              rows={2}
              value={note}
              maxLength={HELPLINE_LIMITS.RISK_NOTE_MAX}
              placeholder={t("helplineWorkspace.riskBanner.notePlaceholder")}
              onChange={event => setNote(event.target.value)}
              className="rounded-lg border border-border-medium bg-white px-2 py-1 text-sm text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            />
            {failed && (
              <p role="alert" className="text-xs font-medium">
                {t("helplineWorkspace.riskBanner.ackFailed")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void submit("CONFIRMED")}
                className="min-h-[44px] rounded-full bg-typography-900 px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60 md:min-h-[36px]"
              >
                {saving === "CONFIRMED"
                  ? t("helplineWorkspace.riskBanner.saving")
                  : t("helplineWorkspace.riskBanner.acknowledge")}
              </button>
              <button
                type="button"
                disabled={saving !== null}
                onClick={() => void submit("FALSE_POSITIVE")}
                className="min-h-[44px] rounded-full border border-current bg-white px-4 text-sm text-typography-900 hover:bg-background-secondary disabled:opacity-60 md:min-h-[36px]"
              >
                {saving === "FALSE_POSITIVE"
                  ? t("helplineWorkspace.riskBanner.saving")
                  : t("helplineWorkspace.riskBanner.falsePositive")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

/** What an acknowledged flag collapses to. */
export const RiskNotedChip: FC<{ flag: RiskFlagDto }> = ({ flag }) => {
  const { t } = useTranslation();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-background-secondary px-2 py-0.5 font-primary text-xs text-typography-800"
      data-testid={`risk-noted-${flag.id}`}
    >
      <ShieldAlert aria-hidden="true" className="h-3 w-3" />
      {flag.outcome === "FALSE_POSITIVE"
        ? t("helplineWorkspace.riskBanner.notedFalse")
        : t("helplineWorkspace.riskBanner.noted")}
      {" · "}
      {t(`helplineWorkspace.risk.${flag.level}`)}
    </span>
  );
};
