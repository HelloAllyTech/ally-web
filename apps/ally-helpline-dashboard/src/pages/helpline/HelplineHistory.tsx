import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { useGetHelplineChatsQuery, useGetMyHelplineQaQuery } from "@api/helpline";
import { buildHelplineChatRoute, buildHelplineQaRoute } from "@constants/routes";
import type { ChatListItemDto } from "@types";

import { RiskBadge } from "./components/HelplineBadges";
import { formatDuration } from "./utils";

const PAGE_SIZE = 25;

const KNOWN_REASONS = [
  "LISTENER_ENDED",
  "TALKER_ENDED",
  "TALKER_LEFT_QUEUE",
  "TALKER_DISCONNECTED",
  "WAIT_EXPIRED",
  "QUEUE_ABANDONED",
  "SUPERVISOR_ENDED",
  "TALKER_ERASED",
  "TALKER_BLOCKED",
];

const durationSeconds = (chat: ChatListItemDto) => {
  const start = Date.parse(chat.claimedAt ?? chat.waitStartedAt);
  const end = Date.parse(chat.endedAt ?? "");
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return Math.max(0, Math.round((end - start) / 1000));
};

/** `/helpline/history` — my ended chats; a row opens the read-only chat view. */
export const HelplineHistory: FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetHelplineChatsQuery({
    scope: "mine",
    status: "ENDED",
    page,
    limit: PAGE_SIZE,
  });
  // Chats with helping-skills feedback get a link to it (GET qa/mine — my own only).
  const { data: myQa } = useGetMyHelplineQaQuery();
  const scored = new Set((myQa?.items ?? []).map(item => item.chatId));
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const dateFormat = new Intl.DateTimeFormat(i18n.language || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const open = (chat: ChatListItemDto) => navigate(buildHelplineChatRoute(chat.id));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 md:px-6">
        <div>
          <h1 className="font-secondary text-2xl text-typography-900">
            {t("helplineWorkspace.history.title")}
          </h1>
          <p className="mt-1 font-primary text-sm text-typography-700">
            {t("helplineWorkspace.history.intro")}
          </p>
        </div>

        {isLoading ? (
          <p role="status" className="font-primary text-sm text-typography-700">
            {t("helplineWorkspace.gate.loading")}
          </p>
        ) : isError ? (
          <div className="flex flex-wrap items-center gap-3 font-primary text-sm text-typography-800">
            {t("helplineWorkspace.history.loadFailed")}
            <button
              type="button"
              onClick={() => void refetch()}
              className="min-h-[40px] rounded-full border border-border-medium px-3 py-1 hover:bg-background-secondary md:min-h-0"
            >
              {t("helplineWorkspace.gate.retry")}
            </button>
          </div>
        ) : !data?.items.length ? (
          <p className="rounded-xl border border-dashed border-border-medium p-6 text-center font-primary text-base text-typography-700">
            {t("helplineWorkspace.history.empty")}
          </p>
        ) : (
          <>
            <div className="ph-no-capture relative overflow-x-auto rounded-xl border border-border-light">
              <table
                className="w-full min-w-[720px] border-collapse font-primary text-sm"
                data-testid="history-table"
              >
                <thead className="bg-background-secondary text-left text-xs text-typography-700">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.talker")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.date")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.duration")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.risk")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.reason")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.erased")}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t("helplineWorkspace.history.columns.feedback")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map(chat => {
                    const seconds = durationSeconds(chat);
                    const reason =
                      chat.endedReason && KNOWN_REASONS.includes(chat.endedReason)
                        ? chat.endedReason
                        : "unknown";
                    return (
                      <tr
                        key={chat.id}
                        className="cursor-pointer border-t border-border-light hover:bg-background-secondary"
                        onClick={() => open(chat)}
                      >
                        <td className="px-3 py-2">
                          {/* The row is clickable; this link is the keyboard/screen-reader way in. */}
                          <a
                            href={buildHelplineChatRoute(chat.id)}
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              open(chat);
                            }}
                            className="font-medium text-typography-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {chat.talkerName}
                          </a>
                        </td>
                        <td className="px-3 py-2 text-typography-800">
                          {chat.endedAt ? dateFormat.format(new Date(chat.endedAt)) : "—"}
                        </td>
                        <td className="px-3 py-2 text-typography-800">
                          {seconds === null ? "—" : formatDuration(seconds, t)}
                        </td>
                        <td className="px-3 py-2">
                          {chat.riskLevel === "NONE" ? (
                            <span className="text-typography-700">
                              {t("helplineWorkspace.risk.NONE")}
                            </span>
                          ) : (
                            <RiskBadge level={chat.riskLevel} />
                          )}
                        </td>
                        <td className="px-3 py-2 text-typography-800">
                          {t(`helplineWorkspace.endedReason.${reason}`)}
                        </td>
                        <td className="px-3 py-2 text-typography-800">
                          {chat.erased
                            ? t("helplineWorkspace.history.erased")
                            : t("helplineWorkspace.history.kept")}
                        </td>
                        <td className="px-3 py-2">
                          {scored.has(chat.id) ? (
                            <Link
                              to={buildHelplineQaRoute(chat.id)}
                              onClick={event => event.stopPropagation()}
                              className="whitespace-nowrap font-medium text-typography-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                              data-testid={`history-feedback-${chat.id}`}
                            >
                              {t("helplineWorkspace.qa.viewFeedback")}
                            </Link>
                          ) : (
                            <span className="text-typography-700">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="flex items-center justify-between font-primary text-sm text-typography-800">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  className="min-h-[40px] rounded-full border border-border-medium px-3 py-1 disabled:opacity-50 md:min-h-0"
                >
                  {t("helplineWorkspace.history.previous")}
                </button>
                <span>{t("helplineWorkspace.history.page", { page, pages })}</span>
                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() => setPage(current => Math.min(pages, current + 1))}
                  className="min-h-[40px] rounded-full border border-border-medium px-3 py-1 disabled:opacity-50 md:min-h-0"
                >
                  {t("helplineWorkspace.history.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HelplineHistory;
