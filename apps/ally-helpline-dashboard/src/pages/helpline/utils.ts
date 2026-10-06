import { HELPLINE_SKILL_KEYS, HELPLINE_TALKER_SYSTEM_KINDS } from "@constants/helpline";
import type {
  ChatDetailDto,
  HelplineMeDto,
  HelplineRiskLevel,
  LobbyEntryDto,
  RiskFlagDto,
  StaffMessageDto,
} from "@types";

import type { TFunction } from "i18next";

/** Whole seconds from an ISO timestamp to `now`; 0 for anything unparseable or in the future. */
export const secondsSince = (iso: string | null | undefined, now: number = Date.now()) => {
  if (!iso) return 0;
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.floor((now - at) / 1000));
};

/** "45 s", "12 min", "1 h 5 min". */
export const formatDuration = (seconds: number, t: TFunction) => {
  if (seconds < 60) return t("helplineWorkspace.time.seconds", { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("helplineWorkspace.time.minutes", { count: minutes });
  return t("helplineWorkspace.time.hoursMinutes", {
    hours: Math.floor(minutes / 60),
    minutes: minutes % 60,
  });
};

/** Priority first (HIGH risk is bumped to 100 by the server), then whoever has waited longest. */
export const sortWaiting = (entries: LobbyEntryDto[]) =>
  [...entries].sort(
    (a, b) => b.priority - a.priority || Date.parse(a.waitStartedAt) - Date.parse(b.waitStartedAt),
  );

const RISK_ORDER: Record<HelplineRiskLevel, number> = { NONE: 0, ELEVATED: 1, HIGH: 2 };
export const maxRiskLevel = (a: HelplineRiskLevel, b: HelplineRiskLevel): HelplineRiskLevel =>
  RISK_ORDER[b] > RISK_ORDER[a] ? b : a;

/** The i18n key for a copilot skill tag, or null for a key we don't know (no raw ids on screen). */
export const skillLabelKey = (skillKey: string | undefined | null) =>
  skillKey && (HELPLINE_SKILL_KEYS as readonly string[]).includes(skillKey)
    ? `helplineWorkspace.skills.${skillKey}`
    : null;

/** Talker-visible system lines vs staff-only ones (disconnects, transfers, take-overs). */
export const isTalkerVisibleSystemKind = (kind: string | null) =>
  Boolean(kind) && (HELPLINE_TALKER_SYSTEM_KINDS as readonly string[]).includes(kind as string);

/** The messages that belong in the transcript (copilot output lives in its own panel). */
export const isTranscriptMessage = (message: StaffMessageDto) =>
  message.type === "TEXT" ||
  message.type === "SYSTEM" ||
  message.type === "RISK" ||
  message.type === "TRANSFER";

export const latestMessageOfType = (
  messages: StaffMessageDto[],
  type: StaffMessageDto["type"],
): StaffMessageDto | null => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].type === type) return messages[index];
  }
  return null;
};

export const lastMessageId = (messages: StaffMessageDto[]) =>
  messages.reduce((max, message) => (message.id > max ? message.id : max), 0);

/**
 * Insert or replace a message in a chat-detail cache draft. Matches on `id`, or
 * on `clientMessageId` (our own send echoed back), and keeps server order.
 */
export const upsertStaffMessage = (draft: ChatDetailDto, message: StaffMessageDto) => {
  const index = draft.messages.findIndex(
    item =>
      item.id === message.id ||
      (Boolean(message.clientMessageId) && item.clientMessageId === message.clientMessageId),
  );
  if (index >= 0) {
    draft.messages[index] = message;
    return;
  }
  draft.messages.push(message);
  draft.messages.sort((a, b) => a.id - b.id);
};

export const upsertRiskFlag = (draft: ChatDetailDto, flag: RiskFlagDto) => {
  const index = draft.riskFlags.findIndex(item => item.id === flag.id);
  if (index >= 0) draft.riskFlags[index] = flag;
  else draft.riskFlags.push(flag);
  draft.chat.riskLevel = maxRiskLevel(draft.chat.riskLevel, flag.level);
};

/** Flags still waiting for the listener to acknowledge, most serious and newest first. */
export const openRiskFlags = (flags: RiskFlagDto[]) =>
  flags
    .filter(flag => !flag.acknowledgedAt && flag.outcome === "UNREVIEWED")
    .sort(
      (a, b) =>
        RISK_ORDER[b.level] - RISK_ORDER[a.level] ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

/** The listener's effective chat cap: their own choice, never above the org's. */
export const effectiveCapacity = (me: HelplineMeDto | undefined) =>
  me ? Math.max(1, Math.min(me.profile.maxConcurrentChats, me.orgMaxConcurrentPerListener)) : 0;

export type ClaimBlockReason = "away" | "capacity" | "permission" | "targeted" | null;

/** Why Claim is disabled for this entry, or null when it can be claimed. */
export const claimBlockReason = (
  entry: LobbyEntryDto,
  me: HelplineMeDto | undefined,
  canClaim: boolean,
): ClaimBlockReason => {
  if (!canClaim) return "permission";
  if (!me || me.presence !== "AVAILABLE") return "away";
  if (entry.targetListenerId !== null && entry.targetListenerId !== me.userId) return "targeted";
  if (me.activeChatCount >= effectiveCapacity(me)) return "capacity";
  return null;
};
