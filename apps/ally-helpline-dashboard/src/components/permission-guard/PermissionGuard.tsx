import { FC } from "react";

import { useUser } from "@hooks";

import { PermissionGuardProps } from "./types";

/**
 * Conditionally renders children when the current user possesses all permissions
 * listed in `requiredPermissions`.
 *
 * This component derives the user's permissions via `useUser()` and performs an
 * "all-of" check. If any required permission is missing, nothing is rendered.
 *
 * Example:
 * ```tsx
 * <PermissionGuard requiredPermissions={["calls:read", "calls:write"]}>
 *   <ProtectedContent />
 * </PermissionGuard>
 * ```
 */
const PermissionGuard: FC<PermissionGuardProps> = ({ children, requiredPermissions }) => {
  const { permissions } = useUser();
  const hasAccess = requiredPermissions.every(permission => permissions.includes(permission));

  return <>{hasAccess ? children : null}</>;
};

export default PermissionGuard;
