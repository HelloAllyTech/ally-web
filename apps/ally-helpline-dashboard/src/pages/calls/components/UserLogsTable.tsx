import { useEffect, useState, useRef, FC } from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { GenericTable, Loading } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import {
  useGetCallLogsQuery,
  useGetSimulationLogsQuery,
  useGetCustomFieldDefinitionsQuery,
  useGetCallTagsQuery,
} from "@api";
import {
  NoResults,
  CallIdIcon,
  DateIcon,
  TimerIcon,
  TagsIcon,
  ReviewIcon,
  SummaryGenerationIcon,
  ScenarioIcon,
  SessionScoreIcon,
  SourceIcon,
  ScribeIcon,
} from "@assets";
import { Button, Chip, TagGroup, FallbackUI } from "@components";
import { useCustomFieldsEnabled } from "@hooks";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { CallLog, ChatSummaryStatus, SimulationLog, TagDisplay, SessionType } from "@types";
import { convertSecondsToDuration, getFormattedDate, getSimulationScoreDisplay } from "@utils";

import { CALL_LOGS_PAGINATION_LIMIT, tagColors } from "../constants";
import {
  buildBuiltinFilterParams,
  BuiltinFilterParams,
  getChannelFilterOptions,
  getModeFilterOptions,
  getStatusFilterOptions,
} from "./builtinFilters";
import CallSummarySidebar from "./CallSummarySidebar";
import { buildCustomFieldColumns, buildFieldFiltersParam } from "./custom-fields/fieldFilters";
import SimulationSummarySidebar from "./SimulationSummarySidebar";
import { LogsTableProps } from "./types";
import {
  getSourceChipConfig,
  getStatusChipConfig,
  getModeChipConfig,
  reconcileLogsById,
  patchRowCustomFieldValues,
  DenormalizedCustomFieldValue,
} from "./utils";

const UserLogsTable: FC<LogsTableProps> = ({ refreshKey, sessionType, className }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  const { filters } = useSelector((state: RootState) => state.calls);

  const { offset } = filters;

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [callNameFilter, setCallNameFilter] = useState<string | undefined>(undefined);
  const [fieldFiltersParam, setFieldFiltersParam] = useState<string | undefined>(undefined);
  const [builtinParams, setBuiltinParams] = useState<BuiltinFilterParams>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<CallLog | SimulationLog>();

  const isCall = sessionType === SessionType.CALL;
  const isSimulation = sessionType === SessionType.SIMULATION;

  const { data: customFieldsEnabled } = useCustomFieldsEnabled();
  const customFieldsActive = customFieldsEnabled !== false;

  const { data: customFieldDefs = [] } = useGetCustomFieldDefinitionsQuery(undefined, {
    skip: !isCall || !customFieldsActive,
  });

  const { data: tagsData } = useGetCallTagsQuery({ offset: 0 }, { skip: !isCall });

  const durationLabels = {
    lessThanOneMinute: t("calls.duration.lessThanOneMinute", "Less than 1 min"),
    hour: t("calls.duration.hour", "hr"),
    hours: t("calls.duration.hours", "hrs"),
    minute: t("calls.duration.minute", "min"),
    minutes: t("calls.duration.minutes", "mins"),
    second: t("calls.duration.second", "sec"),
    seconds: t("calls.duration.seconds", "secs"),
  };

  const {
    data: callLogsData,
    isLoading: isCallLogsLoading,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery(
    {
      limit: CALL_LOGS_PAGINATION_LIMIT,
      offset: offset,
      archive: false,
      ...(callNameFilter ? { callName: callNameFilter } : {}),
      ...(fieldFiltersParam ? { fieldFilters: fieldFiltersParam } : {}),
      ...builtinParams,
    },
    { skip: !isCall, refetchOnFocus: true, refetchOnReconnect: true },
  );

  const {
    data: simulationLogsData,
    isLoading: isSimulationLogsLoading,
    refetch: refetchSimulationLogs,
  } = useGetSimulationLogsQuery(
    {
      limit: CALL_LOGS_PAGINATION_LIMIT,
      offset: offset,
      sortBy: "createdAt",
      order: "DESC",
      languageCode: i18n.language,
    },
    { skip: !isSimulation },
  );

  const { data: callLogs = [] } = callLogsData || {};
  const { data: simulationLogs = [] } = simulationLogsData || {};

  const isLoading = isCall ? isCallLogsLoading : isSimulationLogsLoading;

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  // Reset data when switching session type
  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    // Reset pagination to first page
    dispatch(updateFilters({ ...filters, offset: 0 }));
  }, [sessionType]);

  // Append new logs to the list and handle hasMore for both modes
  useEffect(() => {
    const sourceLogs = isCall ? callLogs : simulationLogs || [];
    if (sourceLogs?.length > 0) {
      // Only auto-scroll when this update came from an explicit "Load more".
      // A background refetch (e.g. after saving a custom field, which
      // invalidates CallLogs) must not move the user's scroll position and
      // jump them to another session.
      const triggeredByLoadMore = isLoadingMore;
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
      if (offset > 0 && triggeredByLoadMore) {
        handleScroll();
      }
    } else if (offset === 0) {
      setHasMore(false);
      setLogs([]);
    }
  }, [callLogsData, simulationLogsData, sessionType]);

  // Refetch logs when navigating or refresh is triggered
  useEffect(() => {
    if (location.state?.refetch || refreshKey) {
      if (isCall && refetchCallLogs) {
        refetchCallLogs();
      } else if (isSimulation && refetchSimulationLogs) {
        refetchSimulationLogs();
      }
    }
  }, [location, refreshKey, isCall, isSimulation, refetchCallLogs, refetchSimulationLogs]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  const handleFilterChange = (data: any) => {
    const { filter = [] } = data;
    const callName = filter.find((f: { key: string }) => f.key === "callName");
    const newCallName =
      callName && typeof callName.value === "string" && callName.value.trim()
        ? callName.value.trim()
        : undefined;
    const newFieldFilters = buildFieldFiltersParam(filter);
    const newBuiltin = buildBuiltinFilterParams(filter);
    // GenericTable fires onFilterChange on mount with an empty filter; bail
    // out when nothing actually changed so we don't wipe the loaded page.
    if (
      newCallName === callNameFilter &&
      newFieldFilters === fieldFiltersParam &&
      JSON.stringify(newBuiltin) === JSON.stringify(builtinParams)
    ) {
      return;
    }
    setCallNameFilter(newCallName);
    setFieldFiltersParam(newFieldFilters);
    setBuiltinParams(newBuiltin);
    setLogs([]);
    setHasMore(true);
    dispatch(updateFilters({ ...filters, offset: 0 }));
  };

  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100dvh-80px)]">
        <Loading withOverlay={false} />
      </div>
    );
  }

  const getCallDisplayData = (row: CallLog) => {
    const { details, id, startedAt } = row;
    if (details) {
      const { callDuration, callInfo, summary, transcript } = details;

      return {
        id,
        transcript,
        callName: callInfo?.summaryName ?? "--",
        dateAndTime: startedAt && getFormattedDate(startedAt, i18n.language),
        duration: convertSecondsToDuration(callDuration, { labels: durationLabels }),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        provider: callInfo?.provider,
        mode: callInfo?.mode,
        raw: row, // keep original row for summary action
      };
    }
    return {
      id,
      callName: "",
      dateAndTime: "",
      duration: "",
      qualityScore: 0,
      source: "--",
      tags: [],
      transcript: "",
      mode: undefined,
      raw: row,
    };
  };

  const customFieldColumns: Column<any>[] = buildCustomFieldColumns(customFieldDefs);

  const callColumns: Column<any>[] = [
    {
      key: "callName",
      header: t("summary.fields.callName"),
      style: { width: "17%" },
      icon: <CallIdIcon />,
      filterable: true,
      filterType: FilterType.TEXT,
    },
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      style: { width: "18%" },
      icon: <DateIcon />,
      filterable: true,
      filterType: FilterType.DATE,
      filterOptions: [],
    },
    {
      key: "duration",
      header: t("common.duration"),
      style: { width: "10%" },
      icon: <TimerIcon />,
      filterable: true,
      filterType: FilterType.NUMBER,
    },
    {
      key: "mode",
      header: t("calls.table.mode", "Mode"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getModeChipConfig(row.mode, t)} />,
      icon: <ScribeIcon />,
      filterable: true,
      filterType: FilterType.MULTISELECT,
      filterOptions: getModeFilterOptions(t),
    },
    {
      key: "tags",
      header: t("common.tags"),
      style: { width: "22%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
      filterable: true,
      filterType: FilterType.MULTISELECT,
      filterOptions: tagsData?.data?.map(tag => ({ label: tag, value: tag })) || [],
    },
    {
      key: "summaryStatus",
      header: t("calls.table.summaryStatus"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus, t)} />,
      icon: <SummaryGenerationIcon />,
      filterable: true,
      filterType: FilterType.MULTISELECT,
      filterOptions: getStatusFilterOptions(t),
    },
    {
      key: "source",
      header: t("calls.table.source"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider, t)} />,
      icon: <SourceIcon />,
      filterable: true,
      filterType: FilterType.MULTISELECT,
      filterOptions: getChannelFilterOptions(t),
    },
    ...customFieldColumns,
    {
      key: "summary",
      header: t("common.summary"),
      style: { width: "6%" },
      render: (_value, row) => (
        <Button
          onClick={() => setSummary(row.raw)}
          fullWidth={true}
          variant="icon"
          data-testid={`user-logs-call-review-button-${row.id}`}
        >
          <ReviewIcon />
        </Button>
      ),
      icon: <ReviewIcon />,
    },
  ];

  const getSimulationDisplayData = (row: SimulationLog) => {
    const { id, startedAt, endedAt, score, metadata, scenario } = row || {};

    const startMs = startedAt ? new Date(startedAt).getTime() : 0;
    const endMs = endedAt ? new Date(endedAt).getTime() : 0;
    const durationSec =
      startedAt && endedAt ? Math.max(0, Math.floor((endMs - startMs) / 1000)) : 0;

    return {
      id,
      sessionId: metadata?.sessionName ?? "--",
      scenarioTitle: scenario?.title ?? "--",
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
      style: { width: "20%" },
      icon: <CallIdIcon />,
    },
    {
      key: "scenarioTitle",
      header: t("calls.table.scenario"),
      style: { width: "20%" },
      icon: <ScenarioIcon />,
    },
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      style: { width: "20%" },
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
          data-testid={`user-logs-simulation-review-button-${row.id}`}
        >
          <ReviewIcon />
        </Button>
      ),
      icon: <ReviewIcon />,
    },
  ];

  const displayData = isCall ? logs.map(getCallDisplayData) : logs.map(getSimulationDisplayData);

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
    if (newStatus && "summaryStatus" in summary && summary.summaryStatus === newStatus) return;
    const chatId = summary?.id;
    const response = await refetchCallLogs();

    const selectedCallLog = response.data?.data?.find(log => log.id === chatId);
    // The refetch only covers the current page; if the edited session isn't on
    // it, keep the open summary rather than clearing the sidebar.
    if (selectedCallLog) setSummary(selectedCallLog);
  };

  // Reflect a custom-field edit on the exact row immediately, regardless of
  // which loaded page it sits on. The list only refetches the current page, so
  // relying on invalidation alone leaves rows on other pages stale.
  const handleCustomFieldValuesSaved = (chatId: number, values: DenormalizedCustomFieldValue[]) => {
    setLogs(prev => patchRowCustomFieldValues(prev, chatId, values));
  };

  const closeSummarySidebar = () => {
    setSummary(null);
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
            onCustomFieldValuesSaved={handleCustomFieldValuesSaved}
          />
        );
      case SessionType.SIMULATION:
        return (
          <SimulationSummarySidebar
            summaryId={summary?.id as string}
            closeSummarySidebar={closeSummarySidebar}
          />
        );
    }
  };

  return (
    <>
      <div
        className="rounded-xl w-full max-h-[calc(100dvh-10px)] overflow-y-hidden"
        data-testid="user-logs-table-container"
      >
        <GenericTable
          ref={tableRef}
          columns={isCall ? callColumns : simulationColumns}
          data={displayData}
          isLoading={isLoading}
          showSelectedFilters={isCall}
          handleLoadMore={logs?.length > 0 && hasMore && handleLoadMore}
          loadMoreLabel={t("common.loadMore")}
          fallbackUI={renderFallbackUI()}
          className={`min-w-full font-primary overflow-y-scroll text-sm text-typography-800 ${className}`}
          data-testid="user-logs-table"
          onFilterChange={isCall ? handleFilterChange : undefined}
        />
      </div>
      {summary && summary.id && getSummarySideBar()}
    </>
  );
};

export default UserLogsTable;
