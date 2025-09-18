import { FC } from "react";

import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { AccessDenied } from "@pages";

interface PermissionGuardedRouteType {
  permission: Permissions[];
  element: JSX.Element;
}

const PermissionGuardedRoute: FC<PermissionGuardedRouteType> = ({ permission, element }) => {
  const { permissions, user } = useUser();
  // Expecting permission guarded route to work only if user is present
  if (!user) return null;

  return !permission || permissions?.some(item => permission.includes(item as Permissions)) ? (
    element
  ) : (
    <AccessDenied />
  );
};

export default PermissionGuardedRoute;
