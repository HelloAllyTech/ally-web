import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";

import { useGetUserQuery, useGetPermissionsQuery } from "@api";
import { Sidebar, AccessDenied } from "@components";
import ReportUploadProgressDialog from "@components/report-upload-progress-dialog/ReportUploadProgressDialog";
import { ScenarioReportsSocketProvider } from "@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider";
import {
  LOCAL_STORAGE_KEYS,
  ROUTES,
  Permissions,
  UserRole,
  adminLoginRolesFor,
  isEmbeddedSurface,
  normalizeEmailForAllowlist,
} from "@constants";
import { setUser, setPermissions } from "@reducer";
import { hasPermissions } from "@utils";

// Roles this deployment admits at all. Fixed at build time with the surface,
// but read lazily so importing this module never depends on the constants
// barrel being complete — several test suites replace @constants wholesale.
const adminSurfaceRoles = () => adminLoginRolesFor(isEmbeddedSurface());

interface PrivateLayoutProps {
  children: React.ReactNode;
  requiredPermissions?: Permissions[];
  requiredRole?: UserRole | UserRole[];
  isPreview?: boolean;
  /**
   * Optional email allowlist (compared case-insensitively against the logged-in
   * user's email). When present, access ALSO requires an email match; absent
   * prop = no email gate (fully backward compatible).
   */
  allowedEmails?: string[];
}

export const PrivateLayout: React.FC<PrivateLayoutProps> = ({
  children,
  isPreview,
  requiredPermissions = [],
  requiredRole,
  allowedEmails,
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
  let hasAllowedEmail = true;
  let hasSurfaceAccess = true;

  if (!isUserLoading && !isPermissionsLoading) {
    hasPermission = hasPermissions(permissions, requiredPermissions);
  }

  // Role gating is independent of permissions: routes can require a specific
  // role (e.g. SUPER_ADMIN) — or any one of a set of roles (e.g. the super-admin
  // tier: [SUPER_ADMIN, SUPER_DUPER_ADMIN]) — regardless of the permission set.
  // Routes that pass no requiredRole stay backward compatible (hasRole stays true).
  if (!isUserLoading) {
    hasRole =
      !requiredRole ||
      (Array.isArray(requiredRole)
        ? requiredRole.includes(userData?.role as UserRole)
        : userData?.role === requiredRole);
  }

  // Email allowlist gating (e.g. Roleplay Studio rollout). Case-insensitive and
  // +tag-tolerant (a +tag sub-address matches its base email, via
  // normalizeEmailForAllowlist); only applies when the route passes an allowlist.
  if (!isUserLoading && allowedEmails) {
    const userEmail = normalizeEmailForAllowlist(userData?.email);
    hasAllowedEmail = Boolean(
      userEmail && allowedEmails.some(allowed => normalizeEmailForAllowlist(allowed) === userEmail),
    );
  }

  // Whole-console gate, independent of any individual route. Login already
  // filters on the same list, but the embedded surface can also be entered by
  // adopting the consumer app's session (see adoptConsumerSession) — which any
  // signed-in consumer user has. Without this, an ordinary learner who typed
  // /admin would land in the console shell and meet an empty sidebar and a
  // wall of 403s instead of a straight answer.
  if (!isUserLoading && userData) {
    hasSurfaceAccess = adminSurfaceRoles().includes(userData.role as UserRole);
  }

  const hasAccess = hasPermission && hasRole && hasAllowedEmail && hasSurfaceAccess;

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
