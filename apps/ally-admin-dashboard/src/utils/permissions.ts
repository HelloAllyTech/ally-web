import { Permissions } from "@constants";

export const hasPermissions = (
  userPermissions: Permissions[],
  requiredPermissions: Permissions[] = [],
) =>
  !requiredPermissions.length ||
  requiredPermissions.some(permission => userPermissions?.includes(permission));
