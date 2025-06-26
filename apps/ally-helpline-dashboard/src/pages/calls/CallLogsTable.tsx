import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { Eye } from "lucide-react";

import { RootState } from "@/store/store";
import { updatePage, updateTotalCallsCount } from "@/reducer/callsReducer";
import { useGetCallLogsQuery } from "@/api/calls";
import { Button, FallbackUI } from "@/components";
import { NoResults } from "@/assets/icons";
import { CallLog } from "@/types/calls";

import SummarySideBar from "./components/SummarySideBar";
import { convertSecondsToDuration, formatDate } from "./utils";
import {
  CALL_LOGS_PAGINATION_LIMIT,
  TABLE_ROW_HEIGHT,
  tagColors,
} from "./constants";
import { TagDisplay } from "./types";
import { GenericTable, Pagination } from "@ally-ui-mono/ui-shared";
import { Column } from "@ally-ui-mono/ui-shared/lib/generic-table/types";

const CallLogsTable = () => {
  const dispatch = useDispatch();

  const {
    filters: { page },
    totalCallsCount,
  } = useSelector((state: RootState) => state.calls);

  const [transition, setTransition] = useState(true);
  const [callSummary, setCallSummary] = useState<CallLog | null>(null);

  const {
    data: callLogsData,
    isLoading,
    refetch: refetchCallLogs,
  } = useGetCallLogsQuery({
    limit: CALL_LOGS_PAGINATION_LIMIT,
    offset: page * CALL_LOGS_PAGINATION_LIMIT - CALL_LOGS_PAGINATION_LIMIT,
  });

  const { count, data: callLogs = [] } = callLogsData || {};

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setTransition(false);
      }, 100);
    }
  }, [isLoading]);

  useEffect(() => {
    dispatch(updateTotalCallsCount(count));
  }, [count]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100%_-_80px)]">
        <CircularProgress />
      </div>
    );
  }

  const getDisplayData = (row: CallLog) => {
    const { details, id } = row;
    if (details) {
      const { callDuration, callInfo, startTime, summary, transcript } = details;

      return {
        id,
        transcript,
        callName: callInfo?.summaryName,
        dateAndTime: formatDate(startTime),
        duration: convertSecondsToDuration(callDuration ?? 60),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map(
          (tag: { tag: string; positivity_rating: number }) => {
            return {
              label: tag?.tag,
              colors: tagColors[tag?.positivity_rating],
            };
          },
        ),
        raw: row, // keep original row for review action
      };
    }
    return { id, callName: "", dateAndTime: "", duration: "", qualityScore: 0, tags: [], transcript: "", raw: row };
  };

  const columns: Column<any>[] = [
    {
      key: "callName",
      header: "Call ID",
      style: { width: "15%" },
    },
    {
      key: "dateAndTime",
      header: "Date & Time",
      style: { width: "15%" },
    },
    {
      key: "duration",
      header: "Duration",
      style: { width: "15%" },
    },
    {
      key: "qualityScore",
      header: "Quality Score",
      style: { width: "15%" },
      render: (value, row) => {
        // row is displayData
        return (
          <div className="flex items-center gap-3">
            <label>{value}</label>
            <div className="flex gap-1 w-32 h-1">
              <div
                style={{
                  width: `${(value / 100) * 128}px`,
                }}
                className="w-0 transition-all duration-300 border-[2px] border-[#6272FF] rounded-md"
              />
              <div
                style={{
                  width: `${((100 - value) / 100) * 128}px`,
                }}
                className="w-full transition-all duration-300 border-[2px] border-t-[#E6F2FF] rounded-md"
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "tags",
      header: "Tags",
      style: { width: "30%" },
      render: (value: TagDisplay[]) => (
        <div className="flex gap-1 flex-wrap max-w-full overflow-hidden">
          {value?.map((tag: TagDisplay) => (
            <div
              key={tag.label}
              style={{
                backgroundColor: tag?.colors?.bg,
                color: tag?.colors?.text,
              }}
              className="rounded-md px-1.5 py-0.5 text-white text-xs font-medium whitespace-nowrap mb-1"
            >
              {tag.label}
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "review",
      header: "Review",
      style: { width: "10%" },
      render: (_value, row) => (
        <Button onClick={() => setCallSummary(row.raw)} className="flex items-center justify-center w-full py-[8px] bg-transparent border-none hover:bg-transparent cursor-pointer">
          <Eye
            className="text-[#868686] w-4 h-4"
          />
        </Button>
      ),
    },
  ];

  const displayData = callLogs.map(getDisplayData);

  return (
    <>
      <div
        className={"rounded-xl w-full max-h-[calc(100vh-240px)] pt-[20px]"}
        style={{
          minHeight: `${TABLE_ROW_HEIGHT * (CALL_LOGS_PAGINATION_LIMIT + 1)}px`,
        }}
      >
        <GenericTable
          columns={columns}
          data={displayData}
          fallbackUI={callLogs?.length === 0 && (
            <FallbackUI
              image={<NoResults />}
              mainMessage="No call records found"
              description="Your recent calls and insights will be listed here."
              className="py-[100px]"
            />
          )}
          className="min-w-full max-h-[calc(100vh-240px)] overflow-y-scroll"
          style={{ minWidth: "100%" }}
        />
        {callLogs?.length > 0 && (
          <Pagination
            page={page}
            totalPages={Math.ceil(totalCallsCount / CALL_LOGS_PAGINATION_LIMIT) || 1}
            onPageChange={(value) => dispatch(updatePage(value))}
          />
        )}
      </div>
      {callSummary && callSummary?.id && (
        <SummarySideBar
          callSummary={callSummary}
          refetchCallLogs={refetchCallLogs}
          setCallSummary={setCallSummary}
        />
      )}
    </>
  );
};

export default CallLogsTable;
