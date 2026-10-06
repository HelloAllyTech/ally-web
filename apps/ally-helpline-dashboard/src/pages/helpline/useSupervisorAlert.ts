import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAlertHelplineSupervisorMutation } from "@api/helpline";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { HELPLINE_LIMITS, HELPLINE_TIMINGS } from "@constants/helpline";
import { useAnalytics } from "@hooks/useAnalytics";

import { useNow } from "./useNow";

/**
 * When this tab last alerted a supervisor about each chat. Module-level so the
 * 2-minute pause survives leaving the chat and coming back (not a reload —
 * nothing here is worth persisting).
 */
const lastAlertByChat = new Map<string, number>();

/** For tests: forget every pause. */
export const resetSupervisorAlertCooldowns = () => lastAlertByChat.clear();

export interface SupervisorAlertState {
  send: (note: string) => Promise<boolean>;
  sending: boolean;
  /** When the last alert went out, or null. */
  lastAlertAt: number | null;
  /** True for 2 minutes after a send; the button says how long ago. */
  coolingDown: boolean;
  /** Whole minutes since the last alert (0 = "just now"). */
  minutesAgo: number;
  /** The server reached nobody on the last send. */
  noSupervisor: boolean;
  supportContact: string | null;
}

/**
 * Alert a supervisor (contract: `POST chats/:id/alert-supervisor`) — the
 * checklist's "tell a supervisor now", as a button. One instance per chat
 * view, shared by the talker-info action and the risk banner, so the pause
 * applies to both.
 */
export const useSupervisorAlert = (
  chatId: string,
  supportContact: string | null,
): SupervisorAlertState => {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [alertSupervisor, { isLoading }] = useAlertHelplineSupervisorMutation();
  const [lastAlertAt, setLastAlertAt] = useState<number | null>(
    () => lastAlertByChat.get(chatId) ?? null,
  );
  const [noSupervisor, setNoSupervisor] = useState(false);
  const now = useNow(15_000);

  useEffect(() => {
    setLastAlertAt(lastAlertByChat.get(chatId) ?? null);
    setNoSupervisor(false);
  }, [chatId]);

  const elapsed = lastAlertAt === null ? Infinity : Math.max(0, now - lastAlertAt);
  const coolingDown = elapsed < HELPLINE_TIMINGS.SUPERVISOR_ALERT_COOLDOWN_MS;
  const minutesAgo = Number.isFinite(elapsed) ? Math.floor(elapsed / 60_000) : 0;

  const send = useCallback(
    async (note: string) => {
      const trimmed = note.trim().slice(0, HELPLINE_LIMITS.SUPERVISOR_ALERT_NOTE_MAX);
      try {
        const { alertedCount } = await alertSupervisor({
          chatId,
          ...(trimmed ? { note: trimmed } : {}),
        }).unwrap();
        const at = Date.now();
        lastAlertByChat.set(chatId, at);
        setLastAlertAt(at);
        track(ANALYTICS_EVENTS.HELPLINE_SUPERVISOR_ALERTED, {
          [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: chatId,
          [ANALYTICS_PROPS.HELPLINE_HAS_NOTE]: Boolean(trimmed),
          [ANALYTICS_PROPS.HELPLINE_ALERTED_COUNT]: alertedCount,
        });
        if (alertedCount > 0) {
          setNoSupervisor(false);
          toast.success(t("helplineWorkspace.alertSupervisor.sent"));
        } else {
          setNoSupervisor(true);
          toast.warning(
            supportContact
              ? `${t("helplineWorkspace.alertSupervisor.noneSetUp")} ${t(
                  "helplineWorkspace.alertSupervisor.supportContact",
                  { contact: supportContact },
                )}`
              : t("helplineWorkspace.alertSupervisor.noneSetUp"),
            { duration: Number.POSITIVE_INFINITY },
          );
        }
        return true;
      } catch {
        toast.error(t("helplineWorkspace.alertSupervisor.failed"));
        return false;
      }
    },
    [alertSupervisor, chatId, supportContact, t, track],
  );

  return {
    send,
    sending: isLoading,
    lastAlertAt,
    coolingDown,
    minutesAgo,
    noSupervisor,
    supportContact,
  };
};
