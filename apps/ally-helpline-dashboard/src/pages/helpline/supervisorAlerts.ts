import { ROUTES, buildHelplineChatRoute } from "@constants/routes";
import type { HelplineAlertType } from "@types";

/**
 * Supervisor alerts (contract §6.3 `ALERT`). Pure helpers, so the realtime
 * provider's handler stays small and the rules are testable on their own.
 */

/** Alert types a supervisor is told about, persistently, with sound. */
export const SUPERVISOR_ALERT_TYPES: readonly HelplineAlertType[] = [
  "RISK_HIGH",
  "HIGH_RISK_WAITING",
  "LISTENER_DISCONNECTED",
  "TRANSFER_REQUESTED",
  "LISTENER_REQUESTED_HELP",
];

/** The server dedupes risk alerts 1 per chat per 10 min; the client does too, for every type. */
export const ALERT_DEDUPE_MS = 10 * 60 * 1000;

export const isSupervisorAlertType = (type: string | undefined): type is HelplineAlertType =>
  Boolean(type) && (SUPERVISOR_ALERT_TYPES as readonly string[]).includes(type as string);

/**
 * Remembers which (type, chat) pairs were shown and refuses a repeat inside the
 * window. Keyed by type as well as chat: a listener asking for help on a chat
 * already flagged high risk is new information, not a repeat.
 */
export const createAlertDeduper = (windowMs: number = ALERT_DEDUPE_MS) => {
  const shownAt = new Map<string, number>();
  return (key: string, now: number = Date.now()): boolean => {
    for (const [seenKey, at] of shownAt) {
      if (now - at >= windowMs) shownAt.delete(seenKey);
    }
    if (shownAt.has(key)) return false;
    shownAt.set(key, now);
    return true;
  };
};

export const alertKey = (type: HelplineAlertType, chatId: string) => `${type}:${chatId}`;

/**
 * Where **Open** goes: a waiting talker is assigned from the Monitor; anything
 * about a live chat opens that chat (read-only for a supervisor, with the
 * whisper composer).
 */
export const alertTarget = (type: HelplineAlertType, chatId: string) =>
  type === "HIGH_RISK_WAITING" || !chatId
    ? ROUTES.HELPLINE_MONITOR
    : buildHelplineChatRoute(chatId);
