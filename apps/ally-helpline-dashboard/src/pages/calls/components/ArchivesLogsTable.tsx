import { useEffect, useState, useRef, FC } from "react";

import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { Column } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { useGetCallLogsQuery } from "@api";
import {
  NoResults,
  CallIdIcon,
  DateIcon,
  TimerIcon,
  TagsIcon,
  ReviewIcon,
  SummaryGenerationIcon,
  SourceIcon,
} from "@assets";
import { Button, Chip, TagGroup, FallbackUI } from "@components";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { CallLog, ChatSummaryStatus, SessionType, TagDisplay } from "@types";
import { convertSecondsToDuration, getFormattedDate } from "@utils";

import { CALL_LOGS_PAGINATION_LIMIT, tagColors } from "../constants";
import CallSummarySidebar from "./CallSummarySidebar";
import { ArchivesLogsTableProps } from "./types";
import { getSourceChipConfig, getStatusChipConfig } from "./utils";

const ArchivesLogsTable: FC<ArchivesLogsTableProps> = ({ className, refreshKey }) => {
  const dispatch = useDispatch();

  const { filters } = useSelector((state: RootState) => state.calls);

  const { offset } = filters;

  const [logs, setLogs] = useState<CallLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const [summary, setSummary] = useState<CallLog>();

  const {
    data: callLogsData,
    isLoading: isCallLogsLoading,
    isFetching: isCallLogsFetching,
    isError: isCallLogsError,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery(
    {
      limit: CALL_LOGS_PAGINATION_LIMIT,
      offset: offset,
      archive: true,
    },
    { skip: false },
  );

  const { data: callLogs = [], count = 0 } = callLogsData || {};

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    dispatch(updateFilters({ ...filters, offset: 0 }));
  }, []);

  useEffect(() => {
    if (refreshKey && refetchCallLogs) {
      refetchCallLogs();
    }
  }, [refreshKey, refetchCallLogs]);

  useEffect(() => {
    if (callLogs?.length > 0) {
      setLogs(prev => {
        if (offset === 0) return [...callLogs];
        return [...prev, ...callLogs];
      });
      setIsLoadingMore(false);
      setHasMore(offset + callLogs.length < count);
      if (offset > 0) {
        handleScroll();
      }
    } else if (offset === 0) {
      setHasMore(false);
      setLogs([]);
    } else {
      setHasMore(false);
      setIsLoadingMore(false);
    }
  }, [callLogsData]);

  const handleLoadMore = () => {
    const isLoading = isCallLogsLoading || isCallLogsFetching;
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  const isLoading = isCallLogsLoading || isCallLogsFetching;

  // Show loading state
  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <CircularProgress />
      </div>
    );
  }

  if (isCallLogsError && !isCallLogsLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <FallbackUI
          icon={<NoResults />}
          mainMessage="Failed to load archived calls"
          description="Something went wrong while loading archived calls. Please try again."
          button={{
            text: "Try Again",
            onClick: () => refetchCallLogs?.(),
          }}
        />
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
      header: "Session ID",
      style: { width: "17%" },
      icon: <CallIdIcon />,
    },
    {
      key: "dateAndTime",
      header: "Date & Time",
      style: { width: "20%" },
      icon: <DateIcon />,
    },
    {
      key: "duration",
      header: "Duration",
      style: { width: "12%" },
      icon: <TimerIcon />,
    },
    {
      key: "tags",
      header: "Tags",
      style: { width: "20%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
    },
    {
      key: "summaryStatus",
      header: "Summary Status",
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus)} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "source",
      header: "Source",
      style: { width: "10%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider)} />,
      icon: <SourceIcon />,
    },
    {
      key: "summary",
      header: "Summary",
      style: { width: "6%" },
      render: (_value, row) => (
        <Button
          onClick={() => setSummary(row.raw)}
          fullWidth={true}
          variant="icon"
          data-testid={`archives-logs-call-review-button-${row.id}`}
        >
          <ReviewIcon />
        </Button>
      ),
      icon: <ReviewIcon />,
    },
  ];

  const displayData = logs.map(getCallDisplayData);

  const renderFallbackUI = () => {
    if (logs.length === 0 && !isLoading) {
      return (
        <FallbackUI
          icon={<NoResults />}
          mainMessage="No archived call records found"
          description="Your archived calls will be listed here."
          className="py-[100px]"
        />
      );
    }
    return null;
  };

  const onSummarySubmit = async (newStatus?: ChatSummaryStatus) => {
    if (newStatus && summary && summary.summaryStatus === newStatus) return;
    const chatId = summary?.id;
    if (refetchCallLogs) {
      const result = await refetchCallLogs();
      const refetchedLogs = result?.data?.data || [];
      const selectedCallLog = refetchedLogs.find((log: CallLog) => log.id === chatId);
      if (selectedCallLog) {
        setSummary(selectedCallLog);
      }
    }
  };

  const getSummarySideBar = () => {
    if (!summary) return null;
    return (
      <CallSummarySidebar
        callSummary={summary}
        refetchCallLogs={onSummarySubmit}
        setCallSummary={setSummary}
        sessionType={SessionType.CALL}
      />
    );
  };

  return (
    <>
      <div
        className="rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden"
        data-testid="archives-logs-table-container"
      >
        <GenericTable
          ref={tableRef}
          columns={callColumns}
          data={displayData}
          isLoading={isLoading}
          handleLoadMore={logs?.length > 0 && hasMore ? handleLoadMore : undefined}
          fallbackUI={renderFallbackUI()}
          className={`min-w-full font-primary overflow-y-scroll text-sm text-typography-800 ${className}`}
          data-testid="archives-logs-table"
        />
      </div>
      {summary && summary.id && getSummarySideBar()}
    </>
  );
};

export default ArchivesLogsTable;
