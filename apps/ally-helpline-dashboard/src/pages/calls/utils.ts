import { TFunction } from "i18next";

import { Permissions } from "@constants";

import { getSessionLogsMap, sessionLogViewList } from "./constants";

export const getPermittedSessionLogList = (permissions?: Permissions[]) => {
  if (!permissions) return [];
  return sessionLogViewList.filter(option =>
    option.permissionList?.some(permission => permissions.includes(permission as Permissions)),
  );
};

export const getFormattedSupportedSessionUserGroups = (
  logViewList: { sessionUserGroup: string }[],
  t: TFunction,
) => {
  const logsMap = getSessionLogsMap(t);
  return logViewList
    .filter(
      (item, index, arr) =>
        arr.findIndex(x => x.sessionUserGroup === item.sessionUserGroup) === index,
    )
    ?.map(listItem => ({
      id: listItem.sessionUserGroup,
      label: logsMap[listItem.sessionUserGroup].label,
    }));
};

export const getSupportedSessionTypeListByUserGroup = (
  logViewList: { sessionUserGroup: string; sessionType: string }[],
  selectedUserGroup: string,
  t: TFunction,
) => {
  const logsMap = getSessionLogsMap(t);
  return logViewList
    ?.filter(listItem => listItem?.sessionUserGroup === selectedUserGroup)
    ?.map(item => ({
      value: item.sessionType,
      label: logsMap[item.sessionType].label,
    }));
};
