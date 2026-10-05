/**
 * Text helpline constants shared by the public talker page and the listener
 * workspace. Values that the contract fixes (ally-be docs/text-helpline.md)
 * are noted with their section; everything here is a plain literal so the
 * @constants barrel stays free of module-load-time work.
 */

/** socket.io namespace, appended to VITE_API_BASE_URL (§6). */
export const HELPLINE_SOCKET_NAMESPACE = "helpline-chat";

/** Client → server and server → client event names (§6.3). */
export const HELPLINE_SOCKET_EVENTS = {
  // client → server
  SEND_MESSAGE: "SEND_MESSAGE",
  USER_TYPING: "USER_TYPING",
  USER_STOPPED_TYPING: "USER_STOPPED_TYPING",
  SYNC_SINCE: "SYNC_SINCE",
  JOIN_CHAT: "JOIN_CHAT",
  LEAVE_CHAT: "LEAVE_CHAT",
  PRESENCE_SET: "PRESENCE_SET",
  HEARTBEAT: "HEARTBEAT",
  // server → client
  MESSAGE_RECEIVED: "MESSAGE_RECEIVED",
  QUEUE_POSITION: "QUEUE_POSITION",
  CHAT_ACCEPTED: "CHAT_ACCEPTED",
  CHAT_UPDATED: "CHAT_UPDATED",
  CHAT_ENDED: "CHAT_ENDED",
  QUEUE_UPDATED: "QUEUE_UPDATED",
  PRESENCE_UPDATED: "PRESENCE_UPDATED",
  PARTICIPANT_STATUS: "PARTICIPANT_STATUS",
  RISK_FLAGGED: "RISK_FLAGGED",
  SUGGESTIONS: "SUGGESTIONS",
  NUDGE: "NUDGE",
  STAGE: "STAGE",
  COPILOT_STATUS: "COPILOT_STATUS",
  SUMMARY_UPDATED: "SUMMARY_UPDATED",
  WHISPER: "WHISPER",
  TRANSFER_REQUESTED: "TRANSFER_REQUESTED",
  TRANSFERRED: "TRANSFERRED",
  ALERT: "ALERT",
  ERROR: "ERROR",
} as const;

export const HELPLINE_LIMITS = {
  /** Message content after trim (§6.3). */
  MESSAGE_MAX: 2000,
  /** Show the composer's character counter from here on. */
  MESSAGE_COUNTER_FROM: 1800,
  DISPLAY_NAME_MAX: 40,
  FEEDBACK_COMMENT_MAX: 1000,
  RISK_NOTE_MAX: 500,
} as const;

export const HELPLINE_TIMINGS = {
  /** Both sides heartbeat every 15 s; the server's liveness key lives 45 s (§6.4). */
  HEARTBEAT_MS: 15_000,
  /** How long an emit waits for its ack before we call it failed. */
  ACK_TIMEOUT_MS: 8_000,
  /** The client throttles USER_TYPING to one per 2 s (§6.3). */
  TYPING_THROTTLE_MS: 2_000,
  /** Send USER_STOPPED_TYPING after this long without a keystroke. */
  TYPING_IDLE_MS: 4_000,
  /** Hide the other side's typing indicator if no refresh arrives. */
  TYPING_DISPLAY_MS: 6_000,
  /** Refresh the guest token once it is this close to expiry. */
  GUEST_TOKEN_REFRESH_BEFORE_MS: 60 * 60 * 1000,
  /** Wait this long for the FINAL summary before offering empty fields. */
  FINAL_SUMMARY_WAIT_MS: 20_000,
} as const;

/** sessionStorage key for a talker's guest token, one per helpline (§11). */
export const getGuestTokenStorageKey = (tenantCode: string) => `allyHelplineGuest:${tenantCode}`;

/** Where Quick exit sends the talker. `location.replace` keeps it out of Back. */
export const HELPLINE_QUICK_EXIT_URL = "https://www.google.com";

/**
 * i18n key (under `helplineWorkspace.skills.*`) for each copilot `skill_key`
 * (contract §9.1). Unknown keys render without a chip rather than as a raw id.
 */
export const HELPLINE_SKILL_KEYS = [
  "rapport",
  "confidentiality",
  "feelings",
  "empathy",
  "harm",
  "functioning",
  "explanation",
  "family",
  "goals",
  "hope",
  "coping",
  "psychoeducation",
  "feedback",
  "verbal",
] as const;

/** The four stages the copilot reports (§9.1). */
export const HELPLINE_STAGES = ["Engage", "Understand", "Support", "Close"] as const;

/** Talker-visible system kinds; anything else in a staff transcript is staff-only. */
export const HELPLINE_TALKER_SYSTEM_KINDS = [
  "ACCEPTED",
  "RESOURCES",
  "CLOSING",
  "TRANSFERRING",
  "LISTENER_RECONNECTING",
  "LISTENER_BACK",
  "ENDED",
] as const;

/**
 * Shown on the not-available screen, where the server has told us nothing
 * (unknown code or a disabled helpline). Static on purpose: there is no org
 * text to show. Kept in sync with the contract's default resources (§7).
 */
export const HELPLINE_DEFAULT_EMERGENCY_NUMBERS = {
  EMERGENCY: "112",
  TELE_MANAS_SHORT: "14416",
  TELE_MANAS_LONG: "1-800-891-4416",
} as const;
