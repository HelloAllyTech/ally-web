import { FunctionComponent } from "react";

import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { AccessDenied } from "@pages";

interface PermissionGuardedRouteType {
  permission: Permissions;
  element: JSX.Element;
}

const PermissionGuardedRoute: FunctionComponent<PermissionGuardedRouteType> = ({
  permission,
  element,
}) => {
  const { permissions } = useUser();

  return !permission || permissions?.includes(permission) ? element : <AccessDenied />;
};

export default PermissionGuardedRoute;
