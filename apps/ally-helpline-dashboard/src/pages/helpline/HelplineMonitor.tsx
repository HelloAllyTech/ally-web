import { FC, useState } from "react";

import { BellRing, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  useAssignHelplineChatMutation,
  useGetHelplineMeQuery,
  useGetHelplineMonitorQuery,
} from "@api/helpline";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { HELPLINE_TIMINGS } from "@constants/helpline";
import { Permissions } from "@constants/permissions";
import { buildHelplineChatRoute } from "@constants/routes";
import { useAnalytics } from "@hooks/useAnalytics";
import { useUser } from "@hooks/useUser";
import type { HelplinePresence, LobbyEntryDto, MonitorListenerDto } from "@types";
import { parseHelplineError } from "@utils/helplineErrors";
import { hasPermissions } from "@utils/permission";

import { notificationPermission, requestNotificationPermission } from "./alerts";
import { ListenerPickerDialog } from "./components/ChatActionDialogs";
import { LanguageChip, RiskBadge } from "./components/HelplineBadges";
import {
  ConnectionCell,
  EmptyBox,
  LoadFailed,
  PageSection,
  StatTile,
  tableClass,
  tdClass,
  thClass,
  theadClass,
} from "./components/MonitorParts";
import { RiskCalibration } from "./components/RiskCalibration";
import { useNow } from "./useNow";
import { assignableListeners, formatDuration, secondsSince, sortWaiting } from "./utils";

type View = "live" | "calibration";

const PRESENCE_ORDER: Record<HelplinePresence, number> = { AVAILABLE: 0, AWAY: 1, OFFLINE: 2 };

/** Who is on, grouped by status then name — a roster, never a ranking. */
const rosterOrder = (listeners: MonitorListenerDto[]) =>
  [...listeners].sort(
    (a, b) =>
      PRESENCE_ORDER[a.presence] - PRESENCE_ORDER[b.presence] ||
      a.displayName.localeCompare(b.displayName),
  );

/** Browser notifications for alerts while this tab is in the background. */
const BrowserAlertsHint: FC = () => {
  const { t } = useTranslation();
  const [permission, setPermission] = useState(notificationPermission);
  if (permission === null || permission === "granted") return null;
  if (permission === "denied") {
    return (
      <p className="font-primary text-xs text-typography-700">
        {t("helplineWorkspace.monitor.browserAlertsBlocked")}
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void requestNotificationPermission().then(setPermission)}
      className="inline-flex min-h-[36px] items-center gap-2 rounded-full border border-border-medium px-3 font-primary text-sm text-typography-900 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      <BellRing aria-hidden="true" className="h-4 w-4" />
      {t("helplineWorkspace.monitor.browserAlertsOn")}
    </button>
  );
};

const LiveView: FC<{ canAssign: boolean }> = ({ canAssign }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useAnalytics();
  const now = useNow(5000);
  const { data: me } = useGetHelplineMeQuery();
  const { data, isLoading, isError, refetch, fulfilledTimeStamp } = useGetHelplineMonitorQuery(
    undefined,
    { pollingInterval: HELPLINE_TIMINGS.MONITOR_POLL_MS, refetchOnMountOrArgChange: true },
  );
  const [assign, { isLoading: isAssigning }] = useAssignHelplineChatMutation();
  const [assigning, setAssigning] = useState<LobbyEntryDto | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <p role="status" className="font-primary text-sm text-typography-700">
        {t("helplineWorkspace.gate.loading")}
      </p>
    );
  }
  if (isError || !data) {
    return (
      <LoadFailed
        message={t("helplineWorkspace.monitor.loadFailed")}
        onRetry={() => void refetch()}
      />
    );
  }

  // The server's ages are as of the fetch; keep them ticking until the next one.
  const sinceFetch = fulfilledTimeStamp ? Math.max(0, (now - fulfilledTimeStamp) / 1000) : 0;
  const orgCap = me?.orgMaxConcurrentPerListener ?? Number.POSITIVE_INFINITY;
  const candidates = assignableListeners(data.listeners, orgCap);

  const onAssign = async (listenerId: number | undefined) => {
    if (!assigning || listenerId === undefined) return;
    setAssignError(null);
    const target = data.listeners.find(listener => listener.userId === listenerId);
    try {
      await assign({ chatId: assigning.chatId, listenerId }).unwrap();
      track(ANALYTICS_EVENTS.HELPLINE_CHAT_ASSIGNED, {
        [ANALYTICS_PROPS.HELPLINE_CHAT_ID]: assigning.chatId,
        [ANALYTICS_PROPS.HELPLINE_RISK_LEVEL]: assigning.riskLevel,
      });
      toast.success(
        t("helplineWorkspace.monitor.assign.done", { name: target?.displayName ?? "" }),
      );
      setAssigning(null);
    } catch (failure) {
      const { errorCode } = parseHelplineError(failure);
      if (errorCode === "HELPLINE_ALREADY_CLAIMED" || errorCode === "HELPLINE_CHAT_ENDED") {
        toast(t("helplineWorkspace.monitor.assign.gone"));
        setAssigning(null);
        void refetch();
        return;
      }
      setAssignError(t("helplineWorkspace.monitor.assign.failed"));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="monitor-tiles">
        <StatTile
          label={t("helplineWorkspace.monitor.tiles.waiting")}
          value={data.tiles.waiting}
          testId="tile-waiting"
        />
        <StatTile
          label={t("helplineWorkspace.monitor.tiles.active")}
          value={data.tiles.active}
          testId="tile-active"
        />
        <StatTile
          label={t("helplineWorkspace.monitor.tiles.listenersAvailable")}
          value={data.tiles.listenersAvailable}
          testId="tile-listeners"
        />
        <StatTile
          label={t("helplineWorkspace.monitor.tiles.openHighFlags")}
          value={data.tiles.openHighFlags}
          tone={data.tiles.openHighFlags > 0 ? "alarm" : "neutral"}
          icon={
            data.tiles.openHighFlags > 0 ? (
              <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
            ) : undefined
          }
          testId="tile-high-flags"
        />
      </div>

      <PageSection id="monitor-active" title={t("helplineWorkspace.monitor.activeTitle")}>
        {data.activeChats.length === 0 ? (
          <EmptyBox testId="monitor-active-empty">
            {t("helplineWorkspace.monitor.activeEmpty")}
          </EmptyBox>
        ) : (
          <div className="ph-no-capture overflow-x-auto rounded-xl border border-border-light">
            <table className={`${tableClass} min-w-[960px]`} data-testid="monitor-active-table">
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.listener")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.talker")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.duration")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.risk")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.lastMessage")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.listenerConnection")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.talkerConnection")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.transfer")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.openFlags")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.activeChats.map(chat => {
                  const lastAge =
                    chat.lastMessageAgeSeconds === null
                      ? null
                      : Math.floor(chat.lastMessageAgeSeconds + sinceFetch);
                  return (
                    <tr
                      key={chat.id}
                      className="cursor-pointer border-t border-border-light hover:bg-background-secondary"
                      onClick={() => navigate(buildHelplineChatRoute(chat.id))}
                      data-testid={`monitor-chat-${chat.id}`}
                    >
                      <td className={`${tdClass} text-typography-900`}>
                        {chat.listener?.displayName ?? "—"}
                      </td>
                      <td className={tdClass}>
                        {/* The row is clickable; this link is the keyboard way in. */}
                        <Link
                          to={buildHelplineChatRoute(chat.id)}
                          onClick={event => event.stopPropagation()}
                          className="font-medium text-typography-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {chat.talkerName}
                        </Link>
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap tabular-nums text-typography-800`}
                      >
                        {formatDuration(secondsSince(chat.claimedAt ?? chat.waitStartedAt, now), t)}
                      </td>
                      <td className={tdClass}>
                        {chat.riskLevel === "NONE" ? (
                          <span className="text-typography-700">
                            {t("helplineWorkspace.risk.NONE")}
                          </span>
                        ) : (
                          <RiskBadge level={chat.riskLevel} />
                        )}
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap tabular-nums text-typography-800`}
                      >
                        {lastAge === null
                          ? "—"
                          : t("helplineWorkspace.monitor.ago", {
                              time: formatDuration(lastAge, t),
                            })}
                      </td>
                      <td className={tdClass}>
                        <ConnectionCell connected={chat.listenerConnected} />
                      </td>
                      <td className={tdClass}>
                        <ConnectionCell connected={chat.talkerConnected} />
                      </td>
                      <td className={`${tdClass} text-typography-800`}>
                        {chat.transferPending ? t("helplineWorkspace.transfer.pendingShort") : "—"}
                      </td>
                      <td className={`${tdClass} tabular-nums text-typography-800`}>
                        {chat.openFlags > 0 ? (
                          <span className="inline-flex items-center gap-1 font-medium text-status-alarmFg">
                            <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" />
                            {chat.openFlags}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection id="monitor-waiting" title={t("helplineWorkspace.monitor.waitingTitle")}>
        {data.waiting.length === 0 ? (
          <EmptyBox testId="monitor-waiting-empty">
            {t("helplineWorkspace.lobby.emptyWaiting")}
          </EmptyBox>
        ) : (
          <div className="ph-no-capture overflow-x-auto rounded-xl border border-border-light">
            <table className={`${tableClass} min-w-[720px]`} data-testid="monitor-waiting-table">
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.talker")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.waited")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.language")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.risk")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.kind")}
                  </th>
                  <th scope="col" className={thClass}>
                    <span className="sr-only">
                      {t("helplineWorkspace.monitor.columns.actions")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortWaiting(data.waiting).map(entry => {
                  const target =
                    entry.targetListenerId !== null
                      ? data.listeners.find(listener => listener.userId === entry.targetListenerId)
                      : undefined;
                  return (
                    <tr
                      key={entry.chatId}
                      className="border-t border-border-light"
                      data-testid={`monitor-waiting-${entry.chatId}`}
                    >
                      <td className={`${tdClass} font-medium text-typography-900`}>
                        {entry.displayName}
                      </td>
                      <td
                        className={`${tdClass} whitespace-nowrap tabular-nums text-typography-800`}
                      >
                        {formatDuration(secondsSince(entry.waitStartedAt, now), t)}
                      </td>
                      <td className={tdClass}>
                        <LanguageChip code={entry.language} />
                      </td>
                      <td className={tdClass}>
                        {entry.riskLevel === "NONE" ? (
                          <span className="text-typography-700">
                            {t("helplineWorkspace.risk.NONE")}
                          </span>
                        ) : (
                          <RiskBadge level={entry.riskLevel} />
                        )}
                      </td>
                      <td className={`${tdClass} text-typography-800`}>
                        {entry.kind === "TRANSFER"
                          ? t("helplineWorkspace.lobby.transfer")
                          : t("helplineWorkspace.monitor.kindNew")}
                        {target
                          ? ` · ${t("helplineWorkspace.monitor.assignedTo", { name: target.displayName })}`
                          : ""}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {canAssign && (
                          <button
                            type="button"
                            onClick={() => {
                              setAssignError(null);
                              setAssigning(entry);
                            }}
                            className="inline-flex min-h-[36px] items-center whitespace-nowrap rounded-full border border-border-medium px-3 font-primary text-sm font-medium text-typography-900 hover:bg-background-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                          >
                            {t("helplineWorkspace.monitor.assign.action")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection id="monitor-listeners" title={t("helplineWorkspace.monitor.listenersTitle")}>
        {data.listeners.length === 0 ? (
          <EmptyBox>{t("helplineWorkspace.monitor.listenersEmpty")}</EmptyBox>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border-light">
            <table className={`${tableClass} min-w-[560px]`} data-testid="monitor-listeners-table">
              <thead className={theadClass}>
                <tr>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.listener")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.status")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.chats")}
                  </th>
                  <th scope="col" className={thClass}>
                    {t("helplineWorkspace.monitor.columns.languages")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rosterOrder(data.listeners).map(listener => (
                  <tr key={listener.userId} className="border-t border-border-light">
                    <td className={`${tdClass} text-typography-900`}>{listener.displayName}</td>
                    <td className={`${tdClass} text-typography-800`}>
                      {t(`helplineWorkspace.monitor.presence.${listener.presence}`)}
                    </td>
                    <td className={`${tdClass} tabular-nums text-typography-800`}>
                      {t("helplineWorkspace.monitor.load", {
                        active: listener.activeChatCount,
                        max: listener.maxConcurrentChats,
                      })}
                    </td>
                    <td className={tdClass}>
                      <span className="flex flex-wrap gap-1">
                        {listener.languages.map(code => (
                          <LanguageChip key={code} code={code} />
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <ListenerPickerDialog
        open={assigning !== null}
        title={t("helplineWorkspace.monitor.assign.title", {
          name: assigning?.displayName ?? "",
        })}
        body={t("helplineWorkspace.monitor.assign.body")}
        confirmLabel={t("helplineWorkspace.monitor.assign.confirm")}
        listeners={candidates}
        optional={false}
        busy={isAssigning}
        error={assignError}
        onConfirm={listenerId => void onAssign(listenerId)}
        onCancel={() => setAssigning(null)}
      />
    </div>
  );
};

/**
 * `/helpline/monitor` — supervisors (`view:helpline:monitor`). Live: tiles,
 * active chats (a row opens the chat read-only, where a supervisor can
 * whisper, transfer, take over or block), the queue with Assign to…, and who
 * is on. Risk calibration: how flags turned out. No leaderboards or
 * per-listener rankings anywhere — the roster is grouped by status, by name.
 */
export const HelplineMonitor: FC = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const [params, setParams] = useSearchParams();
  const canMonitor = hasPermissions(permissions, Permissions.VIEW_HELPLINE_MONITOR);
  const canAssign = hasPermissions(permissions, Permissions.EDIT_HELPLINE_TRANSFER);
  const view: View = params.get("view") === "calibration" ? "calibration" : "live";

  if (!canMonitor) {
    return (
      <div className="flex h-full items-center justify-center p-6" role="status">
        <p className="max-w-md text-center font-primary text-base text-typography-800">
          {t("helplineWorkspace.monitor.noAccess")}
        </p>
      </div>
    );
  }

  const views: { key: View; label: string }[] = [
    { key: "live", label: t("helplineWorkspace.monitor.views.live") },
    { key: "calibration", label: t("helplineWorkspace.monitor.views.calibration") },
  ];

  return (
    <div className="h-full overflow-y-auto" data-testid="helpline-monitor">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-secondary text-2xl text-typography-900">
              {t("helplineWorkspace.monitor.title")}
            </h1>
            <p className="mt-1 font-primary text-sm text-typography-700">
              {t("helplineWorkspace.monitor.intro")}
            </p>
          </div>
          <BrowserAlertsHint />
        </header>

        <div
          role="tablist"
          aria-label={t("helplineWorkspace.monitor.viewsLabel")}
          className="flex gap-1 border-b border-border-light"
        >
          {views.map(item => (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`monitor-tab-${item.key}`}
              aria-selected={view === item.key}
              aria-controls={`monitor-panel-${item.key}`}
              onClick={() =>
                setParams(item.key === "live" ? {} : { view: item.key }, { replace: true })
              }
              className={`-mb-px min-h-[40px] border-b-2 px-3 font-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                view === item.key
                  ? "border-primary-500 font-medium text-typography-900"
                  : "border-transparent text-typography-700 hover:text-typography-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`monitor-panel-${view}`} aria-labelledby={`monitor-tab-${view}`}>
          {view === "live" ? <LiveView canAssign={canAssign} /> : <RiskCalibration />}
        </div>
      </div>
    </div>
  );
};

export default HelplineMonitor;
