import { PERMISSION_ROUTE_MAP } from "@constants";

export const hasPermissions = (route: string, userPermissions: string[]) => {
  return PERMISSION_ROUTE_MAP[route]?.some(permission => userPermissions?.includes(permission));
};
