import { PERMISSION_ROUTE_MAP } from "@constants";

// TODO: Update logic for param based route matching
export const hasPermissions = (route: string, userPermissions: string[]) => {
  return PERMISSION_ROUTE_MAP[route]?.some(permission => userPermissions?.includes(permission));
};
