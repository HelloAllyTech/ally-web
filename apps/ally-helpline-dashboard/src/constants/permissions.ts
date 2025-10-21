export enum Permissions {
  VIEW_NAVBAR_CALLS = "view:navbar:calls",
  VIEW_NAVBAR_COMMUNITY = "view:navbar:community", // BE to change the naming
  VIEW_SCENARIO_SESSION = "view:scenario-session", //  view permission to have session logs - decide upon the multi role user decision
  VIEW_ADMIN_SCENARIO_SESSION = "view:admin:scenario-session", // view permission to have session logs for admin

  // need to revisit call logs permission, community permission,
  VIEW_ANALYTICS_DASHBOARD = "view:analytics:dashboard",

  // Call related permissions
  START_MICROPHONE_CHAT = "start:microphone-chat",
  START_CLOUD_TELEPHONY_CHAT = "start:cloud-telephony-chat",
  // Search permission
  VIEW_REFERNCE_DOCUMENT = "view:reference-document",
  // Learn permission
  EDIT_SCENARIO_SESSION = "edit:scenario-session",

  VIEW_SCENARIO_SESSION_SUMMARY = "view:scenario-session:summary",
  VIEW_AUDIO_UPLOAD = "view:audio-upload-url",
  DELETE_CHAT = "delete:chat",
}
