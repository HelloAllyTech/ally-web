import { useGetHelplineEnabledQuery } from "@api";
import { Permissions } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

const NO_CHATS: string[] = [];

/**
 * Text helpline workspace visibility: a helpline permission
 * (`view:helpline:lobby` for listeners, `view:helpline:monitor` for
 * supervisors) AND the tenant's TEXT_HELPLINE_ENABLED toggle, which only a
 * platform admin can turn on. Same shape as useCanViewCharacterLibrary.
 *
 * One exception keeps a conversation from being cut off: when the toggle goes
 * off, a listener still in ACTIVE chats keeps the workspace for those chats
 * (`continuingChatIds`, contract §5.4) — `restricted` — until they end.
 *
 * The toggle query is skipped without the permission, so most users never make
 * the request. It fails closed: an error or a missing endpoint reads as off.
 * The server is still the real gate — every listener route and the socket
 * handshake re-check both halves.
 */
export const useCanUseTextHelpline = (options: { pollingInterval?: number } = {}) => {
  const { permissions } = useUser();
  const canListen = hasPermissions(permissions, Permissions.VIEW_HELPLINE_LOBBY);
  const canMonitor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);
  const hasPermission = canListen || canMonitor;

  const { data, isLoading } = useGetHelplineEnabledQuery(undefined, {
    skip: !hasPermission,
    ...(options.pollingInterval ? { pollingInterval: options.pollingInterval } : {}),
  });
  const isOrgEnabled = data?.enabled === true;
  const continuingChatIds = (!isOrgEnabled && data?.continuingChatIds) || NO_CHATS;
  const restricted = hasPermission && !isOrgEnabled && continuingChatIds.length > 0;

  return {
    canView: hasPermission && (isOrgEnabled || restricted),
    /** Holds a helpline permission, whatever the org toggle says. */
    hasPermission,
    canListen,
    canMonitor,
    /** The toggle is off but the caller has chats to finish: only those are reachable. */
    restricted,
    continuingChatIds,
    isLoading: hasPermission && isLoading,
  };
};
