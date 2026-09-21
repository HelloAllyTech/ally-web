import { TFunction } from "i18next";

import { Permissions } from "@constants";
import { SessionType } from "@types";

export const tableHeaders = [
  {
    id: "callName",
    label: "Call ID",
    width: "15%",
  },
  {
    id: "dateAndTime",
    label: "Date & Time",
    width: "15%",
  },
  {
    id: "duration",
    label: "Duration",
    width: "15%",
  },
  {
    id: "qualityScore",
    label: "Quality Score",
    width: "15%",
  },
  {
    id: "tags",
    label: "Tags",
    width: "30%",
  },
  {
    id: "review",
    label: "Review",
    width: "10%",
  },
];

/**
 * Session-rating tints, 1 (worst) to 5 (best).
 *
 * A diverging scale, so the ends have to stay distinguishable by hue and not
 * only by lightness — someone scanning a column of these reads the colour
 * before the number. Warm alarm at the bad end, sage at the good end, and the
 * neutral cream at 3 where the scale crosses over. Each `text` is the shade
 * that passes on its own `bg`; don't pair one row's text with another's tint.
 */
export const tagColors = {
  1: { bg: "#F3DDD9", text: "#7A2E25" },
  2: { bg: "#F3E6C9", text: "#6B4F22" },
  3: { bg: "#E3DBCE", text: "#29261F" },
  4: { bg: "#DFE7DD", text: "#3B5240" },
  5: { bg: "#CFDCCD", text: "#2F4434" },
};

export const CALL_LOGS_PAGINATION_LIMIT = 25;

export const tabStyles = {
  textTransform: "none",
  fontWeight: 500,
  color: "#3d3a34",
  fontFamily: "var(--font-primary)",
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
    label: "My Logs",
  },
  [SessionUserGroup.ORG_LOGS]: {
    label: "Organization Logs",
  },
  [SessionType.CALL]: {
    label: "Real call logs",
  },
  [SessionType.SIMULATION]: {
    label: "Simulations",
  },
};

export const getSessionLogsMap = (t: TFunction) => ({
  [SessionUserGroup.MY_LOGS]: {
    label: t("calls.userGroups.my"),
  },
  [SessionUserGroup.ORG_LOGS]: {
    label: t("calls.userGroups.org"),
  },
  [SessionType.CALL]: {
    label: t("analytics.types.callLogs"),
  },
  [SessionType.SIMULATION]: {
    label: t("analytics.types.simulations"),
  },
});
