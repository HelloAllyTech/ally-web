export enum Permissions {
  EDIT_SCENARIO = "edit:scenario",
  EDIT_USER = "edit:user",
  EDIT_LIVEKIT = "edit:livekit",
  EDIT_EVENT = "edit:session-events",
  VIEW_ADMIN_SCENARIO = "view:admin:scenario",
  EDIT_SCENARIO_VOICE = "edit:scenario-voice",
  EDIT_SCENARIO_LANGUAGE = "edit:admin:language",
  EDIT_CHARACTER_LIBRARY = "edit:scenario-character",
  EDIT_PROMPT = "edit:admin:prompts",
  VIEW_PROMPT = "view:admin:prompts",
  VIEW_ADMIN_BADGE = "view:admin:badges",
  EDIT_GUARDRAIL = "edit:admin:guardrails",
}

export const SIDEBAR_ITEMS = {
  SIMULATION_STUDIO: "simulation-studio",
  EVENTS: "events",
  CHARACTER_LIBRARY: "character-library",
  USERS: "users",
  SCENARIO_VOICES: "scenario-voices",
  SCENARIO_LANGUAGES: "scenario-languages",
  PROMPTS: "prompts",
  USER_BADGES: "user-badges",
  MANAGE_GUARDRAILS: "manage-guardrails",
};
