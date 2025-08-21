import { useEffect, useState, useRef, FC } from "react";

import { CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

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
} from "@assets";
import { Button, TagGroup, FallbackUI, SummaryStatusChip } from "@components";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { CallLog, TagDisplay } from "@types";
import { convertSecondsToDuration, getFormattedDate } from "@utils";

import { SummarySideBar } from ".";
import { CALL_LOGS_PAGINATION_LIMIT, tagColors } from "../constants";
import { LogsTableProps } from "./types";

const CallLogsTable: FC<LogsTableProps> = ({ refreshKey }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  const { filters } = useSelector((state: RootState) => state.calls);

  const { offset } = filters;

  const [callSummary, setCallSummary] = useState<CallLog | null>(null);

  const {
    data: callLogsData,
    isLoading,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery({
    limit: CALL_LOGS_PAGINATION_LIMIT,
    offset: offset,
  });

  const { data: callLogs = [] } = callLogsData || {};

  const [callLogList, setCallLogList] = useState<CallLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  // Append new callLogs to the list and handle hasMore
  useEffect(() => {
    if (callLogs?.length > 0) {
      setCallLogList(prev => {
        // Avoid duplicate entries if page is reset
        if (offset === 0) return [...callLogs];
        return [...prev, ...callLogs];
      });
      setIsLoadingMore(false);
      // If less than limit, no more data
      if (!callLogs.length || callLogs.length < CALL_LOGS_PAGINATION_LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      // Only scroll when loading more data (pagination), not when refetching
      if (offset > 0) {
        handleScroll();
      }
    }
  }, [callLogsData]);

  // Refetch call logs when navigating from PostCallSummary
  useEffect(() => {
    if (location.state?.refetch || refreshKey) {
      refetchCallLogs();
    }
  }, [location, refetchCallLogs, refreshKey]);

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

  const getCounsellorDisplayData = (row: CallLog) => {
    const { details, id } = row;
    if (details) {
      const { callDuration, callInfo, startTime, summary, transcript } = details;

      return {
        id,
        transcript,
        callName: callInfo?.summaryName ?? "--",
        dateAndTime: startTime && getFormattedDate(startTime),
        duration: convertSecondsToDuration(callDuration),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        raw: row, // keep original row for summary action
      };
    }
    return {
      id,
      callName: "",
      dateAndTime: "",
      duration: "",
      qualityScore: 0,
      tags: [],
      transcript: "",
      raw: row,
    };
  };

  const columns: Column<any>[] = [
    {
      key: "callName",
      header: "Session ID",
      style: { width: "15%" },
      icon: <CallIdIcon />,
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
      key: "tags",
      header: "Tags",
      style: { width: "30%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
    },
    {
      key: "summaryStatus",
      header: "Summary Status",
      style: { width: "10%" },
      render: (_value, row) => <SummaryStatusChip status={row.raw.summaryStatus} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "summary",
      header: "Summary",
      style: { width: "10%" },
      render: (_value, row) => {
        const isSummaryNull = row.raw.details?.summary === null;
        return (
          <Button
            disabled={isSummaryNull}
            onClick={() => setCallSummary(row.raw)}
            fullWidth={true}
            variant="icon"
          >
            <ReviewIcon />
          </Button>
        );
      },
      icon: <ReviewIcon />,
    },
  ];

  const displayData = callLogList.map(getCounsellorDisplayData);

  const renderFallbackUI = () => {
    if (callLogList.length === 0 && !isLoading) {
      return (
        <FallbackUI
          image={<NoResults />}
          mainMessage="No call records found"
          description="Your recent calls and insights will be listed here."
          className="py-[100px]"
        />
      );
    }
    return null;
  };

  const onSummarySubmit = async () => {
    const chatId = callSummary?.id;
    const response = await refetchCallLogs();

    const selectedCallLog = response.data?.data?.find(log => log.id === chatId);
    setCallSummary(selectedCallLog);
  };

  return (
    <>
      <div className="rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden">
        <GenericTable
          ref={tableRef}
          columns={columns}
          data={displayData}
          isLoading={isLoading}
          handleLoadMore={callLogList?.length > 0 && hasMore && handleLoadMore}
          fallbackUI={renderFallbackUI()}
          className="min-w-full max-h-[calc(100vh-140px)] font-['IBM_Plex_Serif'] overflow-y-scroll"
        />
      </div>
      {callSummary && callSummary?.id && (
        <SummarySideBar
          callSummary={callSummary}
          refetchCallLogs={onSummarySubmit}
          setCallSummary={setCallSummary}
        />
      )}
    </>
  );
};

export default CallLogsTable;
