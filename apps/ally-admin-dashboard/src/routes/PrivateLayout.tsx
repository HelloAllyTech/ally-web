import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";

import { useGetUserQuery, useGetPermissionsQuery } from "@api";
import { Sidebar, AccessDenied } from "@components";
import ReportUploadProgressDialog from "@components/report-upload-progress-dialog/ReportUploadProgressDialog";
import { ScenarioReportsSocketProvider } from "@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider";
import { LOCAL_STORAGE_KEYS, ROUTES, Permissions, UserRole } from "@constants";
import { setUser, setPermissions } from "@reducer";
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

  const dispatch = useDispatch();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
    if (permissions) dispatch(setPermissions(permissions));
  }, [userData, permissions]);

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
        {/* Single scroll container for the whole app shell: main never scrolls,
            the padded wrapper is the one scroll area. A page that sets its own
            overflow fills the wrapper exactly (its scroll is the one); a tall
            page with no own overflow scrolls the wrapper — one scrollbar either way.
            `relative` makes this wrapper the containing block for absolutely-
            positioned descendants — notably Carbon's `cds--visually-hidden`
            <label>s from hideLabel Dropdowns. Without it those labels resolve
            against the initial containing block (<html>) and stretch the page
            scroll height far past the content, producing a phantom second
            scrollbar and empty white space you can scroll into below the page. */}
        <main className="flex-1 overflow-hidden">
          <div className="relative p-4 lg:p-6 h-full overflow-y-auto">
            {hasAccess ? children : <AccessDenied />}
          </div>
        </main>
        <ReportUploadProgressDialog />
      </div>
    </ScenarioReportsSocketProvider>
  );
};
