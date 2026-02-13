import { Permissions } from "@constants";
import { SessionType } from "@types";

export const tableHeaders = [
  {
    id: "callName",
    labelKey: "calls.table.sessionId",
    width: "15%",
  },
  {
    id: "dateAndTime",
    labelKey: "calls.table.dateTime",
    width: "15%",
  },
  {
    id: "duration",
    labelKey: "calls.table.duration",
    width: "15%",
  },
  {
    id: "qualityScore",
    labelKey: "calls.table.qualityScore",
    width: "15%",
  },
  {
    id: "tags",
    labelKey: "calls.table.tags",
    width: "30%",
  },
  {
    id: "review",
    labelKey: "calls.table.summary",
    width: "10%",
  },
];

export const tagColors = {
  1: { bg: "#FFCDD2", text: "#5C0A0A" },
  2: { bg: "#FFE0B2", text: "#662400" },
  3: { bg: "#E0E0E0", text: "#333333" },
  4: { bg: "#B9EFC880", text: "#1B5E20" },
  5: { bg: "#D0F0C080", text: "#174F1B" },
};

export const CALL_LOGS_PAGINATION_LIMIT = 25;

export const tabStyles = {
  textTransform: "none",
  fontWeight: 500,
  color: "#49454F",
  fontFamily: "IBM_Plex_Serif",
  font: "IBM Plex Serif",
};

export const defaultDeleteDialogData = {
  open: false,
  chatId: null,
};

export const defaultTags = [
  { label: "Depression", value: "Depression" },
  { label: "Anxiety", value: "Anxiety" },
  { label: "Stress", value: "Stress" },
  { label: "Relationship", value: "Relationship" },
  { label: "Family", value: "Family" },
  { label: "Work", value: "Work" },
  { label: "Money", value: "Money" },
  { label: "Health", value: "Health" },
  { label: "Life", value: "Life" },
];

export enum SessionUserGroup {
  MY_LOGS = "my-logs",
  ORG_LOGS = "org-logs",
}

export const sessionLogViewList = [
  {
    sessionUserGroup: SessionUserGroup.MY_LOGS,
    sessionType: SessionType.CALL,
    permissionList: [Permissions.VIEW_CALL_LOGS],
  },
  {
    sessionUserGroup: SessionUserGroup.MY_LOGS,
    sessionType: SessionType.SIMULATION,
    permissionList: [Permissions.VIEW_SCENARIO_SESSION],
  },
  {
    sessionUserGroup: SessionUserGroup.ORG_LOGS,
    sessionType: SessionType.CALL,
    permissionList: [Permissions.VIEW_CONSOLIDATED_LOGS],
  },
  {
    sessionUserGroup: SessionUserGroup.ORG_LOGS,
    sessionType: SessionType.SIMULATION,
    permissionList: [Permissions.VIEW_ADMIN_SCENARIO_SESSION],
  },
];

export const sessionLogsMap = {
  [SessionUserGroup.MY_LOGS]: {
    labelKey: "calls.userGroups.my",
  },
  [SessionUserGroup.ORG_LOGS]: {
    labelKey: "calls.userGroups.org",
  },
  [SessionType.CALL]: {
    labelKey: "calls.sessionTypes.call",
  },
  [SessionType.SIMULATION]: {
    labelKey: "calls.sessionTypes.simulation",
  },
};
