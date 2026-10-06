/**
 * Text helpline DTOs, typed from the build contract in ally-be
 * `docs/text-helpline.md` (§5 HTTP, §6 socket events, §8 settings). If this
 * file and the contract disagree, the contract wins — fix one of them in the
 * same change.
 *
 * Two audiences, two shapes: a talker (anonymous guest token) only ever sees
 * the `Guest*` DTOs, which carry no staff-only content; listeners and
 * supervisors see the `Staff*` DTOs.
 */

// ─── Shared ─────────────────────────────────────────────────────────────────

export type HelplineChatStatus = "WAITING" | "ACTIVE" | "ENDED";
export type HelplineRiskLevel = "NONE" | "ELEVATED" | "HIGH";
export type HelplineChannel = "TEXT_WEB" | "TEXT_WHATSAPP";
export type HelplinePresence = "AVAILABLE" | "AWAY" | "OFFLINE";

export type HelplineEndedReason =
  | "LISTENER_ENDED"
  | "TALKER_ENDED"
  | "TALKER_LEFT_QUEUE"
  | "TALKER_DISCONNECTED"
  | "WAIT_EXPIRED"
  | "QUEUE_ABANDONED"
  | "SUPERVISOR_ENDED"
  | "TALKER_ERASED"
  | "TALKER_BLOCKED";

export interface HelplineHours {
  tz: string;
  weekly: { day: 0 | 1 | 2 | 3 | 4 | 5 | 6; open: string; close: string }[];
}

export interface HelplineOrg {
  name: string;
  logoUrl: string | null;
}

/** Error body from the ally-be exception filter. */
export interface HelplineErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
  errorCode?: HelplineErrorCode | string;
}

export type HelplineErrorCode =
  | "HELPLINE_DISABLED"
  | "HELPLINE_CLOSED"
  | "HELPLINE_QUEUE_FULL"
  | "HELPLINE_CONSENT_OUTDATED"
  | "HELPLINE_TALKER_BLOCKED"
  | "HELPLINE_CHAT_NOT_FOUND"
  | "HELPLINE_ALREADY_CLAIMED"
  | "HELPLINE_AT_CAPACITY"
  | "HELPLINE_NOT_AVAILABLE"
  | "HELPLINE_CHAT_ENDED"
  | "HELPLINE_NOT_LISTENER"
  | "HELPLINE_GUEST_TOKEN_INVALID";

// ─── Public + guest (talker) ────────────────────────────────────────────────

export type HelplineClosedReason = "NO_LISTENERS" | "OUTSIDE_HOURS" | "QUEUE_FULL";

export interface PublicStatusEnabled {
  enabled: true;
  open: boolean;
  closedReason: HelplineClosedReason | null;
  org: HelplineOrg;
  /** Languages offered to talkers. */
  languages: string[];
  hours: HelplineHours | null;
  /** Median of recent claimed waits; null when there are too few samples. Never invent one. */
  estimatedWaitMinutes: number | null;
  /** Emergency resources text by language. */
  resources: Record<string, string>;
  consent: { version: string; retentionDays: number; ageNotice: string | null };
}

/** `{ enabled: false }` for an unknown code OR a disabled helpline — the server does not say which. */
export type PublicStatusDto = { enabled: false } | PublicStatusEnabled;

export interface CreateGuestSessionBody {
  displayName?: string;
  language: string;
  consentVersion: string;
  firstMessage?: string;
}

export type GuestSystemKind =
  | "ACCEPTED"
  | "RESOURCES"
  | "CLOSING"
  | "TRANSFERRING"
  | "LISTENER_RECONNECTING"
  | "LISTENER_BACK"
  | "ENDED";

export interface GuestChatDto {
  id: string;
  status: HelplineChatStatus;
  endedReason: HelplineEndedReason | string | null;
  language: string;
  displayName: string;
  /** The listener's alias only — never an email or full name. */
  listenerName: string | null;
  /** 1-based while WAITING. */
  queuePosition: number | null;
  waitStartedAt: string;
  claimedAt: string | null;
  endedAt: string | null;
  feedbackSubmitted: boolean;
  org: HelplineOrg;
}

export interface GuestMessageDto {
  id: number;
  clientMessageId: string | null;
  from: "ME" | "LISTENER" | "SERVICE";
  type: "TEXT" | "SYSTEM";
  systemKind: GuestSystemKind | null;
  /** RESOURCES / CLOSING carry org text; other kinds are an English fallback the client localises. */
  content: string;
  params?: Record<string, string>;
  createdAt: string;
}

export interface GuestSessionResponse {
  guestToken: string;
  expiresAt: string;
  chat: GuestChatDto;
  messages: GuestMessageDto[];
}

export interface GuestChatResponse {
  chat: GuestChatDto;
  messages: GuestMessageDto[];
}

export interface GuestTokenResponse {
  guestToken: string;
  expiresAt: string;
}

export interface GuestFeedbackBody {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

// ─── Staff (listener / supervisor) ──────────────────────────────────────────

export interface ListenerSettingsDto {
  escalationChecklist: string[];
  listenerSupportContact: string | null;
  summaryFields: { key: string; label: string; description: string }[];
  copilot: { suggestions: boolean; nudges: boolean; riskClassifier: boolean };
  languages: string[];
  idleEndMinutes: number;
}

export interface HelplineListenerProfile {
  displayName: string;
  maxConcurrentChats: number;
  languages: string[];
  notificationsEnabled: boolean;
}

export interface HelplineMeDto {
  userId: number;
  profile: HelplineListenerProfile;
  presence: HelplinePresence;
  activeChatCount: number;
  orgMaxConcurrentPerListener: number;
  settings: ListenerSettingsDto;
}

export type UpdateHelplineProfileBody = Partial<HelplineListenerProfile>;

export interface LobbyEntryDto {
  chatId: string;
  kind: "NEW" | "TRANSFER";
  displayName: string;
  language: string;
  waitStartedAt: string;
  priority: number;
  riskLevel: HelplineRiskLevel;
  /** First talker message, ≤140 chars. */
  preview: string | null;
  transferFromName: string | null;
  /** A transfer/assign aimed at one listener. */
  targetListenerId: number | null;
}

export interface ChatListItemDto {
  id: string;
  status: HelplineChatStatus;
  talkerName: string;
  language: string;
  listener: { id: number; displayName: string } | null;
  riskLevel: HelplineRiskLevel;
  waitStartedAt: string;
  claimedAt: string | null;
  endedAt: string | null;
  endedReason: HelplineEndedReason | string | null;
  lastMessageAt: string | null;
  unreadForMe?: number;
  messageCount: number;
  erased: boolean;
}

export interface LobbyCounts {
  waiting: number;
  active: number;
  listenersAvailable: number;
}

export interface LobbyDto {
  /** Priority desc, then waitStartedAt asc; excludes abandoned. */
  waiting: LobbyEntryDto[];
  /** My ACTIVE chats. */
  myChats: ChatListItemDto[];
  counts: LobbyCounts;
}

export interface StaffChatDto {
  id: string;
  status: HelplineChatStatus;
  channel: HelplineChannel;
  talker: {
    id: string;
    displayName: string;
    language: string;
    consentVersion: string;
    connected: boolean;
    blocked: boolean;
  };
  listener: { id: number; displayName: string } | null;
  myAccess: "LISTENER" | "READ_ONLY";
  priority: number;
  riskLevel: HelplineRiskLevel;
  waitStartedAt: string;
  claimedAt: string | null;
  endedAt: string | null;
  endedReason: HelplineEndedReason | string | null;
  lastTalkerMessageAt: string | null;
  lastListenerMessageAt: string | null;
  transferPending: boolean;
  resourcesSentAt: string | null;
  listenerConnected: boolean;
  erased: boolean;
}

export type StaffMessageType =
  | "TEXT"
  | "SYSTEM"
  | "SUGGESTION"
  | "NUDGE"
  | "STAGE"
  | "RISK"
  | "WHISPER"
  | "TRANSFER";

export type StaffSenderRole = "TALKER" | "LISTENER" | "SUPERVISOR" | "SYSTEM" | "COPILOT";

export interface CopilotSuggestion {
  index: number;
  text: string;
  skillKey: string;
}

export interface SuggestionMetadata {
  suggestions: CopilotSuggestion[];
  accepted?: number[];
  feedback?: Record<number, "UP" | "DOWN">;
}

export interface NudgeMetadata {
  skillKey?: string;
  feedback?: "UP" | "DOWN";
}

export interface StaffMessageDto {
  id: number;
  chatId: string;
  clientMessageId: string | null;
  type: StaffMessageType;
  senderRole: StaffSenderRole;
  senderUserId: number | null;
  senderName: string | null;
  /** Talker kinds plus staff-only: TALKER_DISCONNECTED, TALKER_RECONNECTED, TAKEN_OVER, TRANSFERRED, ASSIGNED. */
  systemKind: string | null;
  content: string;
  parentMessageId: number | null;
  visibleToTalker: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  erased: boolean;
}

export type RiskFlagOutcome = "UNREVIEWED" | "CONFIRMED" | "FALSE_POSITIVE";

export interface RiskFlagDto {
  id: string;
  messageId: number;
  level: "ELEVATED" | "HIGH";
  source: "KEYWORD" | "CLASSIFIER";
  confidence: number | null;
  subject: "SELF" | "OTHER" | "UNCLEAR" | null;
  /** Re-derived from offsets on the live message body; null once erased. */
  signal: string | null;
  resourcesSent: boolean;
  acknowledgedAt: string | null;
  acknowledgedByName: string | null;
  outcome: RiskFlagOutcome;
  outcomeNote: string | null;
  createdAt: string;
  /**
   * How many supervisors were alerted for this flag: null/absent = not
   * applicable (or an older payload), 0 = nobody could be alerted, n = alerted.
   */
  supervisorsAlerted?: number | null;
}

export type SummaryKind = "ROLLING" | "HANDOFF" | "FINAL";

export interface SummaryDto {
  kind: SummaryKind;
  fields: Record<string, string>;
  throughMessageId: number;
  editedByName: string | null;
  version: number;
  updatedAt: string;
}

export type CopilotStatus = "OK" | "UNAVAILABLE" | "OFF";

export interface ChatDetailDto {
  chat: StaffChatDto;
  /** All types, staff-only included. */
  messages: StaffMessageDto[];
  riskFlags: RiskFlagDto[];
  summaries: { rolling: SummaryDto | null; handoff: SummaryDto | null; final: SummaryDto | null };
  copilot: { status: CopilotStatus; stage: string | null };
  /** Timeline, no bodies. */
  events: { type: string; at: string; actorName: string | null }[];
}

export interface ChatListResponse {
  items: ChatListItemDto[];
  total: number;
}

export interface ChatListParams {
  scope: "mine" | "all";
  status?: HelplineChatStatus;
  page?: number;
  limit?: number;
}

export interface AckRiskFlagBody {
  outcome: "CONFIRMED" | "FALSE_POSITIVE";
  note?: string;
}

export interface CopilotFeedbackBody {
  messageId: number;
  index?: number;
  rating: "UP" | "DOWN";
}

// ─── Supervision (§5.3, §10) ────────────────────────────────────────────────

export interface MonitorActiveChatDto extends ChatListItemDto {
  lastMessageAgeSeconds: number | null;
  listenerConnected: boolean;
  talkerConnected: boolean;
  transferPending: boolean;
  openFlags: number;
}

export interface MonitorListenerDto {
  userId: number;
  displayName: string;
  presence: HelplinePresence;
  activeChatCount: number;
  maxConcurrentChats: number;
  languages: string[];
}

export interface MonitorDto {
  tiles: { waiting: number; active: number; listenersAvailable: number; openHighFlags: number };
  activeChats: MonitorActiveChatDto[];
  waiting: LobbyEntryDto[];
  listeners: MonitorListenerDto[];
}

/**
 * A row of the risk calibration view. The contract names this type without
 * pinning it; assumed to be the flag plus the chat it belongs to. `signal` is
 * never rendered here — the calibration view is about outcomes, not content.
 */
export interface RiskFlagRowDto extends Omit<RiskFlagDto, "signal"> {
  chatId: string;
  signal?: string | null;
}

export interface RiskFlagsResponse {
  items: RiskFlagRowDto[];
  counts: Record<RiskFlagOutcome, number>;
  /** Assumed `{ KEYWORD, CLASSIFIER }` — the contract leaves it as `{...}`. */
  bySource: Partial<Record<RiskFlagDto["source"], number>>;
}

export interface RiskFlagsParams {
  days: 7 | 30;
  outcome?: RiskFlagOutcome;
}

export interface TransferBody {
  targetListenerId?: number;
}

export interface AlertSupervisorResponse {
  alertedCount: number;
}

export type QaTier = "Engage" | "Understand" | "Support";

export interface QaListItemDto {
  chatId: string;
  listenerId: number;
  listenerName: string;
  endedAt: string;
  /** Mean of the skill scores, 1–4. */
  compositeScore: number;
  hasUnhelpfulBehaviour: boolean;
  rubricVersion: string;
}

export interface QaSkillDto {
  key: string;
  label: string;
  tier: QaTier;
  level: 1 | 2 | 3 | 4;
  unhelpful: string[];
  basicMet: string[];
  basicMissing: string[];
  advanced: string[];
  evidence: { messageId: number; quote: string }[];
}

export interface QaDetailDto extends QaListItemDto {
  skills: QaSkillDto[];
}

export interface QaListParams {
  listenerId?: number;
  page?: number;
}

export interface TeamMemberDto {
  userId: number;
  name: string;
  email: string;
  isListener: boolean;
  isSupervisor: boolean;
  isAdmin: boolean;
}

export interface UpdateTeamMemberBody {
  listener: boolean;
  supervisor: boolean;
}

// ─── Socket (§6.3) ──────────────────────────────────────────────────────────

/**
 * Every client→server ack is `{ ok: true, ... } | { ok: false, error }`. Typed
 * loosely on purpose: this app compiles without `strict`, where a boolean
 * discriminant does not narrow, so callers check `ok` and read optional fields.
 */
export type HelplineAck<T = Record<string, unknown>> = { ok: boolean; error?: string } & Partial<T>;

export interface SendMessagePayload {
  chatId: string;
  clientMessageId: string;
  content: string;
  suggestion?: { messageId: number; index: number };
}

export interface TransferEventPayload {
  chatId: string;
  toListenerId?: number | null;
}

export interface QueueUpdatedPayload {
  waiting: LobbyEntryDto[];
  counts: LobbyCounts;
}

export type HelplineAlertType =
  | "RISK_HIGH"
  | "LISTENER_DISCONNECTED"
  | "TRANSFER_REQUESTED"
  | "HIGH_RISK_WAITING"
  | "LISTENER_REQUESTED_HELP";

export interface HelplineAlertPayload {
  type: HelplineAlertType;
  chatId: string;
  level?: string;
  at: string;
}
