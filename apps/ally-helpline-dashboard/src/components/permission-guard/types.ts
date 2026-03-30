import { ReactNode } from "react";

import { Permissions } from "@constants";

export interface PermissionGuardProps {
  children: ReactNode;
  requiredPermissions: Permissions[];
}
