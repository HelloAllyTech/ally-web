import { Permissions } from "@constants";

export const hasPermissions = (
  userPermissions: Permissions[],
  requiredPermissions: Permissions[] = [],
) =>
  !requiredPermissions.length ||
  requiredPermissions.some(permission => userPermissions?.includes(permission));

/**
 * The one replacement for every isSuperAdminRole/isSuperDuperAdminRole call
 * site being converted to per-user feature toggles. `features` defaults to an
 * empty array so a not-yet-loaded/missing toggle list fails closed rather than
 * throwing.
 */
export const hasFeature = (features: string[] = [], key: string): boolean => features.includes(key);
