import {
  CALL_PERMISSIONS,
  Permissions,
  ROLEPLAY_LOGS_PERMISSIONS,
  SCRIBE_LOGS_PERMISSIONS,
  SESSION_LOGS_PERMISSIONS,
} from "@constants";

export const hasCallPermission = (permissions: Permissions[]) =>
  permissions?.some(permission => CALL_PERMISSIONS.includes(permission));

export const hasLearnPermission = (permissions: Permissions[]) =>
  permissions?.find(permission => permission === Permissions.EDIT_SCENARIO_SESSION);

export const hasSessionLogsPermission = (permissions: Permissions[]) =>
  permissions?.some(permission => SESSION_LOGS_PERMISSIONS.includes(permission));

export const hasScribeLogsPermission = (permissions: Permissions[]) =>
  permissions?.some(permission => SCRIBE_LOGS_PERMISSIONS.includes(permission));

export const hasRoleplayLogsPermission = (permissions: Permissions[]) =>
  permissions?.some(permission => ROLEPLAY_LOGS_PERMISSIONS.includes(permission));

export const hasReviewPermission = (permissions: Permissions[]) =>
  permissions?.some(
    permission =>
      permission === Permissions.VIEW_SIMULATION_REVIEWS ||
      permission === Permissions.VIEW_SCRIBE_REVIEWS,
  );

export const hasPermissions = (
  permissions: Permissions[] | null | undefined,
  requiredPermissions: Permissions,
) => {
  if (!permissions || !Array.isArray(permissions)) {
    return false;
  }
  return permissions.some(permission => permission === requiredPermissions);
};
