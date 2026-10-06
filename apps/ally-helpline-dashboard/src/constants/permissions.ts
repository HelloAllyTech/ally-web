export enum Permissions {
  VIEW_ANALYTICS_DASHBOARD = "view:analytics:dashboard",
  // Tenant-admin native Organization Metrics dashboard (not Metabase)
  VIEW_ORGANIZATION_METRICS = "view:organization-metrics",

  // Call related permissions
  START_MICROPHONE_CHAT = "start:microphone-chat",
  START_CLOUD_TELEPHONY_CHAT = "start:cloud-telephony-chat",
  // Search permission
  VIEW_REFERNCE_DOCUMENT = "view:reference-document",
  // Learn permission
  EDIT_SCENARIO_SESSION = "edit:scenario-session",
  VIEW_SCENARIO_PATHS = "view:scenario-paths",
  VIEW_SCENARIO_PATH = "view:scenario-path",
  EDIT_SCENARIO_PATH = "edit:scenario-path",

  // Logs Permission
  VIEW_CALL_LOGS = "view:call:logs",
  VIEW_CONSOLIDATED_LOGS = "view:call:logs-summary", // Admin logs permission
  VIEW_SCENARIO_SESSION = "view:scenario-session",
  VIEW_ADMIN_SCENARIO_SESSION = "view:admin:scenario-session", // Admin simulation logs permission

  VIEW_SCENARIO_SESSION_SUMMARY = "view:scenario-session:summary",
  VIEW_AUDIO_UPLOAD = "view:audio-upload-url",
  DELETE_CHAT = "delete:chat",
  EXPORT_SUMMARY = "export:summary",
  EDIT_CALL_INFO = "edit:call:info",
  EDIT_CALL_DETAILS = "edit:call:details",
  VIEW_SIMULATION_CREDITS = "view:simulation-credits",
  VIEW_CHAT_DETAILS = "view:chat:details",
  VIEW_TRANSCRIPTION = "view:messages",
  VIEW_CHAT_TYPES = "view:settings:chat-types",
  VIEW_SUMMARY_FIELDS = "view:settings:summary-fields",
  VIEW_LEADERBOARD = "view:community:leaderboard",
  /** Gates the practice-streak endpoints as well as the user's own rank. */
  VIEW_USER_RANK = "view:user:rank",
  VIEW_SIMULATION_REVIEWS = "view:simulation-reviews",
  VIEW_SCRIBE_REVIEWS = "view:scribe-reviews",
  VIEW_SIMULATION_REVIEW = "view:simulation-review",
  VIEW_SCRIBE_REVIEW = "view:scribe-review",
  VIEW_BADGES = "view:user:badges",
  ARCHIVE_CALL_LOG = "archive:call-log",
  ARCHIVE_CHAT = "ARCHIVE_CHAT",

  // Custom Fields
  VIEW_CUSTOM_FIELD_DEFINITIONS = "view:custom-field:definitions",
  MANAGE_CUSTOM_FIELD_DEFINITIONS = "manage:custom-field:definitions",
  EDIT_CUSTOM_FIELD_VALUES = "edit:custom-field:values",

  // Counsellor
  COUNSELOR_ACCESS = "counselor:access",

  // Evaluation. Held only by the EVALUATOR role, which is layered on top of a
  // normal app role — so this is the gate for the extra evaluation questions,
  // and never for anything the account could not otherwise reach.
  EVALUATOR_ACCESS = "evaluator:access",

  // Character Library (tenant-admin view+create only; edit/delete are
  // platform-admin-only and not exposed in this app — see the migration that
  // grants the ADMIN group view/create: 1905000000000-AddTenantScopedCharacterLibrary).
  VIEW_CHARACTER_LIBRARY = "view:scenario-character",
  CREATE_CHARACTER_LIBRARY = "create:scenario-character",

  // Text helpline (ally-be docs/text-helpline.md §2). LISTENER holds the first
  // eight; HELPLINE_SUPERVISOR adds monitor/whisper/transfer/qa; tenant ADMIN
  // adds team. Every one of them is also behind the tenant's
  // TEXT_HELPLINE_ENABLED toggle on the server — see useCanUseTextHelpline.
  VIEW_HELPLINE_LOBBY = "view:helpline:lobby",
  EDIT_HELPLINE_PRESENCE = "edit:helpline:presence",
  EDIT_HELPLINE_CLAIM = "edit:helpline:claim",
  VIEW_HELPLINE_CHAT = "view:helpline:chat",
  EDIT_HELPLINE_MESSAGE = "edit:helpline:message",
  EDIT_HELPLINE_END = "edit:helpline:end",
  VIEW_HELPLINE_COPILOT = "view:helpline:copilot",
  EDIT_HELPLINE_SUMMARY = "edit:helpline:summary",
  VIEW_HELPLINE_MONITOR = "view:helpline:monitor",
  EDIT_HELPLINE_WHISPER = "edit:helpline:whisper",
  EDIT_HELPLINE_TRANSFER = "edit:helpline:transfer",
  VIEW_HELPLINE_QA = "view:helpline:qa",
  EDIT_HELPLINE_TEAM = "edit:helpline:team",
}

export const CALL_PERMISSIONS = [
  Permissions.START_CLOUD_TELEPHONY_CHAT,
  Permissions.START_MICROPHONE_CHAT,
];

export const SCRIBE_LOGS_PERMISSIONS = [
  Permissions.VIEW_CALL_LOGS,
  Permissions.VIEW_CONSOLIDATED_LOGS,
];

export const ROLEPLAY_LOGS_PERMISSIONS = [
  Permissions.VIEW_SCENARIO_SESSION,
  Permissions.VIEW_ADMIN_SCENARIO_SESSION,
];

export const SESSION_LOGS_PERMISSIONS = [...SCRIBE_LOGS_PERMISSIONS, ...ROLEPLAY_LOGS_PERMISSIONS];
