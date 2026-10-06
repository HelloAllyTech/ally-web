import { FC, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Outlet, useMatch } from "react-router-dom";

import { useGetHelplineMeQuery } from "@api/helpline";
import { ROUTES } from "@constants/routes";
import { useCanUseTextHelpline } from "@hooks/useCanUseTextHelpline";
import { parseHelplineError } from "@utils/helplineErrors";

import { HelplineSubNav } from "./components/HelplineSubNav";
import { HelplineAccessProvider } from "./HelplineAccess";
import { HelplineRealtimeProvider } from "./realtime/HelplineRealtimeProvider";
// Not from @pages: the barrel re-exports this page, so importing it here would be a cycle.
import { AccessDenied } from "../access-denied/AccessDenied";

const CenteredMessage: FC<{ title?: string; body: string; action?: React.ReactNode }> = ({
  title,
  body,
  action,
}) => (
  <div className="flex h-full items-center justify-center p-6" role="status">
    <div className="max-w-md text-center font-primary">
      {title && <h1 className="text-xl font-medium text-typography-900">{title}</h1>}
      <p className="mt-2 text-base text-typography-800">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  </div>
);

/** While restricted, check every 30 s whether the helpline is back on or a chat has ended. */
const RESTRICTED_POLL_MS = 30_000;

/**
 * The gate and the shell for every /helpline route. The nav tab already hides
 * the workspace without a helpline permission AND the org toggle; this repeats
 * the check so a typed URL can't reach it, and treats the server's 403
 * `HELPLINE_DISABLED` the same way (the server is the real gate).
 *
 * Switching the helpline off never cuts a listener off mid-conversation: with
 * `continuingChatIds` the workspace stays up, restricted to those chats.
 */
export const HelplineLayout: FC = () => {
  const { t } = useTranslation();
  const [pollingInterval, setPollingInterval] = useState(0);
  const {
    canView,
    hasPermission,
    isLoading,
    restricted: serverRestricted,
    continuingChatIds,
  } = useCanUseTextHelpline({ pollingInterval });
  const onLobby = useMatch({ path: ROUTES.HELPLINE, end: true });
  const onChat = useMatch(ROUTES.HELPLINE_CHAT);

  // A chat that was continuing stays reachable for the rest of the session
  // even after it ends and leaves the server's list — the listener may still
  // be reviewing its summary (the server keeps it readable for 60 minutes).
  const isOrgOn = canView && !serverRestricted;
  const [seen, setSeen] = useState<string[]>([]);
  const continuing = useMemo(
    () => (isOrgOn ? [] : [...new Set([...seen, ...continuingChatIds])]),
    [continuingChatIds, isOrgOn, seen],
  );
  useEffect(() => {
    setSeen(current => {
      if (isOrgOn) return current.length ? [] : current;
      return continuing.length === current.length ? current : continuing;
    });
  }, [continuing, isOrgOn]);
  const isOrgOff = hasPermission && !isLoading && !isOrgOn;
  const restricted = isOrgOff && continuing.length > 0;
  useEffect(() => setPollingInterval(restricted ? RESTRICTED_POLL_MS : 0), [restricted]);
  const access = useMemo(
    () => ({ restricted, continuingChatIds: continuing }),
    [continuing, restricted],
  );

  const {
    data: me,
    error,
    isLoading: isMeLoading,
    refetch,
  } = useGetHelplineMeQuery(undefined, { skip: !canView || restricted });

  if (!hasPermission) return <AccessDenied />;
  if (isLoading || (canView && !restricted && isMeLoading)) {
    return <CenteredMessage body={t("helplineWorkspace.gate.loading")} />;
  }

  // Switched off with chats still open: only the lobby (which lists them) and
  // those chats; the rest of the workspace says why it's unavailable.
  if (restricted) {
    return (
      <HelplineAccessProvider value={access}>
        <HelplineRealtimeProvider enabled>
          <div
            className="flex h-full min-h-0 flex-col bg-white"
            data-testid="helpline-workspace"
            data-restricted="true"
          >
            <HelplineSubNav />
            <div className="min-h-0 flex-1">
              {onLobby || onChat ? (
                <Outlet />
              ) : (
                <CenteredMessage
                  title={t("helplineWorkspace.restricted.title")}
                  body={t("helplineWorkspace.restricted.elsewhere")}
                />
              )}
            </div>
          </div>
        </HelplineRealtimeProvider>
      </HelplineAccessProvider>
    );
  }

  const disabledByServer = parseHelplineError(error).errorCode === "HELPLINE_DISABLED";
  if (!canView || isOrgOff || disabledByServer) {
    return (
      <CenteredMessage
        title={t("helplineWorkspace.gate.disabledTitle")}
        body={t("helplineWorkspace.gate.disabledBody")}
      />
    );
  }
  if (!me) {
    return (
      <CenteredMessage
        body={t("helplineWorkspace.gate.loadFailed")}
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-[40px] rounded-full border border-border-medium px-4 font-primary text-sm text-typography-900 hover:bg-background-secondary"
          >
            {t("helplineWorkspace.gate.retry")}
          </button>
        }
      />
    );
  }

  return (
    <HelplineAccessProvider value={access}>
      <HelplineRealtimeProvider enabled>
        <div className="flex h-full min-h-0 flex-col bg-white" data-testid="helpline-workspace">
          <HelplineSubNav />
          <div className="min-h-0 flex-1">
            {/* Pages read the listener's profile from the same (cached) GET /me query. */}
            <Outlet />
          </div>
        </div>
      </HelplineRealtimeProvider>
    </HelplineAccessProvider>
  );
};

export default HelplineLayout;
