export enum SocketConnectionPaths {
  SCENARIO_REPORTS = "scenario/reports",
}

export enum SocketConnectionTypes {
  SCENARIO_REPORTS = "scenario-reports",
}

export const socketConnectionMap = {
  [SocketConnectionTypes.SCENARIO_REPORTS]: SocketConnectionPaths.SCENARIO_REPORTS,
};
