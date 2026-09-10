import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Refresh, Unarchive } from "@icons";
import { toast } from "sonner";

import { Checkbox, InlineNotification, SkeletonText } from "@ally-ui-mono/ui-shared";
import {
  useArchiveKbDocumentMutation,
  useGetKbDocumentsQuery,
  useGetKbStatsQuery,
  useGetTenantsQuery,
  useReindexKbDocumentMutation,
  useUnarchiveKbDocumentMutation,
} from "@api";
import {
  ActionConfirmationPopup,
  EmptyState,
  EntityTable,
  EntityTableColumn,
  EntityTableSort,
  FilterDropdown,
  ListPagination,
  ListToolbar,
} from "@components";
import { FilterChipProps } from "@components/types";
import { TooltipHint } from "@components/app-tooltip";
import {
  CorpusDocumentPanel,
  DocumentStatusBadge,
  audienceSummary,
} from "@components/knowledge-corpus";
import { en, TooltipLocation } from "@constants";
import { KB_IN_FLIGHT_STATUSES, KbDocument, KbDocumentStatus } from "@types";
import { formatDate, formatRelativeTime } from "@utils";

const PAGE_SIZE = 25;

/** One request covers every organisation — see CorpusDocumentPanel for why not paged. */
const TENANT_PAGE_SIZE = 200;

/**
 * How often to re-poll while any document is still being processed.
 *
 * Polling rather than a websocket, and that is a considered choice: ally-be has no socket.io Redis
 * adapter, so with more than one replica a mutation on replica A never reaches clients on replica B
 * (see useProductRoadmapRealtime's own docblock). A socket would also need a new gateway, a wire-event
 * enum and echo suppression — for a state machine that terminates within a minute or two. This is
 * eight lines and self-cancelling.
 */
const POLL_INTERVAL_MS = 4000;

export const CorpusTab: React.FC = () => {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [pollInterval, setPollInterval] = useState(0);
  const [tenantFilter, setTenantFilter] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const addFilterBtnRef = useRef<HTMLButtonElement>(null);
  const [sort, setSort] = useState<EntityTableSort>({ key: "createdAt", direction: "desc" });

  const { data, isLoading, isFetching, isError, refetch } = useGetKbDocumentsQuery(
    {
      limit: PAGE_SIZE,
      offset,
      search: search.trim() || undefined,
      tenantId: tenantFilter ?? undefined,
      includeArchived,
      sortBy: sort.key,
      sortDir: sort.direction,
    },
    { pollingInterval: pollInterval },
  );
  const { data: stats } = useGetKbStatsQuery();
  const { data: tenantData } = useGetTenantsQuery({ limit: TENANT_PAGE_SIZE });

  // id → name, so the organisations cell shows names rather than uuids. The question that cell
  // answers is "should this customer be able to see this", which a count or an id answers for
  // nobody.
  const tenantNames = useMemo(
    () => new Map((tenantData?.data ?? []).map(tenant => [tenant.id, tenant.name])),
    [tenantData],
  );

  const documents = data?.documents ?? [];
  const total = data?.count ?? 0;

  const [reindexDocument] = useReindexKbDocumentMutation();
  const [archiveDocument] = useArchiveKbDocumentMutation();
  const [unarchiveDocument] = useUnarchiveKbDocumentMutation();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editing, setEditing] = useState<KbDocument | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<KbDocument | null>(null);

  // Poll only while something is actually in flight, then stop. Without the stop condition this
  // would hammer the endpoint forever on a settled corpus.
  useEffect(() => {
    const inFlight = documents.some(doc => KB_IN_FLIGHT_STATUSES.includes(doc.status));
    setPollInterval(inFlight ? POLL_INTERVAL_MS : 0);
  }, [documents]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setOffset(0);
  }, []);

  const handleRetry = useCallback(
    async (doc: KbDocument) => {
      try {
        await reindexDocument(doc.id).unwrap();
        toast.success(en.whatsappBot.corpus.retryQueued);
      } catch {
        toast.error(en.whatsappBot.corpus.saveFailed);
      }
    },
    [reindexDocument],
  );

  const handleArchiveConfirmed = useCallback(async () => {
    if (!archiveTarget) return;
    try {
      await archiveDocument(archiveTarget.id).unwrap();
      toast.success(en.whatsappBot.corpus.archiveSuccess);
    } catch {
      toast.error(en.whatsappBot.corpus.saveFailed);
    } finally {
      setArchiveTarget(null);
    }
  }, [archiveTarget, archiveDocument]);

  const handleUnarchive = useCallback(
    async (doc: KbDocument) => {
      try {
        await unarchiveDocument(doc.id).unwrap();
        toast.success(en.whatsappBot.corpus.unarchiveSuccess);
      } catch {
        toast.error(en.whatsappBot.corpus.saveFailed);
      }
    },
    [unarchiveDocument],
  );

  const columns: EntityTableColumn<KbDocument>[] = useMemo(
    () => [
      {
        key: "title",
        label: en.whatsappBot.corpus.columnTitle,
        sortKey: "title",
        render: doc => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{doc.title}</span>
            <span className="text-xs text-typography-500 flex items-center gap-2">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5">
                {en.whatsappBot.corpus.sourceType[doc.sourceType]}
              </span>
              {/* The filename or the URL's host — enough to identify the source without wrapping. */}
              {doc.fileName ?? (doc.sourceUrl ? safeHost(doc.sourceUrl) : null)}
              {doc.isArchived && (
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-typography-600">
                  {en.whatsappBot.corpus.archivedBadge}
                </span>
              )}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        label: en.whatsappBot.corpus.columnStatus,
        sortKey: "status",
        render: doc => (
          <DocumentStatusBadge status={doc.status} statusMessage={doc.statusMessage} />
        ),
      },
      {
        key: "chunks",
        label: en.whatsappBot.corpus.columnChunks,
        sortKey: "chunkCount",
        render: doc =>
          doc.chunkCount === 0 ? (
            <span className="text-typography-400">—</span>
          ) : (
            // Both numbers, so a partially indexed document shows real progress instead of looking
            // finished. ally-be advances indexedChunkCount per batch.
            <span>
              {doc.indexedChunkCount} {en.whatsappBot.corpus.indexedOf} {doc.chunkCount}
            </span>
          ),
      },
      {
        key: "organisations",
        label: en.whatsappBot.corpus.columnOrganisations,
        render: doc => {
          const summary = audienceSummary(doc.isGlobal, doc.tenantIds, tenantNames);
          return (
            <span
              className={
                summary.tone === "none"
                  ? // Called out rather than shown as a dash. "Available to nobody" is savable and
                    // otherwise indistinguishable from a document nobody happens to ask about.
                    "rounded bg-support-warning/20 px-1.5 py-0.5 text-xs text-typography-900"
                  : summary.tone === "all"
                    ? "rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-typography-700"
                    : "text-sm text-typography-700"
              }
              title={
                summary.tone === "some"
                  ? doc.tenantIds.map(id => tenantNames.get(id) ?? id).join(", ")
                  : undefined
              }
            >
              {summary.label}
            </span>
          );
        },
      },
      {
        key: "updatedAt",
        label: en.whatsappBot.corpus.columnUpdated,
        sortKey: "updatedAt",
        render: doc => (
          <span className="text-typography-600" title={formatDate(doc.updatedAt)}>
            {formatRelativeTime(doc.updatedAt)}
          </span>
        ),
      },
    ],
    [tenantNames],
  );

  const filterChips: FilterChipProps[] = useMemo(() => {
    if (!tenantFilter) return [];
    return [
      {
        label: en.whatsappBot.corpus.filterOrganisationLabel,
        value: tenantNames.get(tenantFilter) ?? tenantFilter,
        // One organisation at a time, so the "all values" expansion the chip offers for a
        // multi-select filter is just the one selected name.
        allValue: [tenantNames.get(tenantFilter) ?? tenantFilter],
        onClear: () => {
          setTenantFilter(null);
          setOffset(0);
        },
      },
    ];
  }, [tenantFilter, tenantNames]);

  const isFiltered = search.trim().length > 0 || Boolean(tenantFilter);

  return (
    <div className="pt-4">
      <p className="flex items-center gap-1 text-sm text-typography-600 pb-4">
        {en.whatsappBot.corpus.subtitle}
        <TooltipHint location={TooltipLocation.WA_CORPUS_STATUS} />
        <TooltipHint location={TooltipLocation.WA_CORPUS_CHUNKS} />
        <TooltipHint location={TooltipLocation.WA_CORPUS_SOURCE_TYPE} />
      </p>

      {stats && (
        <div className="flex gap-6 pb-4 text-sm">
          <Stat label={en.whatsappBot.corpus.statsIndexed} value={stats.byStatus.indexed ?? 0} />
          <Stat label={en.whatsappBot.corpus.statsFailed} value={stats.byStatus.failed ?? 0} />
          <Stat
            label={en.whatsappBot.corpus.statsInProgress}
            value={KB_IN_FLIGHT_STATUSES.reduce(
              (sum, status) => sum + (stats.byStatus[status] ?? 0),
              0,
            )}
          />
          <Stat label={en.whatsappBot.corpus.statsPassages} value={stats.indexedChunks} />
        </div>
      )}

      <ListToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        placeholder={en.whatsappBot.corpus.searchPlaceholder}
        action={{
          label: en.whatsappBot.corpus.create,
          onClick: () => {
            setEditing(null);
            setIsPanelOpen(true);
          },
        }}
        secondaryAction={{
          label: en.whatsappBot.corpus.refresh,
          // Polling stops once nothing is in flight, so a document wedged server-side needs a manual
          // nudge to pick up a status change.
          onClick: () => void refetch(),
        }}
        filterChips={filterChips}
        addFilterCta={{
          label: en.whatsappBot.corpus.filterButton,
          onClick: () => setIsFilterOpen(open => !open),
        }}
        addFilterButtonRef={addFilterBtnRef}
      />

      {/* Filtering by organisation shows what that customer can actually retrieve — its own
          documents PLUS the global ones — rather than only what is targeted at it. That is the
          question an admin has when a worker reports a gap, and the narrower reading would answer
          a different one. */}
      <FilterDropdown<{ organisation: string[] }>
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        sections={[
          {
            id: "organisation",
            label: en.whatsappBot.corpus.filterOrganisationLabel,
            options: (tenantData?.data ?? []).map(tenant => ({
              value: tenant.id,
              label: tenant.name,
            })),
          },
        ]}
        onApplyFilters={next => {
          // One organisation at a time: "what can these two customers both see" is not a question
          // the corpus can answer, since the audiences overlap through the global documents.
          setTenantFilter(next.organisation?.[0] ?? null);
          setOffset(0);
        }}
        anchorRect={addFilterBtnRef.current?.getBoundingClientRect() ?? null}
        currentFilters={{ organisation: tenantFilter ? [tenantFilter] : [] }}
      />

      <div className="py-3">
        <Checkbox
          id="wa-include-archived"
          labelText={en.whatsappBot.corpus.includeArchived}
          checked={includeArchived}
          onChange={(_event: unknown, { checked }: { checked: boolean }) => {
            setIncludeArchived(checked);
            setOffset(0);
          }}
        />
      </div>

      {/* A failed request gets its own notification with a retry, rather than being swallowed into
          an empty state that reads as "no documents". */}
      {isError && (
        <InlineNotification
          kind="error"
          title={en.whatsappBot.corpus.listError}
          subtitle={en.whatsappBot.corpus.listErrorSubtitle}
          lowContrast
          hideCloseButton
        />
      )}

      {isLoading && !documents.length && (
        <div className="py-6">
          <SkeletonText paragraph lineCount={6} />
        </div>
      )}

      {!isLoading && !isError && documents.length === 0 && (
        // Two distinct empty states. A "create your first document" CTA under an active search reads
        // as a bug, so the filtered variant hides the action and says something different.
        <EmptyState
          title={isFiltered ? en.whatsappBot.corpus.emptyFiltered : en.whatsappBot.corpus.empty}
          subtitle={
            isFiltered
              ? en.whatsappBot.corpus.emptyFilteredSubtitle
              : en.whatsappBot.corpus.emptySubtitle
          }
          actionLabel={en.whatsappBot.corpus.create}
          hideActionButton={isFiltered}
          onAction={() => {
            setEditing(null);
            setIsPanelOpen(true);
          }}
        />
      )}

      {documents.length > 0 && (
        <>
          <EntityTable
            columns={columns}
            rows={documents}
            sort={sort}
            onSortChange={next => {
              setSort(next);
              setOffset(0);
            }}
            rowClassName={doc => (doc.isArchived ? "opacity-60" : "")}
            actions={[
              {
                key: "retry",
                label: en.whatsappBot.corpus.retry,
                icon: <Refresh size={18} />,
                // Only offered where it means something. A Retry on an indexed document would just
                // spend embedding tokens to produce the same passages.
                hidden: doc => doc.status !== KbDocumentStatus.FAILED,
                onClick: doc => void handleRetry(doc),
              },
              {
                key: "unarchive",
                label: en.whatsappBot.corpus.unarchive,
                icon: <Unarchive size={18} />,
                hidden: doc => !doc.isArchived,
                onClick: doc => void handleUnarchive(doc),
              },
            ]}
            onEdit={doc => {
              setEditing(doc);
              setIsPanelOpen(true);
            }}
            onDelete={doc => setArchiveTarget(doc)}
          />

          <ListPagination
            offset={offset}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={setOffset}
            isFetching={isFetching}
          />
        </>
      )}

      <CorpusDocumentPanel
        isOpen={isPanelOpen}
        document={editing}
        onClose={() => {
          setIsPanelOpen(false);
          setEditing(null);
        }}
      />

      {/* "Delete" is archive: deleting would orphan every citation already recorded against the
          document, so the confirmation says what actually happens. */}
      <ActionConfirmationPopup
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={en.whatsappBot.corpus.archiveConfirmTitle}
        description={en.whatsappBot.corpus.archiveConfirmDescription}
        primaryButton={{
          label: en.whatsappBot.corpus.archive,
          onClick: () => void handleArchiveConfirmed(),
        }}
        secondaryButton={{
          label: en.common.cancel,
          onClick: () => setArchiveTarget(null),
        }}
      />
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <span className="flex flex-col">
    <span className="text-lg text-typography-900">{value}</span>
    <span className="text-xs text-typography-500">{label}</span>
  </span>
);

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
