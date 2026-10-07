import { FC } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useGetHelplineChatQuery } from "@api/helpline";
import { buildHelplineChatRoute } from "@constants/routes";

import { RiskBadge } from "./HelplineBadges";

const ContinuingChatRow: FC<{ chatId: string }> = ({ chatId }) => {
  const { t } = useTranslation();
  // GET chats/:id stays open to the listener of record while switched off.
  const { data } = useGetHelplineChatQuery(chatId);
  const chat = data?.chat;
  return (
    <li>
      <Link
        to={buildHelplineChatRoute(chatId)}
        className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-white p-3 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        data-testid={`continuing-${chatId}`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="ph-no-capture min-w-0 max-w-full truncate font-primary text-base font-medium text-typography-900">
            {chat?.talker.displayName || t("helplineWorkspace.restricted.chatFallback")}
          </span>
          {chat && <RiskBadge level={chat.riskLevel} />}
        </span>
        {chat && (
          <span className="rounded-full bg-background-secondary px-2 py-0.5 font-primary text-xs text-typography-800">
            {t(`helplineWorkspace.chat.status.${chat.status}`)}
          </span>
        )}
      </Link>
    </li>
  );
};

/**
 * The lobby while the org's helpline is switched off: no queue, no presence —
 * just the chats this listener still has open, so nobody is cut off
 * mid-conversation. They stay here (and readable) after ending, for the summary.
 */
export const ContinuingChats: FC<{ chatIds: string[] }> = ({ chatIds }) => {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto" data-testid="helpline-restricted-lobby">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 md:px-6">
        <div
          role="status"
          className="rounded-xl border border-status-ochreDot bg-status-ochreBg p-4 font-primary text-status-ochreFg"
        >
          <p className="text-base font-medium">{t("helplineWorkspace.restricted.title")}</p>
          <p className="mt-1 text-sm">{t("helplineWorkspace.restricted.body")}</p>
        </div>
        <h1 className="font-primary text-lg font-medium text-typography-900">
          {t("helplineWorkspace.restricted.chatsTitle")}
        </h1>
        <ul className="flex flex-col gap-2">
          {chatIds.map(chatId => (
            <ContinuingChatRow key={chatId} chatId={chatId} />
          ))}
        </ul>
      </div>
    </div>
  );
};
