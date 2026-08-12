import React from "react";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

interface ListPaginationProps {
  /** Zero-based offset of the current page. */
  offset: number;
  pageSize: number;
  total: number;
  onChange: (offset: number) => void;
  /**
   * True while a page request is in flight. Surfaced as "updating…" rather than as a spinner that
   * replaces the list: the previous page stays readable while the next one loads, so paging does
   * not flash the table out of existence on every click.
   */
  isFetching?: boolean;
}

/**
 * Server-paged list footer: the visible range, the total, and Previous/Next.
 *
 * One component rather than the copy that had grown in each of the corpus, conversation and
 * unanswered tabs — three hand-rolled `<button className="px-3 py-1 border…">` pairs that matched
 * neither each other nor the app's Button. Follows RoleplaySessionLogs, which is the established
 * shape for a server-paged footer here.
 *
 * The range is stated as "Showing 26–50 of 342" rather than a page number, because the pages are
 * server offsets: "page 2" means nothing to a reader who cannot see how big a page is.
 */
export const ListPagination: React.FC<ListPaginationProps> = ({
  offset,
  pageSize,
  total,
  onChange,
  isFetching = false,
}) => {
  const canPrev = offset > 0;
  const canNext = offset + pageSize < total;
  // Clamped so an empty result never renders "Showing 1–0 of 0".
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + pageSize, total);

  return (
    <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
      <span className="text-sm text-typography-700">
        {en.common.showing} {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} {en.common.of}{" "}
        {total.toLocaleString()}
        {isFetching ? ` · ${en.common.updating}` : ""}
      </span>
      <div className="flex gap-2">
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={() => onChange(Math.max(0, offset - pageSize))}
          disabled={!canPrev}
          className="h-[36px] px-4"
        >
          {en.common.previous}
        </Button>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={() => onChange(offset + pageSize)}
          disabled={!canNext}
          className="h-[36px] px-4"
        >
          {en.common.next}
        </Button>
      </div>
    </div>
  );
};
