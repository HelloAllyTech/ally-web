import { FC, ReactNode, useId, useState } from "react";

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
  const noteId = useId();
  const stepId = useId();
  const isHigh = flag.level === "HIGH";
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
      role={isHigh ? "alert" : "status"}
      aria-label={t(`helplineWorkspace.riskBanner.title.${flag.level}`)}
      className={`ph-no-capture rounded-xl border-2 p-3 font-primary ${
        isHigh
          ? "border-status-alarmDot bg-status-alarmBg text-status-alarmFg"
          : "border-status-ochreDot bg-status-ochreBg text-status-ochreFg"
      }`}
      data-testid={`risk-banner-${flag.id}`}
    >
      <div className="flex items-start gap-2">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold">
            {t(`helplineWorkspace.riskBanner.title.${flag.level}`)}
          </p>
          <p className="text-xs">
            {t(`helplineWorkspace.riskBanner.source.${flag.source}`)}
            {flag.subject === "OTHER" ? ` · ${t("helplineWorkspace.riskBanner.subjectOther")}` : ""}
          </p>
          {flag.signal && (
            <p className="mt-1 break-words text-sm italic">
              {t("helplineWorkspace.riskBanner.signal", { signal: flag.signal })}
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
              className="min-h-[36px] rounded-full bg-typography-900 px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving === "CONFIRMED"
                ? t("helplineWorkspace.riskBanner.saving")
                : t("helplineWorkspace.riskBanner.acknowledge")}
            </button>
            <button
              type="button"
              disabled={saving !== null}
              onClick={() => void submit("FALSE_POSITIVE")}
              className="min-h-[36px] rounded-full border border-current bg-white px-4 text-sm text-typography-900 hover:bg-background-secondary disabled:opacity-60"
            >
              {saving === "FALSE_POSITIVE"
                ? t("helplineWorkspace.riskBanner.saving")
                : t("helplineWorkspace.riskBanner.falsePositive")}
            </button>
          </div>
        </div>
      )}
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
