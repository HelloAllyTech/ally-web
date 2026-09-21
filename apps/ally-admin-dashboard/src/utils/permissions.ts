import { Permissions } from "@constants";

/**
 * `userPermissions` is widened to accept plain strings: the RTK Query hook types
 * this list as `Permissions[]`, but the Redux mirror (`UserState.permissions`)
 * types it as `string[]`, and both are legitimate callers of the same check.
 */
export const hasPermissions = (
  userPermissions: (Permissions | string)[],
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
