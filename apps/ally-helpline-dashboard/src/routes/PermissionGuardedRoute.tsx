import { FunctionComponent } from "react";
import { Route } from "react-router-dom";

import { useUser } from "@/hooks";
import { hasPermissionForRoute } from "@/utils/permission";

interface PermissionGuardedRouteType {
  path: string;
  element: JSX.Element;
}

const PermissionGuardedRoute: FunctionComponent<PermissionGuardedRouteType> = ({
  path,
  element,
}) => {
  const { permissions } = useUser();
  const hasPermission = hasPermissionForRoute(permissions, path);

  // TODO: add a fallback component saying no access
  return hasPermission && <Route path={path} element={element} />;
};

export default PermissionGuardedRoute;
