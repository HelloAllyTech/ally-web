import { FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";

export enum Permissions {
  EDIT_SCENARIO = "edit:scenario",
  EDIT_USER = "edit:user",
  EDIT_LIVEKIT = "edit:livekit",
  EDIT_EVENT = "edit:session-events",
  VIEW_ADMIN_SCENARIO = "view:admin:scenario",
  EDIT_SCENARIO_VOICE = "edit:scenario-voice",
  EDIT_SCENARIO_LANGUAGE = "edit:admin:language",
  EDIT_CHARACTER_LIBRARY = "edit:scenario-character",
}

export const SIDEBAR_ITEMS = {
  SIMULATION_STUDIO: "simulation-studio",
  EVENT_MANAGEMENT: "event-management",
  ...(FEATURE_FLAGS_MAP.CHARACTER_LIBRARY_FLAG && {
    CHARACTER_LIBRARY: "character-library",
  }),
  USER_MANAGEMENT: "user-management",
  SCENARIO_VOICES: "scenario-voices",
  SCENARIO_LANGUAGES: "scenario-languages",
};
