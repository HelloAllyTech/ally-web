import { useEffect, useState, useRef, FC } from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { GenericTable, Loading, Tooltip } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import {
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetAdminSimulationLogsQuery,
  useGetCustomFieldDefinitionsQuery,
} from "@api";
import {
  NoResults,
  CallIdIcon,
  DateIcon,
  TimerIcon,
  TagsIcon,
  ReviewIcon,
  UserIcon,
  SummaryGenerationIcon,
  SessionScoreIcon,
  ScenarioIcon,
  SourceIcon,
  Delete,
  ActionsIcon,
  ScribeIcon,
} from "@assets";
import { Button, Chip, FallbackUI, PermissionGuard, TagGroup } from "@components";
import { CallProvider, Permissions } from "@constants";
import { useCustomFieldsEnabled } from "@hooks";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import {
  AdminSimulationLog,
  CallLog,
  ChatSummaryStatus,
  GetCallLogsInput,
  TagDisplay,
  SessionType,
  SimulationLog,
} from "@types";
import { convertSecondsToDuration, getFormattedDate, getSimulationScoreDisplay } from "@utils";

import { CallSummarySidebar, DeleteCallLogConfirmationDialog, SimulationSummarySidebar } from ".";
import { CALL_LOGS_PAGINATION_LIMIT, defaultTags, tagColors } from "../constants";
import ManageCustomFieldsDialog from "./custom-fields/ManageCustomFieldsDialog";
import { renderCustomFieldCell } from "./custom-fields/renderCustomFieldCell";
import { LogsTableProps } from "./types";
import {
  getSourceChipConfig,
  getStatusChipConfig,
  getModeChipConfig,
  reconcileLogsById,
  patchRowCustomFieldValues,
  DenormalizedCustomFieldValue,
} from "./utils";

const AdminLogsTable: FC<LogsTableProps> = ({ refreshKey, sessionType, className }) => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();

  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<CallLog | SimulationLog | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [deleteLogChatId, setDeleteLogChatId] = useState<number | null>(null);
  const [isManageFieldsOpen, setIsManageFieldsOpen] = useState(false);

  const { filters } = useSelector((state: RootState) => state.calls);
  const { offset } = filters;

  const isCall = sessionType === SessionType.CALL;
  const isSimulation = sessionType === SessionType.SIMULATION;
  const durationLabels = {
    lessThanOneMinute: t("calls.duration.lessThanOneMinute", "Less than 1 min"),
    hour: t("calls.duration.hour", "hr"),
    hours: t("calls.duration.hours", "hrs"),
    minute: t("calls.duration.minute", "min"),
    minutes: t("calls.duration.minutes", "mins"),
    second: t("calls.duration.second", "sec"),
    seconds: t("calls.duration.seconds", "secs"),
  };
  const { user: currentUser, permissions } = useSelector((state: RootState) => state.user);
  const canManageCustomFields = permissions?.includes(Permissions.MANAGE_CUSTOM_FIELD_DEFINITIONS);
  const { data: customFieldsEnabled } = useCustomFieldsEnabled();
  const customFieldsActive = customFieldsEnabled !== false;

  const { data: customFieldDefs = [] } = useGetCustomFieldDefinitionsQuery(undefined, {
    skip: !isCall || !customFieldsActive,
  });

  const {
    data: callLogsData,
    isLoading: isCallLogsLoading,
    refetch: refetchCallLogs,
    error: callLogsError,
  } = useGetAdminCallLogsQuery(
    { ...filters, sortBy: "createdAt", order: "DESC", archive: false },
    { skip: !isCall, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const {
    data: simulationLogsData,
    isLoading: isSimulationLogsLoading,
    refetch: refetchSimulationLogs,
  } = useGetAdminSimulationLogsQuery(
    { ...filters, sortBy: "createdAt", order: "DESC", languageCode: i18n.language },
    { skip: !isSimulation },
  );

  const { data: callLogs = [] } = callLogsData || {};
  const { data: simulationLogs = [] } = simulationLogsData || {};
  const { data: counsellorsData } = useGetCounsellorsQuery({ offset: 0 });
  const { data: tagsData } = useGetCallTagsQuery({ offset: 0 });

  const isLoading = isCall ? isCallLogsLoading : isSimulationLogsLoading;

  const tableRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({
        top: offset === 0 ? 0 : tableRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Reset data and pagination when switching session type
  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    // Reset pagination to first page
    dispatch(updateFilters({ ...filters, offset: 0 }));
  }, [sessionType]);

  // Append new logs to the list and handle hasMore for both modes
  useEffect(() => {
    const sourceLogs = isCall ? callLogs : simulationLogs;
    if (sourceLogs?.length > 0) {
      setLogs(prev => {
        // On page 0 the list is a fresh snapshot; otherwise upsert by id so a
        // refetched page replaces its rows in place (no duplicates) and edited
        // values are reflected instead of a stale copy lingering.
        if (offset === 0) return [...sourceLogs];
        return reconcileLogsById(prev, sourceLogs);
      });
      setIsLoadingMore(false);
      // If less than limit, no more data
      setHasMore(sourceLogs.length >= CALL_LOGS_PAGINATION_LIMIT);
      if (offset > 0) {
        handleScroll();
      }
    } else if (offset === 0) {
      setHasMore(false);
      setLogs([]);
    }
  }, [callLogsData, simulationLogsData, sessionType]);

  // Refetch on refreshKey for active source
  useEffect(() => {
    if (refreshKey) {
      const refetchFn = isCall ? refetchCallLogs : refetchSimulationLogs;
      refetchFn();
    }
  }, [refreshKey, isCall, refetchCallLogs, refetchSimulationLogs]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: filters?.offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  useEffect(() => {
    if (callLogsError && !isCallLogsLoading) {
      let errorMessage = "Failed to fetch call logs. Please try again.";
      // RTK Query error types
      if (typeof callLogsError === "object" && callLogsError !== null) {
        // FetchBaseQueryError: { status, data }
        if (
          "data" in callLogsError &&
          callLogsError.data &&
          typeof callLogsError.data === "object" &&
          callLogsError.data !== null &&
          "message" in callLogsError.data &&
          typeof (callLogsError.data as any).message === "string"
        ) {
          errorMessage = (callLogsError.data as any).message;
        } else if ("error" in callLogsError && typeof callLogsError.error === "string") {
          // SerializedError: { error: string }
          errorMessage = callLogsError.error;
        }
      }
      toast.error(`${errorMessage}. It can be issue with applied filters. Please try again.`);
    }
  }, [callLogsError, isCallLogsLoading]);

  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loading withOverlay={false} />
      </div>
    );
  }

  const getAdminCallDisplayData = (row: CallLog) => {
    const { details, id, counselor, startedAt } = row;
    if (details) {
      const { callInfo, callDuration, summary } = details;
      return {
        id,
        icon: <CallIdIcon />,
        callName: callInfo?.summaryName ?? "--",
        counsellorName: counselor?.name,
        dateAndTime: startedAt && getFormattedDate(startedAt, i18n.language),
        callDuration: convertSecondsToDuration(callDuration, { labels: durationLabels }),
        qualityScore: summary?.callQuality ?? 0,
        provider: callInfo?.provider,
        mode: callInfo?.mode,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        raw: row,
      };
    }
    return { id, callName: "", dateAndTime: "", provider: "--", mode: undefined, raw: row };
  };

  const customFieldColumns: Column<any>[] = customFieldDefs
    .filter(def => def.showInTable !== false)
    .map(def => ({
      key: `cf_${def.id}`,
      header: def.name,
      style: { width: "10%", minWidth: 100 },
      render: (_value: any, row: any) =>
        renderCustomFieldCell(def, row.raw?.customFieldValues ?? []),
    }));

  const callColumns: Column<any>[] = [
    {
      key: "callName",
      header: t("summary.fields.callName"),
      style: { width: "13%" },
      icon: <CallIdIcon />,
      filterable: true,
      filterType: FilterType.TEXT,
    },
    {
      key: "counsellorName",
      header: t("calls.table.counsellorName"),
      filterType: FilterType.MULTISELECT,
      style: { width: "12%" },
      icon: <UserIcon />,
      sortable: true,
      filterable: true,
      filterOptions:
        counsellorsData?.data?.map(item => ({
          label: item?.name,
          value: String(item?.id),
        })) || [],
    },
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      filterType: FilterType.DATE,
      style: { width: "13%" },
      sortable: true,
      filterable: true,
      filterOptions: [],
      icon: <DateIcon />,
    },
    {
      key: "callDuration",
      header: t("common.duration"),
      sortable: true,
      icon: <TimerIcon />,
      style: { width: "10%" },
    },
    {
      key: "mode",
      header: t("calls.table.mode", "Mode"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getModeChipConfig(row.mode, t)} />,
      icon: <ScribeIcon />,
    },
    {
      key: "tags",
      header: t("common.tags"),
      style: { width: "20%", overflow: "hidden" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
      filterType: FilterType.MULTISELECT,
      filterable: true,
      filterOptions:
        tagsData?.data?.map(item => ({
          label: item,
          value: item,
        })) || defaultTags,
    },
    {
      key: "summaryStatus",
      header: t("calls.table.summaryStatus"),
      style: { width: "12%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus, t)} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "source",
      header: t("calls.table.source"),
      style: { width: "12%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider, t)} />,
      icon: <SourceIcon />,
    },
    ...customFieldColumns,
    {
      key: "actions",
      header: t("calls.table.actions"),
      style: { width: "10%" },
      render: (_value, row) => (
        <div
          className="flex gap-2 items-center justify-start"
          data-testid={`admin-logs-actions-${row.id}`}
        >
          <Button
            onClick={() => setSummary(row.raw)}
            variant="icon"
            data-testid={`admin-logs-review-button-${row.id}`}
          >
            <ReviewIcon />
          </Button>
          {row?.provider === CallProvider.AUDIO_UPLOAD && (
            <PermissionGuard requiredPermissions={[Permissions.DELETE_CHAT]}>
              <Button
                data-testid={`admin-logs-delete-button-${row.id}`}
                onClick={() => setDeleteLogChatId(row.raw.id)}
                fullWidth={true}
                variant="icon"
              >
                <Delete className="text-destructive-400" />
              </Button>
            </PermissionGuard>
          )}
        </div>
      ),
      icon: <ActionsIcon />,
    },
    ...(isCall && customFieldsActive && canManageCustomFields
      ? [
          {
            key: "addCustomField",
            header: "",
            headerNode: (
              <Tooltip label="Add custom field" align="top">
                <button
                  type="button"
                  onClick={() => setIsManageFieldsOpen(true)}
                  className="flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-gray-400 text-gray-400 hover:border-gray-600 hover:text-gray-600 transition-colors"
                  data-testid="admin-logs-add-field-button"
                >
                  <span className="text-base leading-none">+</span>
                </button>
              </Tooltip>
            ),
            style: { width: "48px", minWidth: "48px" },
            render: () => null,
          },
        ]
      : []),
  ];

  const getAdminSimulationDisplayData = (row: AdminSimulationLog) => {
    const { id, startedAt, endedAt, score, counselor, metadata, scenario } = row || {};
    const startMs = startedAt ? new Date(startedAt).getTime() : 0;
    const endMs = endedAt ? new Date(endedAt).getTime() : 0;
    const durationSec =
      startedAt && endedAt ? Math.max(0, Math.floor((endMs - startMs) / 1000)) : 0;

    return {
      id,
      sessionId: metadata?.sessionName ?? "--",
      scenarioTitle: scenario?.title ?? "--",
      counsellorName: counselor?.name,
      dateAndTime: startedAt && getFormattedDate(startedAt, i18n.language),
      duration: convertSecondsToDuration(durationSec, { labels: durationLabels }),
      sessionScore: getSimulationScoreDisplay(score),
      raw: row,
    };
  };

  const simulationColumns: Column<any>[] = [
    {
      key: "sessionId",
      header: t("summary.fields.callId"),
      style: { width: "15%" },
      icon: <CallIdIcon />,
    },
    {
      key: "scenarioTitle",
      header: t("calls.table.scenario"),
      style: { width: "15%" },
      icon: <ScenarioIcon />,
    },
    {
      key: "counsellorName",
      header: t("calls.table.counsellorName"),
      style: { width: "15%" },
      icon: <UserIcon />,
    },
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      style: { width: "15%" },
      icon: <DateIcon />,
    },
    {
      key: "duration",
      header: t("common.duration"),
      style: { width: "15%" },
      icon: <TimerIcon />,
    },
    {
      key: "sessionScore",
      header: t("calls.table.sessionScore"),
      style: { width: "15%" },
      icon: <SessionScoreIcon />,
    },
    {
      key: "summary",
      header: t("common.summary"),
      style: { width: "10%" },
      render: (_value, row) => (
        <Button
          onClick={() => setSummary(row.raw)}
          fullWidth={true}
          variant="icon"
          data-testid={`admin-logs-simulation-review-button-${row.id}`}
        >
          <ReviewIcon />
        </Button>
      ),
      icon: <ReviewIcon />,
    },
  ];

  const displayData = isCall
    ? logs.map(getAdminCallDisplayData)
    : logs.map(getAdminSimulationDisplayData);

  const handleFilterChange = (data: any) => {
    const { filter = [], sort = {} } = data;

    // Always reset pagination
    const updatedFilters: GetCallLogsInput = {
      offset: 0,
      limit: CALL_LOGS_PAGINATION_LIMIT,
    };

    // Sorting
    if (sort.key && sort.value) {
      updatedFilters.sortBy = sort.key;
      updatedFilters.order = sort.value;
    }

    // Counsellor filter
    const counsellor = filter.find((f: { key: string }) => f.key === "counsellorName");
    if (counsellor) {
      let ids: string[] = [];
      if (Array.isArray(counsellor.value)) {
        ids = counsellor.value;
      } else {
        ids = [counsellor.value];
      }
      updatedFilters.counselorIds = ids.join(",");
    }

    // Date filter
    const date = filter.find((f: { key: string }) => f.key === "dateAndTime");
    if (date && Array.isArray(date.value) && date.value.length === 2) {
      updatedFilters.startDate = date.value[0];
      updatedFilters.endDate = date.value[1];
    }

    // Quality score filter
    const quality = filter.find((f: { key: string }) => f.key === "qualityScore");
    if (quality && typeof quality.value === "string") {
      const [min, max] = quality.value.split("-");
      if (min && max) {
        updatedFilters.minQualityScore = Number(min);
        updatedFilters.maxQualityScore = Number(max);
      }
    }

    // Tags filter
    const tags = filter.find((f: { key: string }) => f.key === "tags");
    if (tags && Array.isArray(tags.value) && tags.value.length > 0) {
      updatedFilters.tags = tags.value.join(",");
    }

    // Call Name text filter
    const callName = filter.find((f: { key: string }) => f.key === "callName");
    if (callName && typeof callName.value === "string" && callName.value.trim()) {
      updatedFilters.callName = callName.value.trim();
    }

    dispatch(updateFilters(updatedFilters));
  };

  const renderFallbackUI = () => {
    if (logs.length === 0 && !isLoading) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={
            isCall ? t("calls.fallback.callEmptyTitle") : t("calls.fallback.simEmptyTitle")
          }
          description={
            isCall ? t("calls.fallback.callEmptyDesc") : t("calls.fallback.simEmptyDesc")
          }
          className="py-[100px]"
        />
      );
    }
    return null;
  };

  const onSummarySubmit = async (newStatus?: ChatSummaryStatus) => {
    if (newStatus && (summary as CallLog)?.summaryStatus === newStatus) return;
    const chatId = summary?.id;
    const response = await refetchCallLogs();

    const selectedCallLog = response.data?.data?.find(log => log.id === chatId);
    setSummary(selectedCallLog);
  };

  const closeSummarySidebar = () => {
    setSummary(null);
  };

  // Reflect a custom-field edit on the exact row immediately, regardless of
  // which loaded page it sits on. The list only refetches the current page, so
  // relying on invalidation alone leaves rows on other pages stale.
  const handleCustomFieldValuesSaved = (chatId: number, values: DenormalizedCustomFieldValue[]) => {
    setLogs(prev => patchRowCustomFieldValues(prev, chatId, values));
  };

  const getSummarySideBar = () => {
    switch (sessionType) {
      case SessionType.CALL:
        return (
          <CallSummarySidebar
            callSummary={summary as CallLog}
            refetchCallLogs={onSummarySubmit}
            setCallSummary={setSummary}
            sessionType={sessionType}
            canEditSummary={false}
            canShowFeedback={false}
            showArchiveButton={currentUser?.id === summary?.counselorId}
            onCustomFieldValuesSaved={handleCustomFieldValuesSaved}
          />
        );
      case SessionType.SIMULATION:
        return (
          <SimulationSummarySidebar
            summaryId={summary?.id.toString()}
            closeSummarySidebar={closeSummarySidebar}
            canShowFeedback={false}
            //TODO: Remove prop drilling
            councellorName={(summary as AdminSimulationLog)?.counselor?.name}
          />
        );
    }
  };

  const onDeleteCallConfirm = async (refetch?: boolean) => {
    setDeleteLogChatId(null);
    if (refetch) refetchCallLogs();
  };

  return (
    <>
      <div
        className={"rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden"}
        data-testid="admin-logs-table-container"
      >
        <GenericTable
          ref={tableRef}
          columns={isCall ? callColumns : simulationColumns}
          data={displayData}
          isLoading={isLoading}
          showSelectedFilters={isCall}
          onFilterChange={isCall ? handleFilterChange : undefined}
          handleLoadMore={logs?.length > 0 && hasMore && handleLoadMore}
          loadMoreLabel={t("common.loadMore")}
          fallbackUI={renderFallbackUI()}
          className={`min-w-full font-secondary overflow-y-scroll text-sm text-typography-800 ${className}`}
          data-testid="admin-logs-table"
        />
      </div>
      {summary && summary.id && getSummarySideBar()}
      <DeleteCallLogConfirmationDialog
        chatId={deleteLogChatId}
        closeDialog={onDeleteCallConfirm}
        data-testid="admin-logs-delete-dialog"
      />
      <ManageCustomFieldsDialog
        open={isManageFieldsOpen}
        onClose={() => setIsManageFieldsOpen(false)}
      />
    </>
  );
};

export default AdminLogsTable;
