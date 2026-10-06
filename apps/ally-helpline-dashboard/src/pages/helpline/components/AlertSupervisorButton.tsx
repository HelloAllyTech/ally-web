import { FC, KeyboardEvent, useEffect, useId, useRef, useState } from "react";

import { BellRing } from "lucide-react";
import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";

import type { SupervisorAlertState } from "../useSupervisorAlert";

interface AlertSupervisorButtonProps {
  alert: SupervisorAlertState;
  /** "banner" sits on the risk banner's tinted background. */
  variant?: "panel" | "banner";
  /**
   * Called after an alert went out and the note panel closed. The button disables itself for the
   * cooldown at that moment, so it cannot take focus back — a host with focus to place (a dialog)
   * does it here.
   */
  onSent?: () => void;
}

/**
 * **Alert a supervisor**, with an optional "What do you need?" note in a small
 * panel that opens under the button (in the flow, not floating, so it can't be
 * clipped by the scrolling side panels). After a send it stays disabled for
 * two minutes and says when it went.
 */
export const AlertSupervisorButton: FC<AlertSupervisorButtonProps> = ({
  alert,
  variant = "panel",
  onSent,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const panelId = useId();
  const noteId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) noteRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const send = async () => {
    const ok = await alert.send(note);
    if (ok) {
      setNote("");
      close();
      onSent?.();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  };

  const label = alert.coolingDown
    ? alert.minutesAgo < 1
      ? t("helplineWorkspace.alertSupervisor.alertedJustNow")
      : t("helplineWorkspace.alertSupervisor.alertedAgo", { count: alert.minutesAgo })
    : t("helplineWorkspace.alertSupervisor.button");

  const disabled = alert.coolingDown || alert.sending;

  return (
    <div className="flex flex-col gap-2" data-testid={`alert-supervisor-${variant}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        title={
          alert.coolingDown ? t("helplineWorkspace.alertSupervisor.coolingDownHint") : undefined
        }
        onClick={() => setOpen(current => !current)}
        className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border px-4 font-primary text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-default disabled:opacity-60 ${
          variant === "banner"
            ? "border-current bg-white text-typography-900 hover:bg-background-secondary"
            : "border-border-medium text-typography-900 hover:bg-background-secondary"
        }`}
      >
        <BellRing aria-hidden="true" className="h-4 w-4" />
        {label}
      </button>

      {alert.noSupervisor && (
        <p role="alert" className="font-primary text-xs font-medium text-typography-900">
          {t("helplineWorkspace.alertSupervisor.noneSetUp")}
          {alert.supportContact
            ? ` ${t("helplineWorkspace.alertSupervisor.supportContact", {
                contact: alert.supportContact,
              })}`
            : ""}
        </p>
      )}

      {open && !disabled && (
        <div
          id={panelId}
          role="group"
          aria-label={t("helplineWorkspace.alertSupervisor.button")}
          onKeyDown={onKeyDown}
          className="flex flex-col gap-2 rounded-xl border border-border-medium bg-white p-3 font-primary shadow-sm"
        >
          <label htmlFor={noteId} className="text-xs font-medium text-typography-800">
            {t("helplineWorkspace.alertSupervisor.noteLabel")}
          </label>
          <textarea
            id={noteId}
            ref={noteRef}
            rows={2}
            value={note}
            maxLength={HELPLINE_LIMITS.SUPERVISOR_ALERT_NOTE_MAX}
            onChange={event => setNote(event.target.value)}
            placeholder={t("helplineWorkspace.alertSupervisor.notePlaceholder")}
            className="rounded-lg border border-border-medium px-2 py-1 text-sm text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
          <p className="text-right text-xs text-typography-700">
            {t("helplineWorkspace.alertSupervisor.noteCount", {
              count: note.length,
              max: HELPLINE_LIMITS.SUPERVISOR_ALERT_NOTE_MAX,
            })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="min-h-[36px] rounded-full border border-border-medium px-3 text-sm text-typography-900 hover:bg-background-secondary"
            >
              {t("helplineWorkspace.info.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void send()}
              disabled={alert.sending}
              className="min-h-[36px] rounded-full bg-typography-900 px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {alert.sending
                ? t("helplineWorkspace.alertSupervisor.sending")
                : t("helplineWorkspace.alertSupervisor.send")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
