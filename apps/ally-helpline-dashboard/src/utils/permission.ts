import { ROUTE_PERMISSIONS, TAB_PERMISSIONS } from "@/constants/permissions";

export const hasPermissionForRoute = (permissions: string[], route: string) => {
  const permissionForRoute = ROUTE_PERMISSIONS[route];
  return permissions.includes(permissionForRoute);
};

export const hasPermissionForTab = (permissions: string[], tab: string) => {
  const permissionForTab = TAB_PERMISSIONS[tab];
  return permissions.includes(permissionForTab);
};
