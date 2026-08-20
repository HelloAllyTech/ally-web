import { useGetCharacterLibraryEnabledQuery } from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

/**
 * Character Library visibility for a tenant ADMIN: the `view:scenario-character`
 * permission (granted to the ADMIN group by ally-be migration
 * 1905000000000-AddTenantScopedCharacterLibrary) AND the tenant's own
 * CHARACTER_LIBRARY_ENABLED org toggle, which only a platform admin can turn
 * on. Neither alone is enough — same reasoning as canViewOrganizationSettings,
 * which is why this isn't a plain `navBarOptions` permissions array.
 *
 * The toggle query is skipped when the base permission is already missing, so
 * most users never make this request at all.
 */
export const useCanViewCharacterLibrary = () => {
  const { permissions } = useUser();
  const hasPermission = hasPermissions(permissions, Permissions.VIEW_CHARACTER_LIBRARY);

  const { data: isOrgToggleEnabled, isLoading } = useGetCharacterLibraryEnabledQuery(undefined, {
    skip: !hasPermission,
  });

  return {
    canView: hasPermission && Boolean(isOrgToggleEnabled),
    isLoading: hasPermission && isLoading,
  };
};
