/**
 * Offset-pagination math for the opportunity table.
 *
 * The list endpoint has always been paged (`limit`/`offset`, with `count` as the unpaged total
 * and a deterministic id tiebreak so pages can't repeat or skip a row) — the board just never
 * shipped a control for it, so 184 opportunities read as "50 of 184" with no way to reach the
 * other 134.
 *
 * Kept as a pure function so the off-by-one cases have tests: an empty result set must show
 * "0–0", and the last page must not claim rows past `total`.
 */
export interface RoadmapPageRange {
  /** 1-based index of the first row on this page; 0 when there are no rows at all. */
  rangeStart: number;
  /** 1-based index of the last row on this page, never past `total`. */
  rangeEnd: number;
  /** 1-based page number. */
  page: number;
  /** At least 1, so "Page 1 of 1" reads sanely on an empty list. */
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  prevOffset: number;
  nextOffset: number;
}

export const pageRange = (offset: number, pageSize: number, total: number): RoadmapPageRange => {
  const canNext = offset + pageSize < total;
  return {
    rangeStart: total === 0 ? 0 : offset + 1,
    rangeEnd: Math.min(offset + pageSize, total),
    page: Math.floor(offset / pageSize) + 1,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    canPrev: offset > 0,
    canNext,
    prevOffset: Math.max(0, offset - pageSize),
    nextOffset: canNext ? offset + pageSize : offset,
  };
};
