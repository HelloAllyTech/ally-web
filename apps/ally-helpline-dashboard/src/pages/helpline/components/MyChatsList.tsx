import { FC } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { buildHelplineChatRoute } from "@constants/routes";
import type { ChatListItemDto } from "@types";

import { LanguageChip, RiskBadge } from "./HelplineBadges";
import { useNow } from "../useNow";
import { formatDuration, secondsSince } from "../utils";

export const MyChatsList: FC<{ chats: ChatListItemDto[] }> = ({ chats }) => {
  const { t } = useTranslation();
  const now = useNow(15_000);

  if (!chats.length) {
    return (
      <p className="font-primary text-sm text-typography-700">
        {t("helplineWorkspace.lobby.myChatsEmpty")}
      </p>
    );
  }

  return (
    <ul className="ph-no-capture flex flex-col gap-2" data-testid="my-chats">
      {chats.map(chat => {
        const unread = chat.unreadForMe ?? 0;
        return (
          <li key={chat.id}>
            <Link
              to={buildHelplineChatRoute(chat.id)}
              className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-white p-3 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-primary text-base font-medium text-typography-900">
                    {chat.talkerName}
                  </span>
                  <LanguageChip code={chat.language} />
                  <RiskBadge level={chat.riskLevel} />
                </div>
                {chat.lastMessageAt && (
                  <p className="mt-0.5 font-primary text-sm text-typography-700">
                    {t("helplineWorkspace.lobby.lastMessage", {
                      time: formatDuration(secondsSince(chat.lastMessageAt, now), t),
                    })}
                  </p>
                )}
              </div>
              {unread > 0 && (
                <span className="inline-flex min-w-[24px] items-center justify-center rounded-full bg-primary-500 px-2 py-0.5 font-primary text-xs font-medium text-white">
                  {t("helplineWorkspace.lobby.unread", { count: unread })}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
