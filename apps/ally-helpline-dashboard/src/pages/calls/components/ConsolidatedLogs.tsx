import { useEffect, useState, useRef, FC } from "react";

import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import {
  useGetAdminCallLogsQuery,
  useGetCounsellorsQuery,
  useGetCallTagsQuery,
  useGetAdminSimulationLogsQuery,
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
} from "@assets";
import { Button, Chip, FallbackUI, PermissionGuard, TagGroup } from "@components";
import { CallProvider, Permissions } from "@constants";
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
import { LogsTableProps } from "./types";
import { getSourceChipConfig, getStatusChipConfig } from "./utils";

// TODO: Rename to AdminCallLogsTable
const ConsolidatedLogs: FC<LogsTableProps> = ({ refreshKey, sessionType }) => {
  const dispatch = useDispatch();

  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<CallLog | SimulationLog | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [deleteLogChatId, setDeleteLogChatId] = useState<number | null>(null);

  const { filters } = useSelector((state: RootState) => state.calls);
  const { offset } = filters;

  const isCall = sessionType === SessionType.CALL;
  const isSimulation = sessionType === SessionType.SIMULATION;

  const {
    data: callLogsData,
    isLoading: isCallLogsLoading,
    refetch: refetchCallLogs,
    error: callLogsError,
  } = useGetAdminCallLogsQuery(
    { ...filters, sortBy: "createdAt", order: "DESC" },
    { skip: !isCall },
  );

  const {
    data: simulationLogsData,
    isLoading: isSimulationLogsLoading,
    refetch: refetchSimulationLogs,
  } = useGetAdminSimulationLogsQuery(
    { ...filters, sortBy: "createdAt", order: "DESC" },
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
        // Avoid duplicate entries if page is reset
        if (offset === 0) return [...sourceLogs];
        return [...prev, ...sourceLogs];
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
        <CircularProgress />
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
        dateAndTime: startedAt && getFormattedDate(startedAt),
        callDuration: convertSecondsToDuration(callDuration),
        qualityScore: summary?.callQuality ?? 0,
        provider: callInfo?.provider,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        raw: row,
      };
    }
    return { id, callName: "", dateAndTime: "", provider: "--", raw: row };
  };

  const callColumns: Column<any>[] = [
    {
      key: "callName",
      header: "Session ID",
      style: { width: "15%" },
      icon: <CallIdIcon />,
    },
    {
      key: "counsellorName",
      header: "Counsellor Name",
      filterType: FilterType.MULTISELECT,
      style: { width: "15%" },
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
      header: "Date & Time",
      filterType: FilterType.DATE,
      style: { width: "15%" },
      sortable: true,
      filterable: true,
      filterOptions: [],
      icon: <DateIcon />,
    },
    {
      key: "callDuration",
      header: "Duration",
      sortable: true,
      icon: <TimerIcon />,
      style: { width: "15%" },
    },
    {
      key: "tags",
      header: "Tags",
      style: { width: "30%", overflow: "hidden" },
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
      header: "Summary Status",
      style: { width: "16%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus)} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "source",
      header: "Source",
      style: { width: "16%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider)} />,
      icon: <SourceIcon />,
    },
    {
      key: "actions",
      header: "Action(s)",
      style: { width: "10%" },
      render: (_value, row) => (
        <div className="flex gap-2 items-center justify-start">
          <Button onClick={() => setSummary(row.raw)} variant="icon">
            <ReviewIcon />
          </Button>
          {row?.provider === CallProvider.AUDIO_UPLOAD && (
            <PermissionGuard requiredPermissions={[Permissions.DELETE_CHAT]}>
              <Button
                onClick={() => setDeleteLogChatId(row.raw.id)}
                fullWidth={true}
                variant="icon"
              >
                <Delete className="text-[#F93535]" />
              </Button>
            </PermissionGuard>
          )}
        </div>
      ),
      icon: <ActionsIcon />,
    },
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
      dateAndTime: startedAt && getFormattedDate(startedAt),
      duration: convertSecondsToDuration(durationSec),
      sessionScore: getSimulationScoreDisplay(score),
      raw: row,
    };
  };

  const simulationColumns: Column<any>[] = [
    {
      key: "sessionId",
      header: "Session ID",
      style: { width: "15%" },
      icon: <CallIdIcon />,
    },
    {
      key: "scenarioTitle",
      header: "Scenario",
      style: { width: "15%" },
      icon: <ScenarioIcon />,
    },
    {
      key: "counsellorName",
      header: "Counsellor Name",
      style: { width: "15%" },
      icon: <UserIcon />,
    },
    {
      key: "dateAndTime",
      header: "Date & Time",
      style: { width: "15%" },
      icon: <DateIcon />,
    },
    {
      key: "duration",
      header: "Duration",
      style: { width: "15%" },
      icon: <TimerIcon />,
    },
    {
      key: "sessionScore",
      header: "Session score",
      style: { width: "15%" },
      icon: <SessionScoreIcon />,
    },
    {
      key: "summary",
      header: "Summary",
      style: { width: "10%" },
      render: (_value, row) => (
        <Button onClick={() => setSummary(row.raw)} fullWidth={true} variant="icon">
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

    dispatch(updateFilters(updatedFilters));
  };

  const renderFallbackUI = () => {
    if (logs.length === 0 && !isLoading) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={isCall ? "No call records found" : "No simulation records found"}
          description={
            isCall
              ? "Your recent calls and insights will be listed here."
              : "Your recent simulations will be listed here."
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

  const getSummarySideBar = () => {
    switch (sessionType) {
      case SessionType.CALL:
        return (
          <CallSummarySidebar
            callSummary={summary as CallLog}
            refetchCallLogs={onSummarySubmit}
            setCallSummary={setSummary}
            sessionType={sessionType}
          />
        );
      case SessionType.SIMULATION:
        return (
          <SimulationSummarySidebar
            summaryId={summary?.id.toString()}
            summaryName={(summary as SimulationLog)?.metadata?.sessionName ?? ""}
            closeSummarySidebar={closeSummarySidebar}
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
      <div className={"rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden"}>
        <GenericTable
          ref={tableRef}
          columns={isCall ? callColumns : simulationColumns}
          data={displayData}
          isLoading={isLoading}
          showSelectedFilters={isCall}
          onFilterChange={isCall ? handleFilterChange : undefined}
          handleLoadMore={logs?.length > 0 && hasMore && handleLoadMore}
          fallbackUI={renderFallbackUI()}
          className="min-w-full max-h-[calc(100vh-200px)] font-['ReplayPro'] overflow-y-scroll"
        />
      </div>
      {summary && summary.id && getSummarySideBar()}
      <DeleteCallLogConfirmationDialog chatId={deleteLogChatId} closeDialog={onDeleteCallConfirm} />
    </>
  );
};

export default ConsolidatedLogs;
