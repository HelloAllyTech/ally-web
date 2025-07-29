import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CircularProgress } from "@mui/material";
import { toast } from "sonner";

import { GenericTable } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { RootState } from "@/store/store";
import { updateFilters } from "@/reducer/callsReducer";
import { useGetAdminCallLogsQuery, useGetCounsellorsQuery, useGetCallTagsQuery } from "@/api/calls";
import { Button, FallbackUI, TagGroup } from "@/components";
import {
  NoResults,
  CallIdIcon,
  DateIcon,
  TimerIcon,
  StarIcon,
  TagsIcon,
  ReviewIcon,
  UserIcon,
} from "@/assets/icons";
import { CallLog, GetCallLogsInput } from "@/types/calls";

import { convertSecondsToDuration, getFormattedDate } from "../utils";
import { CALL_LOGS_PAGINATION_LIMIT, defaultTags, tagColors } from "../constants";
import { TagDisplay } from "../types";
import { SummarySideBar } from ".";

const ConsolidatedLogs = () => {
  const dispatch = useDispatch();

  const [callSummary, setCallSummary] = useState<CallLog | null>(null);
  const [callLogList, setCallLogList] = useState<CallLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { filters } = useSelector((state: RootState) => state.calls);
  const { offset } = filters;

  const {
    data: callLogsData,
    isLoading,
    refetch: refetchCallLogs,
    error: callLogsError,
  } = useGetAdminCallLogsQuery(filters);
  const { data: callLogs = [] } = callLogsData || {};
  const { data: counsellorsData } = useGetCounsellorsQuery({ offset: 0 });
  const { data: tagsData } = useGetCallTagsQuery({ offset: 0 });

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
  }, [callLogsData]);

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: filters?.offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  useEffect(() => {
    if (callLogsError && !isLoading) {
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
  }, [callLogsError, isLoading]);

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
        icon: <CallIdIcon />,
        callName: callInfo?.summaryName ?? "--",
        counsellorName: counselor?.name,
        dateAndTime: startTime && getFormattedDate(startTime),
        callDuration: convertSecondsToDuration(callDuration),
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
      key: "review",
      header: "Review",
      style: { width: "10%" },
      render: (_value, row) => {
        const isSummaryNull = row.raw.details?.summary === null;
        console.log(isSummaryNull);
        return (
          <Button
            disabled={isSummaryNull}
            onClick={() => setCallSummary(row.raw)}
            className={`flex items-center justify-center w-full py-[8px] bg-transparent border-none hover:bg-transparent ${
              isSummaryNull ? "!pointer-events-auto !cursor-default" : "cursor-pointer"
            }`}
          >
            <ReviewIcon />
          </Button>
        );
      },
      icon: <ReviewIcon />,
    },
  ];

  const displayData = callLogList.map(getAdminDisplayData);

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
      <div className={"rounded-xl w-full max-h-[calc(100vh-10px)] overflow-y-hidden"}>
        <GenericTable
          ref={tableRef}
          columns={columns}
          data={displayData}
          isLoading={isLoading}
          showSelectedFilters={true}
          onFilterChange={handleFilterChange}
          handleLoadMore={callLogList?.length > 0 && hasMore && handleLoadMore}
          fallbackUI={renderFallbackUI()}
          className="min-w-full min-w-[100%] max-h-[calc(100vh-140px)] font-['IBM_Plex_Serif'] overflow-y-scroll"
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

export default ConsolidatedLogs;
