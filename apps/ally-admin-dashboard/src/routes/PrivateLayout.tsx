import React, { useEffect } from "react";

import { useDispatch } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import {
  useGetUserQuery,
  useGetPermissionsQuery,
  useGetFeatureTogglesQuery,
  useGetCharacterLibraryEnabledQuery,
} from "@api";
import { Sidebar, AccessDenied, ErrorBoundary } from "@components";
import ReportUploadProgressDialog from "@components/report-upload-progress-dialog/ReportUploadProgressDialog";
import { ScenarioReportsSocketProvider } from "@components/scenario-reports-socket-provider/ScenarioReportsSocketProvider";
import {
  LOCAL_STORAGE_KEYS,
  ROUTES,
  OrgToggle,
  Permissions,
  en,
  normalizeEmailForAllowlist,
} from "@constants";
import { setUser, setPermissions, setFeatures } from "@reducer";
import { hasPermissions, hasFeature } from "@utils";

interface PrivateLayoutProps {
  children: React.ReactNode;
  requiredPermissions?: Permissions[];
  /**
   * Feature-toggle key(s) that also grant this route — checked via
   * `hasFeature`. A route that passes none stays backward compatible
   * (`hasRequiredFeature` defaults to pass-through).
   */
  requiredFeature?: string | string[];
  /**
   * Second grant path, alongside `requiredFeature`: the caller's ORG has the
   * feature switched on. Per-user feature toggles only exist for platform
   * admins, so this is how a tenant's own admins reach a surface built for
   * Ally staff. Always pair it with `requiredPermissions` — the org switch
   * says the feature is on for the org, the permission says this user may
   * use it.
   */
  requiredOrgToggle?: OrgToggle;
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
  requiredFeature,
  requiredOrgToggle,
  allowedEmails,
}) => {
  const isAuthenticated =
    localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_IS_AUTHENTICATED) === "true";

  const { data: userData, isLoading: isUserLoading } = useGetUserQuery();
  const { data: permissions, isLoading: isPermissionsLoading } = useGetPermissionsQuery();
  const { data: features, isLoading: isFeaturesLoading } = useGetFeatureTogglesQuery();
  // One request per org toggle, skipped entirely on routes that don't ask for
  // one — which is every route but the Character Library today.
  const { data: isCharacterLibraryOrgEnabled, isLoading: isOrgToggleLoading } =
    useGetCharacterLibraryEnabledQuery(undefined, {
      skip: requiredOrgToggle !== OrgToggle.CHARACTER_LIBRARY,
    });

  const dispatch = useDispatch();
  // Only used to reset the crash barrier below: React Router reuses this
  // element position across routes, so without a per-route key a page that
  // crashed would keep showing its error panel on the next page you opened.
  const { pathname } = useLocation();

  useEffect(() => {
    if (userData) dispatch(setUser(userData));
    if (permissions) dispatch(setPermissions(permissions));
    if (features) dispatch(setFeatures(features));
  }, [userData, permissions, features]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Check if user has permission to access current route
  let hasPermission = true;
  let hasRequiredFeature = true;
  let hasOrgToggle = false;
  let hasAllowedEmail = true;

  if (!isUserLoading && !isPermissionsLoading) {
    hasPermission = hasPermissions(permissions, requiredPermissions);
  }

  // Feature-toggle gating. `features` defaults to `[]` while still loading or
  // on a genuine fetch error, so `hasFeature` fails CLOSED in both cases — this
  // must never read as "endpoint doesn't exist, treat as pass".
  if (!requiredFeature) {
    hasRequiredFeature = true;
  } else if (isFeaturesLoading) {
    hasRequiredFeature = false;
  } else {
    const requiredFeatureKeys = Array.isArray(requiredFeature)
      ? requiredFeature
      : [requiredFeature];
    hasRequiredFeature = requiredFeatureKeys.some(key => hasFeature(features, key));
  }

  // Org-toggle gating. Fails CLOSED while loading and on a fetch error, same as
  // the per-user toggles above — the feature check is the escape hatch for a
  // platform admin, so a slow or failed org read can never be the thing that
  // grants access.
  if (requiredOrgToggle === OrgToggle.CHARACTER_LIBRARY) {
    hasOrgToggle = !isOrgToggleLoading && isCharacterLibraryOrgEnabled === true;
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

  const hasAccess = hasPermission && (hasRequiredFeature || hasOrgToggle) && hasAllowedEmail;

  // Every gate used to read as identical generic copy on AccessDenied. Order
  // matters here roughly by how "fixable by the viewer" each cause is: an
  // allowlist miss and a missing permission are both dead ends for this
  // account specifically, while the feature/org-toggle pair failing together
  // usually means the surface just isn't turned on yet.
  const accessDeniedReason = !hasAccess
    ? !hasPermission
      ? en.accessDenied.reasonMissingPermission
      : !hasAllowedEmail
        ? en.accessDenied.reasonNotAllowlisted
        : en.accessDenied.reasonMissingRoleOrToggle
    : undefined;

  // The preview routes render bare, with no shell to preserve — but a crash
  // there used to blank the page just the same, so they get the barrier too.
  if (hasAccess && isPreview) return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>;

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
          {/* The barrier sits inside the shell, not around it: a page that
              throws during render should cost the admin that page, not the
              sidebar, the nav and their way out of it. */}
          <div className="relative p-4 lg:p-6 h-full overflow-y-auto">
            <ErrorBoundary resetKey={pathname}>
              {hasAccess ? (
                children
              ) : (
                <AccessDenied
                  reason={accessDeniedReason}
                  nextStep={en.accessDenied.nextStepContactAdmin}
                />
              )}
            </ErrorBoundary>
          </div>
        </main>
        <ReportUploadProgressDialog />
      </div>
    </ScenarioReportsSocketProvider>
  );
};
