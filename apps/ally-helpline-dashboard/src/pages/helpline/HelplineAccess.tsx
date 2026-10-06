import { createContext, useContext, useMemo } from "react";

import { useSelector } from "react-redux";

import { helplineAPI, useGetHelplineMeQuery } from "@api/helpline";
import { useUser } from "@hooks/useUser";
import type { RootState } from "@store";
import type { HelplineMeDto } from "@types";

/**
 * How much of the workspace this session may use. `restricted`: the org's
 * helpline was switched off while the caller still had ACTIVE chats, so only
 * those (`continuingChatIds`) stay reachable until they end (contract §5.4).
 * Provided by HelplineLayout; the default is the normal, unrestricted
 * workspace, so a page rendered on its own behaves as before.
 */
export interface HelplineAccess {
  restricted: boolean;
  continuingChatIds: string[];
}

const HelplineAccessContext = createContext<HelplineAccess>({
  restricted: false,
  continuingChatIds: [],
});

export const HelplineAccessProvider = HelplineAccessContext.Provider;

export const useHelplineAccess = () => useContext(HelplineAccessContext);

/**
 * Stand-in for `GET /me` while restricted, when the server refuses it: the
 * caller's id, no org settings (the chat view falls back where it needs them),
 * and every copilot feature reported on, so nothing claims the org turned it
 * off.
 */
const restrictedMe = (userId: number, activeChatCount: number): HelplineMeDto => ({
  userId,
  profile: { displayName: "", maxConcurrentChats: 1, languages: [], notificationsEnabled: false },
  presence: "AWAY",
  activeChatCount,
  orgMaxConcurrentPerListener: 1,
  settings: {
    escalationChecklist: [],
    listenerSupportContact: null,
    summaryFields: [],
    copilot: { suggestions: true, nudges: true, riskClassifier: true },
    languages: [],
    idleEndMinutes: 0,
  },
});

/**
 * The listener's `GET /me`, or — while restricted, when that route answers
 * HELPLINE_DISABLED — whatever this session last loaded, else a stand-in.
 */
export const useHelplineMe = () => {
  const { restricted, continuingChatIds } = useHelplineAccess();
  const query = useGetHelplineMeQuery(undefined, { skip: restricted });
  const cached = useSelector(
    (state: RootState) => helplineAPI.endpoints.getHelplineMe.select()(state).data,
  );
  const { user } = useUser();
  const userId = Number(user?.id ?? 0);
  const fallback = useMemo(
    () => restrictedMe(userId, continuingChatIds.length),
    [userId, continuingChatIds.length],
  );
  return restricted ? { ...query, data: cached ?? fallback } : query;
};
