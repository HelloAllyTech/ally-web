export enum SocketConnectionPaths {
  SCENARIO_REPORTS = "scenarios/reports",
  SCENARIO_TRANSLATIONS = "scenarios/translations",
  TRACK_TRANSLATIONS = "tracks/translations",
}

/** Minutes of report history to request when joining the user reports room. Backend uses this to limit REPORTS_UPDATED payload size. */
export const REPORTS_LOOKBACK_MINUTES = 5;

/** Max number of recent uploads to show in the report upload progress dialog. */
export const MAX_RECENT_UPLOADS_DISPLAY = 10;

export enum SocketConnectionTypes {
  SCENARIO_REPORTS = "scenario-reports",
  SCENARIO_TRANSLATIONS = "scenario-translations",
}

export const socketConnectionMap = {
  [SocketConnectionTypes.SCENARIO_REPORTS]: SocketConnectionPaths.SCENARIO_REPORTS,
  [SocketConnectionTypes.SCENARIO_TRANSLATIONS]: SocketConnectionPaths.SCENARIO_TRANSLATIONS,
};
