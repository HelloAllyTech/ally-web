/**
 * Text helpline org settings, as served by ally-be's admin routes
 * (`GET`/`PUT /v1/helpline/admin/settings`). Mirrors §5.4 and §8 of ally-be's
 * `docs/text-helpline.md` — if the two disagree, fix one of them in the same PR.
 */

/** 0 = Sunday … 6 = Saturday, matching JavaScript's `Date#getDay`. */
export type HelplineWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HelplineHoursWindow {
  day: HelplineWeekday;
  /** 24-hour `HH:MM`, read in `HelplineHours.tz`. */
  open: string;
  close: string;
}

export interface HelplineHours {
  /** IANA timezone, e.g. `Asia/Kolkata`. */
  tz: string;
  weekly: HelplineHoursWindow[];
}

export interface HelplineSupervisorAlertChannels {
  inApp: boolean;
  push: boolean;
  /** Only `https://hooks.slack.com/…` is accepted by the server. */
  slackWebhookUrl: string | null;
}

export interface HelplineCopilotSettings {
  suggestions: boolean;
  nudges: boolean;
  riskClassifier: boolean;
  rollingSummaryEveryTurns: number;
}

export interface HelplineSummaryField {
  key: string;
  label: string;
  description: string;
}

export interface HelplineSettings {
  /** 0 keeps chat content forever. */
  retentionDays: number;
  /** `null` = open whenever a listener is Available. */
  hours: HelplineHours | null;
  languages: string[];
  allowQueueWhenNoListeners: boolean;
  maxWaitMinutes: number;
  idleEndMinutes: number;
  maxWaitingTalkers: number;
  orgMaxConcurrentPerListener: number;
  /** Keyed by language code. */
  emergencyResources: Record<string, string>;
  /** Keyed by language code. */
  closingMessage: Record<string, string>;
  escalationChecklist: string[];
  supervisorAlertChannels: HelplineSupervisorAlertChannels;
  listenerSupportContact: string | null;
  ageNotice: string | null;
  copilot: HelplineCopilotSettings;
  riskHighConfidence: number;
  summaryFields: HelplineSummaryField[];
}

/** `AdminSettingsDto` in the contract. */
export interface HelplineAdminSettingsDto {
  tenantId: string;
  tenantCode: string;
  enabled: boolean;
  settings: HelplineSettings;
  /** What an organisation gets when it has saved nothing — used for placeholders. */
  defaults: HelplineSettings;
  /** Path on the consumer app, e.g. `/talk/<code>`. */
  publicPath: string;
}

export interface UpdateHelplineAdminSettingsBody {
  /** The organisation's uuid or code — the backend normalises either. */
  tenantId: string;
  enabled?: boolean;
  settings?: Partial<HelplineSettings>;
}
