import { FC, useEffect, useId, useState } from "react";

import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";
import type { MonitorListenerDto } from "@types";

import { TalkerDialog } from "../../helpline-talk/components/TalkerDialog";

const fieldClass =
  "w-full rounded-lg border border-border-medium bg-white px-2 py-1.5 font-primary text-sm text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500";

interface ListenerPickerDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Listeners to offer; null hides the picker (the caller can't see who is available). */
  listeners: MonitorListenerDto[] | null;
  /** Whether "anyone available" is a valid choice (transfer) or a listener is required (assign). */
  optional: boolean;
  loadingListeners?: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: (listenerId: number | undefined) => void;
  onCancel: () => void;
}

/**
 * Request transfer (optional target) and Assign to… (target required) share
 * this: a confirm dialog with a listener picker. Listeners are offered in
 * name order — who has room, not who is "best".
 */
export const ListenerPickerDialog: FC<ListenerPickerDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  listeners,
  optional,
  loadingListeners,
  busy,
  error,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const selectId = useId();
  const [choice, setChoice] = useState("");

  useEffect(() => {
    if (open) setChoice("");
  }, [open]);

  const required = !optional;
  const noneAvailable = listeners !== null && !loadingListeners && listeners.length === 0;

  return (
    <TalkerDialog
      open={open}
      title={title}
      body={
        <div className="flex flex-col gap-3">
          <p>{body}</p>
          {listeners !== null && (
            <div className="flex flex-col gap-1">
              <label htmlFor={selectId} className="text-sm font-medium text-typography-900">
                {optional
                  ? t("helplineWorkspace.transfer.targetLabel")
                  : t("helplineWorkspace.monitor.assign.listenerLabel")}
              </label>
              <select
                id={selectId}
                value={choice}
                disabled={loadingListeners || (noneAvailable && required)}
                onChange={event => setChoice(event.target.value)}
                className={fieldClass}
              >
                <option value="">
                  {optional
                    ? t("helplineWorkspace.transfer.anyone")
                    : t("helplineWorkspace.monitor.assign.choose")}
                </option>
                {listeners.map(listener => (
                  <option key={listener.userId} value={String(listener.userId)}>
                    {t("helplineWorkspace.monitor.assign.option", {
                      name: listener.displayName,
                      active: listener.activeChatCount,
                      max: listener.maxConcurrentChats,
                    })}
                  </option>
                ))}
              </select>
              {loadingListeners && (
                <p className="text-xs text-typography-700">{t("helplineWorkspace.gate.loading")}</p>
              )}
              {noneAvailable && (
                <p className="text-xs text-typography-700">
                  {optional
                    ? t("helplineWorkspace.transfer.noneAvailable")
                    : t("helplineWorkspace.monitor.assign.noneAvailable")}
                </p>
              )}
            </div>
          )}
        </div>
      }
      confirmLabel={confirmLabel}
      cancelLabel={t("helplineWorkspace.info.cancel")}
      onConfirm={() => {
        if (required && !choice) return;
        onConfirm(choice ? Number(choice) : undefined);
      }}
      onCancel={onCancel}
      busy={busy}
      confirmDisabled={required && !choice}
      error={error}
    />
  );
};

interface BlockTalkerDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Block talker: says exactly what happens (ends the chat, 24 h refusal), optional reason. */
export const BlockTalkerDialog: FC<BlockTalkerDialogProps> = ({
  open,
  busy,
  error,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  const reasonId = useId();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  return (
    <TalkerDialog
      open={open}
      title={t("helplineWorkspace.block.title")}
      body={
        <div className="flex flex-col gap-3">
          <p>{t("helplineWorkspace.block.body")}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor={reasonId} className="text-sm font-medium text-typography-900">
              {t("helplineWorkspace.block.reasonLabel")}
            </label>
            <textarea
              id={reasonId}
              rows={2}
              value={reason}
              maxLength={HELPLINE_LIMITS.BLOCK_REASON_MAX}
              placeholder={t("helplineWorkspace.block.reasonPlaceholder")}
              onChange={event => setReason(event.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      }
      confirmLabel={t("helplineWorkspace.block.confirm")}
      cancelLabel={t("helplineWorkspace.info.cancel")}
      onConfirm={() => onConfirm(reason.trim())}
      onCancel={onCancel}
      destructive
      busy={busy}
      error={error}
    />
  );
};
