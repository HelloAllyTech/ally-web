import { FunctionComponent, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { ActionableNotification, GenericTable, Loading } from "@ally-ui-mono/ui-shared";
import { Column, FilterType } from "@ally-ui-mono/ui-shared/lib/generic-table/types";
import { useGetCourseUsageTableQuery } from "@api";
import { Download, NoResults } from "@assets";
import { Button, Chip, ChipConfig, FallbackUI } from "@components";
import { CourseUsageRow, CourseUsageSortField, GetCourseUsageTableRequest } from "@types";

const PAGE_SIZE = 25;

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—";

const getCourseStatusChipConfig = (
  status: CourseUsageRow["status"],
  t: (key: string) => string,
): ChipConfig => {
  switch (status) {
    case "ACTIVE":
      return {
        label: t("organizationMetrics.courseUsage.status.active"),
        dotClassName: "bg-[#47B881]", // Green
        outerDivClassName: "bg-[#DCEBDD]",
      };
    case "ARCHIVED":
    default:
      return {
        label: t("organizationMetrics.courseUsage.status.archived"),
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

/**
 * Per-course (Track 2.0) usage table: one row per course so a tenant admin
 * can see which courses are being taken, where learners stall, and how long
 * they take — not just the per-learner view above it. Deliberately all-time
 * (no range prop) — a course's lifetime performance, matching the per-learner
 * table's treatment of its own course columns. Search/sort are server-driven;
 * "Load more" accumulates pages the same way LearnerUsageTable does.
 */
export const CourseUsageTable: FunctionComponent = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState<CourseUsageRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<CourseUsageSortField>("learnersStarted");
  const [order, setOrder] = useState<"ASC" | "DESC">("ASC");

  const params: GetCourseUsageTableRequest = useMemo(
    () => ({ search, sortBy, order, limit: PAGE_SIZE, offset }),
    [search, sortBy, order, offset],
  );

  // refetchOnMountOrArgChange: same reasoning as LearnerUsageTable — a
  // remount racing an in-flight fetch can otherwise leave the cache entry
  // stuck `pending` forever.
  const { data, isFetching, isError, refetch } = useGetCourseUsageTableQuery(params, {
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    setOffset(0);
  }, [search, sortBy, order]);

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
    if (sort.key && sort.value) {
      setSortBy(sort.key as CourseUsageSortField);
      setOrder(sort.value);
    } else {
      setSortBy("learnersStarted");
      setOrder("ASC");
    }
    const titleFilter = filter.find(f => f.key === "title");
    const searchValue = typeof titleFilter?.value === "string" ? titleFilter.value.trim() : "";
    setSearch(searchValue || undefined);
  };

  const handleLoadMore = () => setOffset(prev => prev + PAGE_SIZE);

  const onExport = () => {
    const header = [
      t("organizationMetrics.courseUsage.columns.title"),
      t("organizationMetrics.courseUsage.columns.status"),
      t("organizationMetrics.courseUsage.columns.totalItems"),
      t("organizationMetrics.courseUsage.columns.assigned"),
      t("organizationMetrics.courseUsage.columns.started"),
      "Started rate %",
      t("organizationMetrics.courseUsage.columns.atLeast50"),
      "50%+ completion rate %",
      t("organizationMetrics.courseUsage.columns.completed100"),
      "100% completion rate %",
      t("organizationMetrics.courseUsage.columns.avgCompletionDays"),
      t("organizationMetrics.courseUsage.columns.medianCompletionDays"),
      t("organizationMetrics.courseUsage.columns.avgScore"),
      t("organizationMetrics.courseUsage.columns.inProgressActive"),
      t("organizationMetrics.courseUsage.columns.inProgressStalled"),
      t("organizationMetrics.courseUsage.columns.lastEnrollmentAt"),
    ];
    const csvRows = rows.map(r => [
      csvCell(r.title),
      csvCell(r.status),
      csvCell(r.totalItems),
      csvCell(r.learnersAssigned),
      csvCell(r.learnersStarted),
      csvCell(r.startedRatePct),
      csvCell(r.learnersAtLeast50),
      csvCell(r.completion50PlusRatePct),
      csvCell(r.learnersCompleted100),
      csvCell(r.completion100RatePct),
      csvCell(r.avgCompletionDays),
      csvCell(r.medianCompletionDays),
      csvCell(r.avgScore),
      csvCell(r.inProgressActive),
      csvCell(r.inProgressStalled),
      csvCell(formatDate(r.lastEnrollmentAt)),
    ]);
    const csv = [
      `# ${t("organizationMetrics.courseUsage.title")}`,
      header.map(csvCell).join(","),
      ...csvRows.map(row => row.join(",")),
    ].join("\n");
    downloadCsv("course-usage.csv", csv);
  };

  // Column<any>[], matching LearnerUsageTable's convention — GenericTable's
  // forwardRef generic doesn't infer cleanly from a concrete row type here.
  const columns: Column<any>[] = [
    {
      key: "title",
      header: t("organizationMetrics.courseUsage.columns.title"),
      sortable: true,
      filterable: true,
      filterType: FilterType.TEXT,
    },
    {
      key: "status",
      header: t("organizationMetrics.courseUsage.columns.status"),
      sortable: true,
      render: (_value, row) => <Chip config={getCourseStatusChipConfig(row.status, t)} />,
    },
    {
      key: "totalItems",
      header: t("organizationMetrics.courseUsage.columns.totalItems"),
      sortable: true,
    },
    {
      key: "learnersAssigned",
      header: t("organizationMetrics.courseUsage.columns.assigned"),
    },
    {
      key: "learnersStarted",
      header: t("organizationMetrics.courseUsage.columns.started"),
      sortable: true,
      render: (value: number, row) =>
        row.startedRatePct != null ? `${value} (${row.startedRatePct}%)` : value,
    },
    {
      key: "learnersAtLeast50",
      header: t("organizationMetrics.courseUsage.columns.atLeast50"),
      sortable: true,
      render: (value: number, row) =>
        row.completion50PlusRatePct != null ? `${value} (${row.completion50PlusRatePct}%)` : value,
    },
    {
      key: "learnersCompleted100",
      header: t("organizationMetrics.courseUsage.columns.completed100"),
      sortable: true,
      render: (value: number, row) =>
        row.completion100RatePct != null ? `${value} (${row.completion100RatePct}%)` : value,
    },
    {
      key: "avgCompletionDays",
      header: t("organizationMetrics.courseUsage.columns.completionTime"),
      sortable: true,
      render: (value: number | null, row) => {
        if (value == null) return "—";
        const median = row.medianCompletionDays;
        return median != null ? `${value}d (med ${median}d)` : `${value}d`;
      },
    },
    {
      key: "avgScore",
      header: t("organizationMetrics.courseUsage.columns.avgScore"),
      sortable: true,
      render: (value: number | null) => value ?? "—",
    },
    {
      key: "inProgressActive",
      header: t("organizationMetrics.courseUsage.columns.inProgress"),
      render: (value: number, row) =>
        t("organizationMetrics.courseUsage.inProgressCell", {
          active: value,
          stalled: row.inProgressStalled,
        }),
    },
    {
      key: "lastEnrollmentAt",
      header: t("organizationMetrics.courseUsage.columns.lastEnrollmentAt"),
      sortable: true,
      render: (value: string | null) => formatDate(value),
    },
  ];

  if (isError) {
    return (
      <ActionableNotification
        kind="error"
        lowContrast
        hideCloseButton
        inline
        title={t("organizationMetrics.courseUsage.errorTitle")}
        subtitle={t("organizationMetrics.courseUsage.errorSubtitle")}
        actionButtonLabel={t("organizationMetrics.states.retry")}
        onActionButtonClick={() => refetch()}
      />
    );
  }

  if (isFetching && offset === 0 && rows.length === 0) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="course-usage-loading">
        <Loading withOverlay={false} />
      </div>
    );
  }

  return (
    <div data-testid="course-usage-table-section">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-medium text-typography-900">
            {t("organizationMetrics.courseUsage.title")}
          </h3>
          <p className="text-sm text-typography-600">
            {t("organizationMetrics.courseUsage.caption")}
          </p>
        </div>
        <Button
          variant="text"
          onClick={onExport}
          disabled={rows.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t("organizationMetrics.courseUsage.exportCsv")}
        </Button>
      </div>

      {rows.length === 0 && !isFetching ? (
        <FallbackUI
          icon={<NoResults />}
          mainMessage={t("organizationMetrics.courseUsage.emptyTitle")}
          description={t("organizationMetrics.courseUsage.emptyDescription")}
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

export default CourseUsageTable;
