import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";

import { useGetUserQuery, useGetPermissionsQuery, useGetUserPreferencesQuery } from "@api";
import { Sidebar, AccessDenied } from "@components";
import ReportUploadProgressDialog from "@components/report-upload-progress-dialog/ReportUploadProgressDialog";
import { ScenarioReportsSocketProvider } from "@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider";
import { LOCAL_STORAGE_KEYS, ROUTES, Permissions, UserRole } from "@constants";
import { setUser, setPermissions, setPreferences } from "@reducer";
import { hasPermissions } from "@utils";

interface PrivateLayoutProps {
  children: React.ReactNode;
  requiredPermissions?: Permissions[];
  requiredRole?: UserRole;
  isPreview?: boolean;
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({
  children,
  isPreview,
  requiredPermissions = [],
  requiredRole,
}) => {
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();
  const { data: permissions, isLoading: isPermissionsLoading } = useGetPermissionsQuery();
  // Restore saved preferences (e.g. sidebar order) on refresh. Not part of the
  // loading gate below: roles without view:user:preferences get a 403, leaving
  // `userPreferences` undefined, and the layout simply falls back to defaults.
  const { data: userPreferences } = useGetUserPreferencesQuery();

  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
    if (permissions) dispatch(setPermissions(permissions));
    if (userPreferences) dispatch(setPreferences(userPreferences));
  }, [userData, permissions, userPreferences]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check if user has permission to access current route
  let hasPermission = true;
  let hasRole = true;

  if (!isUserLoading && !isPermissionsLoading) {
    hasPermission = hasPermissions(permissions, requiredPermissions);
  }

  // Role gating is independent of permissions: routes can require a specific
  // role (e.g. SUPER_ADMIN) regardless of the permission set. Routes that pass
  // no requiredRole stay backward compatible (hasRole stays true).
  if (!isUserLoading) {
    hasRole = !requiredRole || userData?.role === requiredRole;
  }

  const hasAccess = hasPermission && hasRole;

  if (hasAccess && isPreview) return children;

  return (
    <ScenarioReportsSocketProvider>
      <div className="flex h-screen bg-white">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6 h-[100vh] overflow-y-hidden">
            {hasAccess ? children : <AccessDenied />}
          </div>
        </main>
        <ReportUploadProgressDialog />
      </div>
    </ScenarioReportsSocketProvider>
  );
};
