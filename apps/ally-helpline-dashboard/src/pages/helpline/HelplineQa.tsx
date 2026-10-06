import { FC, useId, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import {
  useGetHelplineMonitorQuery,
  useGetHelplineQaQuery,
  useGetMyHelplineQaQuery,
} from "@api/helpline";
import { Permissions } from "@constants/permissions";
import { buildHelplineQaRoute } from "@constants/routes";
import { useUser } from "@hooks/useUser";
import type { QaListItemDto } from "@types";
import { hasPermissions } from "@utils/permission";

import { HelpTip } from "./components/HelpTip";
import {
  EmptyBox,
  LoadFailed,
  tableClass,
  tdClass,
  thClass,
  theadClass,
} from "./components/MonitorParts";

/** The server's page size for GET /qa (assumed; the contract doesn't pin it). */
const QA_PAGE_SIZE = 25;

const useDateFormat = () => {
  const { i18n } = useTranslation();
  return new Intl.DateTimeFormat(i18n.language || "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

/** "score 2.8 of 4" — the rubric's 1–4 scale, never "L1"–"L4". */
export const formatComposite = (score: number) =>
  (Math.round(score * 10) / 10).toFixed(1).replace(/\.0$/, "");

/** Supervisors: every scored chat, filterable by listener. Sorted by date, never by score. */
const SupervisorQa: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dateFormat = useDateFormat();
  const filterId = useId();
  const [listenerId, setListenerId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { permissions } = useUser();
  const canMonitor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);
  const { data, isLoading, isError, refetch } = useGetHelplineQaQuery({
    ...(listenerId !== undefined ? { listenerId } : {}),
    page,
  });
  // The listener filter's options: everyone on the roster, plus anyone already listed.
  const { data: monitor } = useGetHelplineMonitorQuery(undefined, { skip: !canMonitor });
  const options = useMemo(() => {
    const byId = new Map<number, string>();
    monitor?.listeners.forEach(listener => byId.set(listener.userId, listener.displayName));
    data?.items.forEach(item => byId.set(item.listenerId, item.listenerName));
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.items, monitor?.listeners]);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / QA_PAGE_SIZE));

  const open = (item: QaListItemDto) => navigate(buildHelplineQaRoute(item.chatId));

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor={filterId}
            className="font-primary text-xs font-medium text-typography-800"
          >
            {t("helplineWorkspace.qa.listenerFilter")}
          </label>
          <select
            id={filterId}
            value={listenerId === undefined ? "" : String(listenerId)}
            onChange={event => {
              setPage(1);
              setListenerId(event.target.value ? Number(event.target.value) : undefined);
            }}
            className="min-h-[36px] rounded-lg border border-border-medium bg-white px-2 font-primary text-sm text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <option value="">{t("helplineWorkspace.qa.allListeners")}</option>
            {options.map(option => (
              <option key={option.id} value={String(option.id)}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p role="status" className="font-primary text-sm text-typography-700">
          {t("helplineWorkspace.gate.loading")}
        </p>
      ) : isError || !data ? (
        <LoadFailed message={t("helplineWorkspace.qa.loadFailed")} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyBox testId="qa-empty">
          {listenerId !== undefined
            ? t("helplineWorkspace.qa.emptyFiltered")
            : t("helplineWorkspace.qa.emptySupervisor")}
        </EmptyBox>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border-light">
            <table className={`${tableClass} min-w-[600px]`} data-testid="qa-table">
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.qa.columns.listener")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.qa.columns.date")}
                  </th>
                  <th scope="col" className={thClass}>
                    <span className="inline-flex items-center gap-1">
                      {t("helplineWorkspace.qa.columns.overall")}
                      <HelpTip
                        label={t("helplineWorkspace.qa.overallHint")}
                        ariaLabel={t("helplineWorkspace.qa.columns.overall")}
                      />
                    </span>
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.qa.columns.notes")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(item => (
                  <tr
                    key={item.chatId}
                    className="cursor-pointer border-t border-border-light hover:bg-background-secondary"
                    onClick={() => open(item)}
                    data-testid={`qa-row-${item.chatId}`}
                  >
                    <td className={tdClass}>
                      <Link
                        to={buildHelplineQaRoute(item.chatId)}
                        onClick={event => event.stopPropagation()}
                        className="font-medium text-typography-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                      >
                        {item.listenerName}
                      </Link>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-typography-800`}>
                      {dateFormat.format(new Date(item.endedAt))}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap tabular-nums text-typography-800`}>
                      {t("helplineWorkspace.qa.scoreOf", {
                        score: formatComposite(item.compositeScore),
                      })}
                    </td>
                    <td className={`${tdClass} text-typography-800`}>
                      {item.hasUnhelpfulBehaviour ? (
                        <span
                          className="inline-flex items-center rounded-full bg-status-ochreBg px-2 py-0.5 text-xs text-status-ochreFg"
                          data-testid="qa-unhelpful-marker"
                        >
                          {t("helplineWorkspace.qa.unhelpfulMarker")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between font-primary text-sm text-typography-800">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(current => Math.max(1, current - 1))}
                className="rounded-full border border-border-medium px-3 py-1 disabled:opacity-50"
              >
                {t("helplineWorkspace.history.previous")}
              </button>
              <span>{t("helplineWorkspace.history.page", { page, pages })}</span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage(current => Math.min(pages, current + 1))}
                className="rounded-full border border-border-medium px-3 py-1 disabled:opacity-50"
              >
                {t("helplineWorkspace.history.next")}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
};

/** Listeners: their own scored chats only (GET qa/mine). */
const MyFeedback: FC = () => {
  const { t } = useTranslation();
  const dateFormat = useDateFormat();
  const { data, isLoading, isError, refetch } = useGetMyHelplineQaQuery();

  if (isLoading) {
    return (
      <p role="status" className="font-primary text-sm text-typography-700">
        {t("helplineWorkspace.gate.loading")}
      </p>
    );
  }
  if (isError || !data) {
    return (
      <LoadFailed message={t("helplineWorkspace.qa.loadFailed")} onRetry={() => void refetch()} />
    );
  }
  if (!data.items.length) {
    return <EmptyBox testId="qa-mine-empty">{t("helplineWorkspace.qa.emptyMine")}</EmptyBox>;
  }
  return (
    <ul className="flex flex-col gap-2" data-testid="qa-mine-list">
      {data.items.map(item => (
        <li key={item.chatId}>
          <Link
            to={buildHelplineQaRoute(item.chatId)}
            className="flex items-center justify-between gap-3 rounded-xl border border-border-light bg-white p-3 font-primary hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <span className="text-base text-typography-900">
              {t("helplineWorkspace.qa.chatOn", {
                date: dateFormat.format(new Date(item.endedAt)),
              })}
            </span>
            <span className="text-sm font-medium text-primary-700">
              {t("helplineWorkspace.qa.viewFeedback")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
};

/**
 * `/helpline/qa` — helping-skills feedback on finished chats. Supervisors
 * (`view:helpline:qa`) see every scored chat; a listener sees only their own
 * ("My feedback"). No leaderboard, no averages across listeners.
 */
export const HelplineQa: FC = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const isReviewer = hasPermissions(permissions, Permissions.VIEW_HELPLINE_QA);

  return (
    <div className="h-full overflow-y-auto" data-testid="helpline-qa">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5 md:px-6">
        <div>
          <h1 className="font-secondary text-2xl text-typography-900">
            {isReviewer ? t("helplineWorkspace.qa.title") : t("helplineWorkspace.qa.mineTitle")}
          </h1>
          <p className="mt-1 font-primary text-sm text-typography-700">
            {isReviewer
              ? t("helplineWorkspace.qa.introSupervisor")
              : t("helplineWorkspace.qa.introMine")}
          </p>
        </div>
        {isReviewer ? <SupervisorQa /> : <MyFeedback />}
      </div>
    </div>
  );
};

export default HelplineQa;
