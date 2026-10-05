import { useGetHelplineEnabledQuery } from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

/**
 * Text helpline workspace visibility: a helpline permission
 * (`view:helpline:lobby` for listeners, `view:helpline:monitor` for
 * supervisors) AND the tenant's TEXT_HELPLINE_ENABLED toggle, which only a
 * platform admin can turn on. Same shape as useCanViewCharacterLibrary.
 *
 * The toggle query is skipped without the permission, so most users never make
 * the request. It fails closed: an error or a missing endpoint reads as off.
 * The server is still the real gate — every listener route and the socket
 * handshake re-check both halves.
 */
export const useCanUseTextHelpline = () => {
  const { permissions } = useUser();
  const canListen = hasPermissions(permissions, Permissions.VIEW_HELPLINE_LOBBY);
  const canMonitor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);
  const hasPermission = canListen || canMonitor;

  const { data: isOrgEnabled, isLoading } = useGetHelplineEnabledQuery(undefined, {
    skip: !hasPermission,
  });

  return {
    canView: hasPermission && isOrgEnabled === true,
    /** Holds a helpline permission, whatever the org toggle says. */
    hasPermission,
    canListen,
    canMonitor,
    isLoading: hasPermission && isLoading,
  };
};
