import { ReportData } from "@types";

export enum SocketEvent {
  CONNECTED = "CONNECTED",
  JOIN_USER_REPORTS_ROOM = "JOIN_USER_REPORTS_ROOM",
  JOIN_SCENARIO_REPORT_ROOM = "JOIN_SCENARIO_REPORT_ROOM",
  REPORTS_UPDATED = "REPORTS_UPDATED",
  DISCONNECT = "DISCONNECT",
}

export type ConnectedEventPayload = {
  userId: string;
  message: string;
};

export type JoinUserReportsRoomPayload = {
  lookBackMinutes?: number;
};

export type JoinScenarioReportsRoomPayload = {
  reportId: string;
};

export type ReportsUpdatedPayload = {
  data: ReportData[];
  count: number;
};
