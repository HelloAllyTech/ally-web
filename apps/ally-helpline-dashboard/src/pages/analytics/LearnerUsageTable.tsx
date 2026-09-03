import { FunctionComponent, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { ActionableNotification, GenericTable, Loading } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { useGetLearnerUsageTableQuery } from "@api";
import { Download, NoResults } from "@assets";
import { Button, Chip, ChipConfig, FallbackUI } from "@components";
import {
  GetLearnerUsageTableRequest,
  LEARNER_USAGE_STATUSES,
  LearnerUsageRow,
  LearnerUsageSortField,
  LearnerUsageStatus,
  OrganizationMetricsRange,
} from "@types";

const PAGE_SIZE = 25;

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";

/**
 * "12d ago" beats a date here: the admin's question is how stale this learner
 * is, and a date makes them do the arithmetic. `daysSinceLastActivity` is
 * computed server-side (same value the status chip is derived from) so the two
 * can never disagree on screen.
 */
const formatDaysAgo = (days: number | null, t: (key: string, opts?: any) => string): string => {
  if (days == null) return "—";
  if (days <= 0) return t("organizationMetrics.learnerUsage.today");
  return t("organizationMetrics.learnerUsage.daysAgo", { count: days });
};

/** Status values are snake_case; the locale keys under `status.` are camelCase. */
const STATUS_LABEL_KEY: Record<LearnerUsageStatus, string> = {
  active: "active",
  at_risk: "atRisk",
  dormant: "dormant",
  never_started: "neverStarted",
};

const getLearnerStatusChipConfig = (
  status: LearnerUsageStatus,
  t: (key: string) => string,
): ChipConfig => {
  switch (status) {
    case "active":
      return {
        label: t("organizationMetrics.learnerUsage.status.active"),
        dotClassName: "bg-[#47B881]", // Green
        outerDivClassName: "bg-[#DCEBDD]",
      };
    case "at_risk":
      return {
        label: t("organizationMetrics.learnerUsage.status.atRisk"),
        dotClassName: "bg-[#FFAD0D]", // Yellow
        outerDivClassName: "bg-[#F8E6BA]",
      };
    case "dormant":
      return {
        label: t("organizationMetrics.learnerUsage.status.dormant"),
        dotClassName: "bg-[#E5675A]", // Red
        outerDivClassName: "bg-[#FBDED9]",
      };
    case "never_started":
    default:
      return {
        label: t("organizationMetrics.learnerUsage.status.neverStarted"),
        dotClassName: "bg-[#6B7280]", // Gray
        outerDivClassName: "bg-[#F3F4F6]",
      };
  }
};

const csvCell = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

interface LearnerUsageTableProps {
  /** Shares the Organization Metrics page's one period toggle. */
  range: OrganizationMetricsRange;
}

/**
 * Per-learner usage table: one row per learner so a tenant admin can see who
 * is and isn't using Ally, not just the org-wide averages above it. Search
 * and sort are server-driven (see getLearnerUsageTable); "Load more"
 * accumulates pages the same way AdminLogsTable does, rather than numbered
 * pages, since that's the only pagination affordance GenericTable offers.
 */
export const LearnerUsageTable: FunctionComponent<LearnerUsageTableProps> = ({ range }) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<LearnerUsageRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [statuses, setStatuses] = useState<LearnerUsageStatus[] | undefined>(undefined);
  const [sortBy, setSortBy] = useState<LearnerUsageSortField>("lastActivityAt");
  const [order, setOrder] = useState<"ASC" | "DESC">("ASC");

  const params: GetLearnerUsageTableRequest = useMemo(
    () => ({ range, search, status: statuses, sortBy, order, limit: PAGE_SIZE, offset }),
    [range, search, statuses, sortBy, order, offset],
  );

  // refetchOnMountOrArgChange: this table's parent (PermissionGuardedRoute)
  // unmounts its whole subtree whenever the auth-derived `user` briefly goes
  // falsy (e.g. a token refresh in flight) and remounts it once resolved —
  // if that races an in-flight fetch, the orphaned subscription can leave
  // RTK Query's cache entry stuck `pending` forever. Forcing a fresh check on
  // every mount is the cheap, safe fix, rather than trusting a subscription
  // that may have been orphaned by a remount mid-flight.
  const { data, isFetching, isError, refetch } = useGetLearnerUsageTableQuery(params, {
    refetchOnMountOrArgChange: true,
  });

  // range/search/status/sort are the parent-controlled or user-driven filters;
  // whichever changes, restart pagination from the first page.
  useEffect(() => {
    setOffset(0);
  }, [range, search, statuses, sortBy, order]);

  // A page at offset 0 replaces the list (fresh filter); any later page
  // (load more, same filter) appends. `data` always reflects the exact
  // `params` just requested, so there's no stale-response race to guard.
  useEffect(() => {
    if (!data) return;
    setRows(prev => (offset === 0 ? data.data : [...prev, ...data.data]));
  }, [data, offset]);

  const hasMore = !!data && rows.length < data.count;

  const handleFilterChange = ({
    filter,
    sort,
  }: {
    filter: Array<{ key: string; value: string | string[] }>;
    sort: { key: string; value: "ASC" | "DESC" | null };
  }) => {
    // Pagination reset is handled by the range/search/sortBy/order effect above.
    if (sort.key && sort.value) {
      setSortBy(sort.key as LearnerUsageSortField);
      setOrder(sort.value);
    } else {
      setSortBy("lastActivityAt");
      setOrder("ASC");
    }
    const nameFilter = filter.find(f => f.key === "name");
    const searchValue = typeof nameFilter?.value === "string" ? nameFilter.value.trim() : "";
    setSearch(searchValue || undefined);

    // Status is filtered server-side: filtering the accumulated pages here
    // would filter only what has been loaded and leave `count` (and so "Load
    // more") describing the unfiltered set.
    const statusFilter = filter.find(f => f.key === "status");
    const picked = Array.isArray(statusFilter?.value)
      ? statusFilter.value
      : statusFilter?.value
        ? [statusFilter.value]
        : [];
    setStatuses(picked.length ? (picked as LearnerUsageStatus[]) : undefined);
  };

  const handleLoadMore = () => setOffset(prev => prev + PAGE_SIZE);

  const onExport = () => {
    // Deliberately WIDER than the rendered table: the on-screen columns are
    // merged pairs ("8 / 11") for width, but a spreadsheet wants each number in
    // its own cell, and the fields the table drops (signup date, the raw
    // roleplay split, course counts) still belong in a report.
    const header = [
      t("organizationMetrics.learnerUsage.columns.name"),
      t("organizationMetrics.learnerUsage.columns.email"),
      t("organizationMetrics.learnerUsage.columns.status"),
      t("organizationMetrics.learnerUsage.columns.lastActive"),
      "Days since last activity",
      t("organizationMetrics.learnerUsage.columns.lastPracticeSession"),
      t("organizationMetrics.learnerUsage.columns.signupDate"),
      t("organizationMetrics.learnerUsage.columns.level"),
      t("organizationMetrics.learnerUsage.columns.totalXp"),
      t("organizationMetrics.learnerUsage.columns.roleplaySessionsStarted"),
      t("organizationMetrics.learnerUsage.columns.roleplaySessionsCompleted"),
      "Roleplay completion rate %",
      t("organizationMetrics.learnerUsage.columns.avgScore"),
      t("organizationMetrics.learnerUsage.columns.totalPracticeMinutes"),
      t("organizationMetrics.learnerUsage.columns.pointsPerMinute"),
      "Course items total",
      "Course items completed",
      "Course items completed %",
      "Quizzes passed",
      "Quizzes attempted",
      "Avg quiz score %",
      t("organizationMetrics.learnerUsage.columns.readWatch"),
      t("organizationMetrics.learnerUsage.columns.reflection"),
      t("organizationMetrics.learnerUsage.columns.coursesAssigned"),
      t("organizationMetrics.learnerUsage.columns.coursesCompleted"),
      "Course completion rate %",
    ];
    const csvRows = rows.map(r => [
      csvCell(r.name),
      csvCell(r.email),
      csvCell(r.status),
      csvCell(formatDate(r.lastActivityAt)),
      csvCell(r.daysSinceLastActivity),
      csvCell(formatDate(r.lastPracticeSessionAt)),
      csvCell(formatDate(r.signupDate)),
      csvCell(r.level),
      csvCell(r.totalXp),
      csvCell(r.roleplaySessionsStarted),
      csvCell(r.roleplaySessionsCompleted),
      csvCell(r.roleplayCompletionRatePct),
      csvCell(r.avgScore),
      csvCell(r.totalPracticeMinutes),
      csvCell(r.roleplayPointsPerMinute),
      csvCell(r.itemsTotal),
      csvCell(r.itemsCompleted),
      csvCell(r.itemsCompletedPct),
      csvCell(r.quizzesPassed),
      csvCell(r.quizzesAttempted),
      csvCell(r.avgQuizScorePct),
      csvCell(r.readWatchCompleted),
      csvCell(r.reflectionCompleted),
      csvCell(r.coursesAssigned),
      csvCell(r.coursesCompleted),
      csvCell(r.courseCompletionRatePct),
    ]);
    const csv = [
      `# ${t("organizationMetrics.learnerUsage.title")}`,
      `# ${t(`organizationMetrics.ranges.${range}`)}`,
      header.map(csvCell).join(","),
      ...csvRows.map(row => row.join(",")),
    ].join("\n");
    downloadCsv("learner-usage.csv", csv);
  };

  // Column<any>[], matching AdminLogsTable's convention — GenericTable's
  // forwardRef generic doesn't infer cleanly from a concrete row type here.
  const columns: Column<any>[] = [
    {
      key: "name",
      header: t("organizationMetrics.learnerUsage.columns.name"),
      sortable: true,
      filterable: true,
      filterType: FilterType.TEXT,
    },
    {
      key: "email",
      header: t("organizationMetrics.learnerUsage.columns.email"),
      sortable: true,
    },
    {
      // Sorts by severity, not alphabetically — see `statusRank` in the
      // backend's sort-column map. ASC therefore puts never-started first,
      // which is the order an admin wants to work down.
      key: "status",
      header: t("organizationMetrics.learnerUsage.columns.status"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.status"),
      sortable: true,
      filterable: true,
      filterType: FilterType.MULTISELECT,
      filterOptions: LEARNER_USAGE_STATUSES.map(status => ({
        label: t(`organizationMetrics.learnerUsage.status.${STATUS_LABEL_KEY[status]}`),
        value: status,
      })),
      render: (_value, row) => <Chip config={getLearnerStatusChipConfig(row.status, t)} />,
    },
    {
      key: "lastActivityAt",
      header: t("organizationMetrics.learnerUsage.columns.lastActive"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.lastActive"),
      sortable: true,
      render: (_value, row) => formatDaysAgo(row.daysSinceLastActivity, t),
    },
    {
      key: "level",
      header: t("organizationMetrics.learnerUsage.columns.level"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.level"),
      sortable: true,
      render: (value: number) => t("organizationMetrics.learnerUsage.levelShort", { level: value }),
    },
    {
      key: "totalXp",
      header: t("organizationMetrics.learnerUsage.columns.totalXp"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.totalXp"),
      sortable: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      // Merged pair: the two counts were separate columns, but "done of
      // started" is the number that means something and it costs one column.
      key: "roleplaySessionsCompleted",
      header: t("organizationMetrics.learnerUsage.columns.roleplaySessions"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.roleplaySessions"),
      sortable: true,
      render: (value: number, row) => `${value} / ${row.roleplaySessionsStarted}`,
    },
    {
      key: "totalPracticeMinutes",
      header: t("organizationMetrics.learnerUsage.columns.totalPracticeMinutes"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.totalPracticeMinutes"),
      sortable: true,
      render: (value: number) => value.toLocaleString(),
    },
    {
      // Score per minute, not per session: it separates the learner who earns
      // steadily from the one who racks up minutes. Null (no measurable
      // practice) reads as "—", never 0, and the value can be negative.
      key: "roleplayPointsPerMinute",
      header: t("organizationMetrics.learnerUsage.columns.pointsPerMinute"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.pointsPerMinute"),
      sortable: true,
      render: (value: number | null) => (value == null ? "—" : value.toLocaleString()),
    },
    {
      // Items, not courses: a course-level percentage only moves on
      // completion, so a learner three quarters of the way through a long
      // course is indistinguishable from one who has not started it.
      key: "itemsCompletedPct",
      header: t("organizationMetrics.learnerUsage.columns.itemsCompletedPct"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.itemsCompletedPct"),
      sortable: true,
      render: (value: number | null, row) =>
        row.itemsTotal === 0 ? "—" : `${row.itemsCompleted} / ${row.itemsTotal} (${value}%)`,
    },
    {
      key: "quizzesPassed",
      header: t("organizationMetrics.learnerUsage.columns.quizzes"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.quizzes"),
      sortable: true,
      render: (value: number, row) =>
        row.quizzesAttempted === 0
          ? "—"
          : `${value} / ${row.quizzesAttempted}${
              row.avgQuizScorePct != null ? ` (${row.avgQuizScorePct}%)` : ""
            }`,
    },
    {
      key: "readWatchCompleted",
      header: t("organizationMetrics.learnerUsage.columns.readWatch"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.readWatch"),
      sortable: true,
    },
    {
      key: "reflectionCompleted",
      header: t("organizationMetrics.learnerUsage.columns.reflection"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.reflection"),
      sortable: true,
    },
    {
      key: "coursesCompleted",
      header: t("organizationMetrics.learnerUsage.columns.coursesCompleted"),
      tooltip: t("organizationMetrics.learnerUsage.tooltips.coursesCompleted"),
      sortable: true,
      render: (value: number, row) =>
        row.courseCompletionRatePct != null ? `${value} (${row.courseCompletionRatePct}%)` : value,
    },
    {
      key: "signupDate",
      header: t("organizationMetrics.learnerUsage.columns.signupDate"),
      sortable: true,
      render: (value: string) => formatDate(value),
    },
  ];

  if (isError) {
    return (
      <ActionableNotification
        kind="error"
        lowContrast
        hideCloseButton
        inline
        title={t("organizationMetrics.learnerUsage.errorTitle")}
        subtitle={t("organizationMetrics.learnerUsage.errorSubtitle")}
        actionButtonLabel={t("organizationMetrics.states.retry")}
        onActionButtonClick={() => refetch()}
      />
    );
  }

  if (isFetching && offset === 0 && rows.length === 0) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="learner-usage-loading">
        <Loading withOverlay={false} />
      </div>
    );
  }

  return (
    <div data-testid="learner-usage-table-section">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-medium text-typography-900">
            {t("organizationMetrics.learnerUsage.title")}
          </h3>
          <p className="text-sm text-typography-600">
            {t("organizationMetrics.learnerUsage.caption")}
          </p>
        </div>
        <Button
          variant="text"
          onClick={onExport}
          disabled={rows.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t("organizationMetrics.learnerUsage.exportCsv")}
        </Button>
      </div>

      {rows.length === 0 && !isFetching ? (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("organizationMetrics.learnerUsage.emptyTitle")}
          description={t("organizationMetrics.learnerUsage.emptyDescription")}
          className="py-[60px]"
        />
      ) : (
        <GenericTable
          columns={columns}
          data={rows}
          isLoading={isFetching}
          showSelectedFilters
          onFilterChange={handleFilterChange}
          handleLoadMore={hasMore ? handleLoadMore : undefined}
          loadMoreLabel={t("common.loadMore", "Load more")}
          className="min-w-full font-secondary text-sm text-typography-800"
        />
      )}
    </div>
  );
};

export default LearnerUsageTable;
