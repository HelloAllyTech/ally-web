import { FC, useState } from "react";

import { UserRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  useClaimHelplineChatMutation,
  useGetHelplineLobbyQuery,
  useGetHelplineMeQuery,
} from "@api/helpline";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { Permissions } from "@constants/permissions";
import { buildHelplineChatRoute } from "@constants/routes";
import { useAnalytics } from "@hooks/useAnalytics";
import { useUser } from "@hooks/useUser";
import type { LobbyEntryDto } from "@types";
import { parseHelplineError } from "@utils/helplineErrors";
import { hasPermissions } from "@utils/permission";

import { ListenerProfileDrawer } from "./components/ListenerProfileDrawer";
import { MyChatsList } from "./components/MyChatsList";
import { PresenceSwitch } from "./components/PresenceSwitch";
import { WaitingList } from "./components/WaitingList";
import { secondsSince } from "./utils";

/**
 * `/helpline` — presence, who is waiting (most urgent first), and my open
 * chats. Claiming is a race the server settles atomically; losing it is
 * normal and gets a plain toast, not an error screen.
 */
export const HelplineLobby: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const { permissions } = useUser();
  const { data: me, refetch: refetchMe } = useGetHelplineMeQuery();
  const { data: lobby, isLoading, isError, refetch } = useGetHelplineLobbyQuery();
  const [claim] = useClaimHelplineChatMutation();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const canClaim = hasPermissions(permissions, Permissions.EDIT_HELPLINE_CLAIM);
  const canEditPresence = hasPermissions(permissions, Permissions.EDIT_HELPLINE_PRESENCE);

  const onClaim = async (entry: LobbyEntryDto) => {
    setClaimingId(entry.chatId);
    try {
      await claim(entry.chatId).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_CHAT_CLAIMED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: entry.chatId,
        [ANALYTICS_PROPS.HELPLINE_RISK_LEVEL]: entry.riskLevel,
        [ANALYTICS_PROPS.HELPLINE_WAIT_SECONDS]: secondsSince(entry.waitStartedAt),
      });
      navigate(buildHelplineChatRoute(entry.chatId));
    } catch (error) {
      const { errorCode } = parseHelplineError(error);
      if (errorCode === "HELPLINE_ALREADY_CLAIMED") {
        toast(t("helplineWorkspace.lobby.alreadyClaimed"));
        void refetch();
      } else if (errorCode === "HELPLINE_AT_CAPACITY") {
        toast(t("helplineWorkspace.lobby.atCapacity"));
        void refetchMe();
      } else if (errorCode === "HELPLINE_NOT_AVAILABLE") {
        toast(t("helplineWorkspace.lobby.notAvailable"));
        void refetchMe();
      } else {
        toast.error(t("helplineWorkspace.lobby.claimFailed"));
      }
    } finally {
      setClaimingId(null);
    }
  };

  if (!me) return null;
  const isAway = me.presence !== "AVAILABLE";
  const waiting = lobby?.waiting ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-5 md:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-secondary text-2xl text-typography-900">
              {t("helplineWorkspace.lobby.title")}
            </h1>
            {lobby && (
              <p className="mt-1 font-primary text-sm text-typography-700">
                {t("helplineWorkspace.lobby.waitingCount", { count: lobby.counts.waiting })}
                {" · "}
                {t("helplineWorkspace.lobby.listenersAvailable", {
                  count: lobby.counts.listenersAvailable,
                })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-2 self-start rounded-full border border-border-medium px-4 font-primary text-sm text-typography-900 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <UserRound aria-hidden="true" className="h-4 w-4" />
            {t("helplineWorkspace.lobby.profileButton")}
          </button>
        </header>

        <PresenceSwitch me={me} canEdit={canEditPresence} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-labelledby="helpline-waiting-heading" className="flex flex-col gap-3">
            <h2
              id="helpline-waiting-heading"
              className="font-primary text-lg font-medium text-typography-900"
            >
              {t("helplineWorkspace.lobby.waitingTitle")}
            </h2>
            {isLoading ? (
              <p className="font-primary text-sm text-typography-700" role="status">
                {t("helplineWorkspace.gate.loading")}
              </p>
            ) : isError ? (
              <div className="flex items-center gap-3 font-primary text-sm text-typography-800">
                {t("helplineWorkspace.gate.loadFailed")}
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-full border border-border-medium px-3 py-1 hover:bg-background-secondary"
                >
                  {t("helplineWorkspace.gate.retry")}
                </button>
              </div>
            ) : waiting.length === 0 ? (
              <p
                className="rounded-xl border border-dashed border-border-medium p-6 text-center font-primary text-base text-typography-700"
                data-testid="lobby-empty"
              >
                {isAway
                  ? t("helplineWorkspace.lobby.awayEmpty")
                  : t("helplineWorkspace.lobby.emptyWaiting")}
              </p>
            ) : (
              <>
                {isAway && (
                  <p
                    className="font-primary text-sm text-typography-700"
                    data-testid="lobby-away-hint"
                  >
                    {t("helplineWorkspace.lobby.awayEmpty")}
                  </p>
                )}
                <WaitingList
                  entries={waiting}
                  me={me}
                  canClaim={canClaim}
                  claimingId={claimingId}
                  onClaim={entry => void onClaim(entry)}
                />
              </>
            )}
          </section>

          <section aria-labelledby="helpline-mychats-heading" className="flex flex-col gap-3">
            <h2
              id="helpline-mychats-heading"
              className="font-primary text-lg font-medium text-typography-900"
            >
              {t("helplineWorkspace.lobby.myChatsTitle")}
            </h2>
            <MyChatsList chats={lobby?.myChats ?? []} />
          </section>
        </div>
      </div>

      <ListenerProfileDrawer
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        me={me}
        canEdit={canEditPresence}
      />
    </div>
  );
};

export default HelplineLobby;
