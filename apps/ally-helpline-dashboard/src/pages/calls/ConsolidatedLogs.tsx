import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { Eye } from "lucide-react";

import { RootState } from "@/store/store";
import { updateFilters, updatePage, updateTotalCallsCount } from "@/reducer/callsReducer";
import { useGetAdminCallLogsQuery } from "@/api/calls";
import { Button, CustomCircularProgress, FallbackUI, TagGroup } from "@/components";
import { NoResults } from "@/assets/icons";
import { CallLog, GetCallLogsInput } from "@/types/calls";

import SummarySideBar from "./components/SummarySideBar";
import { convertSecondsToDuration, formatDate } from "./utils";
import { CALL_LOGS_PAGINATION_LIMIT, TABLE_ROW_HEIGHT, tagColors } from "./constants";
import { TagDisplay } from "./types";
import { GenericTable } from "@ally-ui-mono/ui-shared";
import { Column } from "@ally-ui-mono/ui-shared/lib/generic-table/types";

const ConsolidatedLogs = () => {
  const dispatch = useDispatch();

  const { filters } = useSelector((state: RootState) => state.calls);

  const { offset } = filters;

  const [callSummary, setCallSummary] = useState<CallLog | null>(null);

  const {
    data: callLogsData,
    isLoading,
    refetch: refetchCallLogs,
  } = useGetAdminCallLogsQuery(filters);

  const { count, data: callLogs = [] } = callLogsData || {};

  const [callLogList, setCallLogList] = useState<CallLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({
        top: offset === 0 ? 0 : tableRef.current.scrollHeight,
        behavior: "smooth",
      });
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
      handleScroll();
    } else if (offset === 0) {
      setHasMore(false);
      setCallLogList([]);
    }
  }, [callLogs, offset]);

  useEffect(() => {
    dispatch(updateTotalCallsCount(count));
  }, [count]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: filters?.offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <CircularProgress />
      </div>
    );
  }

  const getAdminDisplayData = (row: CallLog) => {
    const { details, id, counselor } = row;
    if (details) {
      const { callInfo, startTime, callDuration, summary } = details;
      return {
        id,
        callName: callInfo?.summaryName,
        counselorName: counselor?.name,
        dateAndTime: formatDate(startTime),
        duration: convertSecondsToDuration(callDuration ?? 60),
        qualityScore: summary?.callQuality ?? 0,
        tags: summary?.tags?.map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag?.tag,
            colors: tagColors[tag?.positivity_rating],
          };
        }),
        raw: row,
      };
    }
    return { id, callName: "", dateAndTime: "", raw: row };
  };

  const columns: Column<any>[] = [
    {
      key: "callName",
      header: "Call ID",
      style: { width: "15%" },
    },
    {
      key: "counselorName",
      header: "Counselor Name",
      filterType: "multiselect",
      style: { width: "15%" },
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Counselor The Great", value: "3" },
        { label: "Aarathy", value: "11" },
        { label: "c", value: "2" },
        { label: "Benil Jose", value: "12" },
      ],
    },
    {
      key: "dateAndTime",
      header: "Date & Time",
      filterType: "date",
      style: { width: "15%" },
      sortable: true,
    },
    {
      key: "duration",
      header: "Duration",
      sortable: true,
      filterable: true,
      style: { width: "15%" },
    },
    {
      key: "qualityScore",
      header: "Quality Score",
      sortable: true,
      filterable: true,
      filterOptions: [
        { label: "Excellent (85+)", value: "85-100" },
        { label: "Good (50-80)", value: "50-80" },
        { label: "Need attention (<50)", value: "0-50" },
      ],
      style: { width: "15%" },
      render: value => {
        return (
          <div className="flex items-center gap-3 text-[16px]">
            <span className="w-[20px]">{value}</span>
            <CustomCircularProgress value={value} />
          </div>
        );
      },
    },
    {
      key: "tags",
      header: "Tags",
      style: { width: "30%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
    },
    {
      key: "review",
      header: "Review",
      style: { width: "10%" },
      render: (_value, row) => (
        <Button
          onClick={() => setCallSummary(row.raw)}
          className="flex items-center justify-center w-full py-[8px] bg-transparent border-none hover:bg-transparent cursor-pointer"
        >
          <Eye className="text-[#868686] w-4 h-4" />
        </Button>
      ),
    },
  ];

  const displayData = callLogList.map(getAdminDisplayData);

  const handleFilterChange = (data: any) => {
    const { filter, sort } = data;

    let updatedFilters: GetCallLogsInput = { offset: 0, limit: CALL_LOGS_PAGINATION_LIMIT };

    if (filter?.length > 0 || sort?.value) {
      const sortByFilter = sort?.key ? { sortBy: sort?.key, order: sort?.value } : {};
      const counselorValue = filter?.find(
        (f: { key: string; value: any }) => f.key === "counselorName",
      )?.value;
      const counselorIds = Array.isArray(counselorValue)
        ? counselorValue
        : typeof counselorValue === "string" && counselorValue
          ? counselorValue.split(",")
          : [];
      const counselorFilter = counselorIds?.length > 0 ? { counselorIds } : {};
      const dateFilterArray = filter?.find(
        (f: { key: string; value: any }) => f.key === "dateAndTime",
      )?.value;
      const dateFilter =
        dateFilterArray?.length > 0
          ? { startDate: dateFilterArray[0], endDate: dateFilterArray[1] }
          : {};

      const qualityScorefilterData = filter
        ?.find((f: { key: string; value: any }) => f.key === "qualityScore")
        ?.value?.split("-");
      const qualityScoreFilter =
        qualityScorefilterData?.length > 0
          ? {
              minQualityScore: qualityScorefilterData[0],
              maxQualityScore: qualityScorefilterData[1],
            }
          : {};

      updatedFilters = {
        ...updatedFilters,
        ...sortByFilter,
        ...counselorFilter,
        ...dateFilter,
        ...qualityScoreFilter,
      };
    }
    dispatch(updateFilters(updatedFilters));
  };

  return (
    <>
      <div
        className={"rounded-xl w-full max-h-[calc(100vh-240px)] pt-[20px]"}
        style={{
          minHeight: `${TABLE_ROW_HEIGHT * (CALL_LOGS_PAGINATION_LIMIT + 1)}px`,
        }}
      >
        <GenericTable
          ref={tableRef}
          columns={columns}
          data={displayData}
          isLoading={isLoading}
          showSelectedFilters={true}
          onFilterChange={handleFilterChange}
          handleLoadMore={callLogList?.length > 0 && hasMore && handleLoadMore}
          fallbackUI={
            callLogList.length === 0 &&
            !isLoading && (
              <FallbackUI
                image={<NoResults />}
                mainMessage="No call records found"
                description="Your recent calls and insights will be listed here."
                className="py-[100px]"
              />
            )
          }
          className="min-w-full max-h-[calc(100vh-140px)] font-['IBM_Plex_Sans'] overflow-y-scroll"
          style={{ minWidth: "100%" }}
        />
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

export default ConsolidatedLogs;
