import { FC, ReactNode, useMemo, useState } from "react";

import { NoResults, SearchIcon } from "@assets";
import { Input, ToggleSwitch } from "@components";
import { useDebounce } from "@hooks";

/**
 * A single assignable item rendered by {@link OrgAccessList}. Covers the
 * scenario / path / case rows, all of which expose the same fields.
 */
export interface OrgAccessItem {
  /** Number for scenarios/paths, uuid string for courses (Track 2.0). */
  id: number | string;
  title: string;
  description: string;
  coverImageUrl?: string;
  isAssignedToTenant: boolean;
  /** Present for paths/cases — shows an "N scenarios" overlay on the thumbnail. */
  totalScenarios?: number;
}

interface OrgAccessListProps {
  items: OrgAccessItem[];
  isLoading: boolean;
  /** True while more rows are being fetched for the current search/page. */
  isFetching?: boolean;
  /** True when the last page came back full — shows the Load more button. */
  hasMore: boolean;
  /** Ids currently mid-flight for a toggle, to disable the switch. */
  pendingIds?: Set<number | string>;
  searchPlaceholder: string;
  emptyLabel: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: number | string, enabled: boolean) => void;
  onLoadMore: () => void;
  /**
   * Optional extra control rendered on each row, left of the enable toggle.
   *
   * A render prop rather than cohort-specific props so this list stays unaware
   * that cohorts exist — the Badges tab and any future tab can keep using it
   * with no cohort concept at all. Only rendered for rows that are actually
   * assigned to the tenant: restricting content the org does not have would be
   * a control with nothing to act on.
   */
  renderRowAction?: (item: OrgAccessItem) => ReactNode;
}

const RowSkeleton = () => (
  <div className="flex items-center justify-between gap-4 border border-border-light rounded p-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded bg-neutral-200" />
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 bg-neutral-200 rounded" />
        <div className="h-3 w-56 bg-neutral-200 rounded" />
      </div>
    </div>
    <div className="h-6 w-11 rounded-full bg-neutral-200" />
  </div>
);

const Thumbnail: FC<{ item: OrgAccessItem }> = ({ item }) => (
  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-neutral-100">
    {item.coverImageUrl ? (
      <img src={item.coverImageUrl} alt="" className="h-full w-full object-cover" />
    ) : null}
    {typeof item.totalScenarios === "number" && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[11px] font-medium text-white">
        {item.totalScenarios}
      </div>
    )}
  </div>
);

/**
 * Generic searchable list of assignable items with a per-row on/off toggle.
 * Toggling fires immediately (optimistic handling lives in the parent). Shared
 * by the Simulations, Path and Cases tabs of the Org. Settings screen.
 */
export const OrgAccessList: FC<OrgAccessListProps> = ({
  items,
  isLoading,
  isFetching,
  hasMore,
  pendingIds,
  searchPlaceholder,
  emptyLabel,
  onSearchChange,
  onToggle,
  onLoadMore,
  renderRowAction,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce((value: string) => onSearchChange(value), 300);

  const header = useMemo(
    () => (
      <div className="relative w-full max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-500">
          <SearchIcon />
        </span>
        <Input
          value={searchInput}
          onChange={e => {
            setSearchInput(e.target.value);
            debouncedSearch(e.target.value);
          }}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div>
    ),
    [searchInput, searchPlaceholder, debouncedSearch],
  );

  const renderBody = (): ReactNode => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map(i => (
            <RowSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-typography-600">
          <NoResults />
          <span className="text-sm">{emptyLabel}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {items.map(item => {
          const isPending = pendingIds?.has(item.id) ?? false;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded border border-border-light p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Thumbnail item={item} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-typography-900">
                    {item.title}
                  </span>
                  <span className="truncate text-xs text-typography-600">{item.description}</span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                {item.isAssignedToTenant ? renderRowAction?.(item) : null}
                <div className={isPending ? "pointer-events-none opacity-50" : ""}>
                  <ToggleSwitch
                    enabled={item.isAssignedToTenant}
                    onChange={enabled => onToggle(item.id, enabled)}
                    label={item.title}
                  />
                </div>
                <span className="w-16 text-sm text-typography-900">
                  {item.isAssignedToTenant ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetching}
            className="mt-1 self-center text-sm font-medium text-primary-500 disabled:opacity-50"
          >
            {isFetching ? "Loading..." : "+ Load more"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 font-primary">
      {header}
      {renderBody()}
    </div>
  );
};

export default OrgAccessList;
