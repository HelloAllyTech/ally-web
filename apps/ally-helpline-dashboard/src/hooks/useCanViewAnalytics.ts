import { useGetDashboardsQuery } from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

/**
 * Statistics tab visibility.
 *
 * The `view:analytics:dashboard` permission says the user is *allowed* to see
 * analytics; it does not say their tenant has any. Most tenants have no
 * Metabase dashboard registered at all, so a permission-only gate put a
 * Statistics tab in front of them whose only content was "no dashboards are
 * available yet — contact your administrator". Same trap as Progress and
 * Character Library, which is why this isn't a plain `navBarOptions`
 * permissions array.
 *
 * So the permission is necessary but not sufficient: there also has to be
 * something to render, which mirrors exactly what the page itself would show
 * as tabs — a registered dashboard of any type, or the native Organization
 * Metrics view, which needs no Metabase dashboard at all.
 *
 * The dashboards query takes no argument, so the nav and the page resolve to
 * one RTK Query cache entry and one request; it is skipped entirely when the
 * base permission is missing.
 */
export const useCanViewAnalytics = () => {
  const { user, permissions } = useUser();
  const hasPermission = !!user && hasPermissions(permissions, Permissions.VIEW_ANALYTICS_DASHBOARD);

  // GA'd for every tenant admin: this view is built from our own tables, so it
  // renders for a tenant that has never had a Metabase dashboard registered.
  const canViewNativeOrgMetrics = hasPermissions(
    permissions,
    Permissions.VIEW_ORGANIZATION_METRICS,
  );

  const { data: dashboards, isLoading } = useGetDashboardsQuery(undefined, {
    // Nothing the query returns can change the answer once org metrics are
    // available, so don't spend the request.
    skip: !hasPermission || canViewNativeOrgMetrics,
  });

  const hasDashboards = !!dashboards?.length;

  return {
    canView: hasPermission && (canViewNativeOrgMetrics || hasDashboards),
    // Still resolving whether this tenant has anything to show — callers render
    // nothing rather than flashing a tab that is about to disappear.
    isGateLoading: hasPermission && !canViewNativeOrgMetrics && isLoading,
  };
};
