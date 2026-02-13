import { useEffect, useState, useRef, FC } from "react";

import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { Column } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { useGetCallLogsQuery, useGetSimulationLogsQuery } from "@api";
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
} from "@assets";
import { Button, Chip, TagGroup, FallbackUI } from "@components";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { CallLog, ChatSummaryStatus, SimulationLog, TagDisplay, SessionType } from "@types";
import { convertSecondsToDuration, getFormattedDate, getSimulationScoreDisplay } from "@utils";

import { CALL_LOGS_PAGINATION_LIMIT, tagColors } from "../constants";
import CallSummarySidebar from "./CallSummarySidebar";
import SimulationSummarySidebar from "./SimulationSummarySidebar";
import { LogsTableProps } from "./types";
import { getSourceChipConfig, getStatusChipConfig } from "./utils";
import { useTranslation } from "react-i18next";

const UserLogsTable: FC<LogsTableProps> = ({ refreshKey, sessionType, className }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();

  const { filters } = useSelector((state: RootState) => state.calls);

  const { offset } = filters;

  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<CallLog | SimulationLog>();

  const isCall = sessionType === SessionType.CALL;
  const isSimulation = sessionType === SessionType.SIMULATION;

  const {
    data: callLogsData,
    isLoading: isCallLogsLoading,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery(
    {
      limit: CALL_LOGS_PAGINATION_LIMIT,
      offset: offset,
      archive: false,
    },
    { skip: !isCall },
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

  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <CircularProgress />
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
        dateAndTime: startedAt && getFormattedDate(startedAt),
        duration: convertSecondsToDuration(callDuration),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        provider: callInfo?.provider,
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
      raw: row,
    };
  };

  const callColumns: Column<any>[] = [
    {
      key: "callName",
      header: t("calls.table.sessionId"),
      style: { width: "17%" },
      icon: <CallIdIcon />,
    },
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      style: { width: "20%" },
      icon: <DateIcon />,
    },
    {
      key: "duration",
      header: t("calls.table.duration"),
      style: { width: "12%" },
      icon: <TimerIcon />,
    },
    {
      key: "tags",
      header: t("calls.table.tags"),
      style: { width: "25%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
    },
    {
      key: "summaryStatus",
      header: t("calls.table.summaryStatus"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus)} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "source",
      header: t("calls.table.source"),
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider)} />,
      icon: <SourceIcon />,
    },
    {
      key: "summary",
      header: t("calls.table.summary"),
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
      dateAndTime: startedAt && getFormattedDate(startedAt),
      duration: convertSecondsToDuration(durationSec),
      sessionScore: getSimulationScoreDisplay(score),
      raw: row,
    };
  };

  const simulationColumns: Column<any>[] = [
    {
      key: "sessionId",
      header: t("calls.table.sessionId"),
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
      header: t("calls.table.duration"),
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
      header: t("calls.table.summary"),
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
            summaryId={summary?.id as string}
            closeSummarySidebar={closeSummarySidebar}
          />
        );
    }
  };

  return (
    <>
      <div
        className="rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden"
        data-testid="user-logs-table-container"
      >
        <GenericTable
          ref={tableRef}
          columns={isCall ? callColumns : simulationColumns}
          data={displayData}
          isLoading={isLoading}
          handleLoadMore={logs?.length > 0 && hasMore && handleLoadMore}
          fallbackUI={renderFallbackUI()}
          className={`min-w-full font-primary overflow-y-scroll text-sm text-typography-800 ${className}`}
          data-testid="user-logs-table"
        />
      </div>
      {summary && summary.id && getSummarySideBar()}
    </>
  );
};

export default UserLogsTable;
