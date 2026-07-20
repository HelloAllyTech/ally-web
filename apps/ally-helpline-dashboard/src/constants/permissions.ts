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
