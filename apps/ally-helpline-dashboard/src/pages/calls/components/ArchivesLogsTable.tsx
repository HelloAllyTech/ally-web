import { useEffect, useState, useRef, FC } from "react";

import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { GenericTable, Loading } from "@ally-ui-mono/ui-shared";
import { Column } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { useGetAdminCallLogsQuery, useGetCallLogsQuery } from "@api";
import {
  NoResults,
  CallIdIcon,
  DateIcon,
  TimerIcon,
  TagsIcon,
  ReviewIcon,
  SummaryGenerationIcon,
  SourceIcon,
  UserIcon,
} from "@assets";
import { Button, Chip, TagGroup, FallbackUI } from "@components";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { CallLog, ChatSummaryStatus, SessionType, TagDisplay } from "@types";
import { convertSecondsToDuration, getFormattedDate } from "@utils";

import { CALL_LOGS_PAGINATION_LIMIT, SessionUserGroup, tagColors } from "../constants";
import CallSummarySidebar from "./CallSummarySidebar";
import { ArchivesLogsTableProps } from "./types";
import { getSourceChipConfig, getStatusChipConfig } from "./utils";

const ArchivesLogsTable: FC<ArchivesLogsTableProps> = ({
  className,
  refreshKey,
  sessionUserGroup,
}) => {
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const durationLabels = {
    lessThanOneMinute: t("calls.duration.lessThanOneMinute", "Less than 1 min"),
    hour: t("calls.duration.hour", "hr"),
    hours: t("calls.duration.hours", "hrs"),
    minute: t("calls.duration.minute", "min"),
    minutes: t("calls.duration.minutes", "mins"),
    second: t("calls.duration.second", "sec"),
    seconds: t("calls.duration.seconds", "secs"),
  };

  const { filters } = useSelector((state: RootState) => state.calls);
  const { user: currentUser } = useSelector((state: RootState) => state.user);

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
    { skip: sessionUserGroup === SessionUserGroup.ORG_LOGS },
  );

  const {
    data: adminCallLogsData,
    isLoading: isAdminCallLogsLoading,
    isFetching: isAdminCallLogsFetching,
    isError: isAdminCallLogsError,
    refetch: refetchAdminCallLogs,
  } = useGetAdminCallLogsQuery(
    {
      ...filters,
      limit: CALL_LOGS_PAGINATION_LIMIT,
      offset: offset,
      archive: true,
      sortBy: "createdAt",
      order: "DESC",
    },
    { skip: sessionUserGroup === SessionUserGroup.MY_LOGS },
  );

  // Use the appropriate data source based on sessionUserGroup
  const isOrgLogs = sessionUserGroup === SessionUserGroup.ORG_LOGS;
  const activeData = isOrgLogs ? adminCallLogsData : callLogsData;
  const { data: callLogs = [], count = 0 } = activeData || {};

  const handleScroll = () => {
    if (tableRef.current) {
      tableRef.current.scrollTo({ top: tableRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => {
    setLogs([]);
    setHasMore(true);
    dispatch(updateFilters({ ...filters, offset: 0 }));
  }, [sessionUserGroup]);

  useEffect(() => {
    if (refreshKey) {
      const refetchFn = isOrgLogs ? refetchAdminCallLogs : refetchCallLogs;
      refetchFn();
    }
  }, [refreshKey, isOrgLogs, refetchCallLogs, refetchAdminCallLogs]);

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
  }, [activeData, callLogs, offset, count]);

  const isLoading = isOrgLogs
    ? isAdminCallLogsLoading || isAdminCallLogsFetching
    : isCallLogsLoading || isCallLogsFetching;

  const handleLoadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      dispatch(updateFilters({ ...filters, offset: offset + CALL_LOGS_PAGINATION_LIMIT }));
    }
  };

  // Show loading state
  if (isLoading && offset === 0) {
    return (
      <div className="flex justify-center items-center h-[calc(100dvh-200px)]">
        <Loading withOverlay={false} />
      </div>
    );
  }

  const isError = isOrgLogs ? isAdminCallLogsError : isCallLogsError;
  const refetchFn = isOrgLogs ? refetchAdminCallLogs : refetchCallLogs;

  if (isError && !isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100dvh-200px)]">
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("calls.archives.errorTitle")}
          description={t("calls.archives.errorDesc")}
          button={{
            text: t("common.retry"),
            onClick: () => refetchFn?.(),
          }}
        />
      </div>
    );
  }

  const getCallDisplayData = (row: CallLog) => {
    const { details, id, startedAt, counselor } = row;
    if (details) {
      const { callDuration, callInfo, summary, transcript } = details;

      return {
        id,
        transcript,
        callName: callInfo?.summaryName ?? "--",
        counsellorName: isOrgLogs ? counselor?.name : undefined,
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
        raw: row, // keep original row for summary action
      };
    }
    return {
      id,
      callName: "",
      counsellorName: isOrgLogs ? counselor?.name : undefined,
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
      header: t("summary.fields.callName"),
      style: { width: isOrgLogs ? "14%" : "17%" },
      icon: <CallIdIcon />,
    },
    ...(isOrgLogs
      ? [
          {
            key: "counsellorName",
            header: t("calls.table.counsellorName"),
            style: { width: "14%" },
            icon: <UserIcon />,
          },
        ]
      : []),
    {
      key: "dateAndTime",
      header: t("calls.table.dateTime"),
      style: { width: isOrgLogs ? "16%" : "20%" },
      icon: <DateIcon />,
    },
    {
      key: "duration",
      header: t("common.duration"),
      style: { width: isOrgLogs ? "10%" : "12%" },
      icon: <TimerIcon />,
    },
    {
      key: "tags",
      header: t("common.tags"),
      style: { width: isOrgLogs ? "16%" : "20%" },
      render: (value: TagDisplay[]) => <TagGroup tags={value} />,
      icon: <TagsIcon />,
    },
    {
      key: "summaryStatus",
      header: t("calls.table.summaryStatus"),
      style: { width: isOrgLogs ? "8%" : "10%" },
      render: (_value, row) => <Chip config={getStatusChipConfig(row.raw.summaryStatus, t)} />,
      icon: <SummaryGenerationIcon />,
    },
    {
      key: "source",
      header: t("calls.table.source"),
      style: { width: isOrgLogs ? "8%" : "10%" },
      render: (_value, row) => <Chip config={getSourceChipConfig(row.provider, t)} />,
      icon: <SourceIcon />,
    },
    {
      key: "summary",
      header: t("common.summary"),
      style: { width: isOrgLogs ? "5%" : "6%" },
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
          mainMessage={t("calls.archives.emptyTitle")}
          description={t("calls.archives.emptyDesc")}
          className="py-[100px]"
        />
      );
    }
    return null;
  };

  const onSummarySubmit = async (newStatus?: ChatSummaryStatus) => {
    if (newStatus && summary && summary.summaryStatus === newStatus) return;
    const chatId = summary?.id;
    const refetchFunction = isOrgLogs ? refetchAdminCallLogs : refetchCallLogs;
    if (refetchFunction) {
      const result = await refetchFunction();
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
        showArchiveButton={currentUser?.id === summary?.counselorId}
      />
    );
  };

  return (
    <>
      <div
        className="rounded-xl w-full max-h-[calc(100dvh-10px)] overflow-y-hidden"
        data-testid="archives-logs-table-container"
      >
        <GenericTable
          ref={tableRef}
          columns={callColumns}
          data={displayData}
          isLoading={isLoading}
          handleLoadMore={logs?.length > 0 && hasMore ? handleLoadMore : undefined}
          loadMoreLabel={t("common.loadMore")}
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
