import { createContext, useContext, useMemo } from "react";

import { useGetHelplineMeQuery } from "@api/helpline";
import { useUser } from "@hooks/useUser";
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
 * Stand-in for `GET /me` while restricted, for a server that refuses it: the
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
 * The listener's `GET /me`. While restricted it is asked for like any other
 * time — the server serves it to a listener with continuing chats even with
 * the org switched off, and it carries what the chat view needs (the
 * escalation checklist, the support contact, the summary fields). Only if it
 * fails (a server that still refuses it with HELPLINE_DISABLED, or an outage)
 * does a restricted session fall back to a stand-in, so a chat that must be
 * finished is never blocked on a settings call.
 */
export const useHelplineMe = () => {
  const { restricted, continuingChatIds } = useHelplineAccess();
  const query = useGetHelplineMeQuery();
  const { user } = useUser();
  const userId = Number(user?.id ?? 0);
  const fallback = useMemo(
    () => restrictedMe(userId, continuingChatIds.length),
    [userId, continuingChatIds.length],
  );
  return restricted && !query.data && query.isError ? { ...query, data: fallback } : query;
};
