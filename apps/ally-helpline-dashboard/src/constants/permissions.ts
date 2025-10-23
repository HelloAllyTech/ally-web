export enum Permissions {
  VIEW_NAVBAR_CALLS = "view:navbar:calls",
  VIEW_NAVBAR_COMMUNITY = "view:navbar:community", // BE to change the naming

  // need to revisit call logs permission, community permission,
  VIEW_ANALYTICS_DASHBOARD = "view:analytics:dashboard",

  // Call related permissions
  START_MICROPHONE_CHAT = "start:microphone-chat",
  START_CLOUD_TELEPHONY_CHAT = "start:cloud-telephony-chat",
  // Search permission
  VIEW_REFERNCE_DOCUMENT = "view:reference-document",
  // Learn permission
  EDIT_SCENARIO_SESSION = "edit:scenario-session",

  // Logs Permission
  VIEW_CALL_LOGS = "view:call:logs",
  VIEW_CONSOLIDATED_LOGS = "view:call:logs-summary", // Admin logs permission
  VIEW_SCENARIO_SESSION = "view:scenario-session",
  VIEW_ADMIN_SCENARIO_SESSION = "view:admin:scenario-session", // Admin simulation logs permission

  VIEW_SCENARIO_SESSION_SUMMARY = "view:scenario-session:summary",
  VIEW_AUDIO_UPLOAD = "view:audio-upload-url",
  DELETE_CHAT = "delete:chat",
  EXPORT_CHAT_SUMMARY = "export:chat:summary",
  EDIT_CALL_INFO = "edit:call:info",
  EDIT_CALL_DETAILS = "edit:call:details",
}

export const CALL_PERMISSIONS = [
  Permissions.START_CLOUD_TELEPHONY_CHAT,
  Permissions.START_MICROPHONE_CHAT,
];

export const SESSION_LOGS_PERMISSIONS = [
  Permissions.VIEW_CALL_LOGS,
  Permissions.VIEW_CONSOLIDATED_LOGS,
  Permissions.VIEW_SCENARIO_SESSION,
  Permissions.VIEW_ADMIN_SCENARIO_SESSION,
];
