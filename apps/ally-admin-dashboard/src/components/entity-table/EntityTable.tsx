import React from "react";

import { ArrowDown, ArrowUp, Delete, Edit } from "@icons";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";

export interface EntityTableColumn<T> {
  key: string;
  label: string;
  /** Custom cell renderer; falls back to String(row[key]). */
  render?: (row: T) => React.ReactNode;
  className?: string;
  /**
   * Server-side sort key for this column. Omit and the header stays inert.
   *
   * Sorting is a SERVER concern here on purpose: every list using this table is server-paged, so
   * reordering the 25 rows on screen would present itself as sorting 342 and quietly be wrong. A
   * column is only sortable when the endpoint behind it can sort.
   */
  sortKey?: string;
}

export interface EntityTableSort {
  key: string;
  direction: "asc" | "desc";
}

/** An extra per-row action beyond Edit/Delete. */
export interface EntityTableAction<T> {
  /** Stable key, also used as the accessible label fallback. */
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: (row: T) => void;
  /** Hide this action for a given row — e.g. Retry only on a failed document. */
  hidden?: (row: T) => boolean;
  className?: string;
}

interface EntityTableProps<T extends { id: string }> {
  columns: EntityTableColumn<T>[];
  rows: T[];
  /** Convenience sugar for the common Edit action. */
  onEdit?: (row: T) => void;
  /** Convenience sugar for the common Delete action. */
  onDelete?: (row: T) => void;
  /** Arbitrary extra actions, rendered before Edit/Delete. */
  actions?: EntityTableAction<T>[];
  /** Per-row class, e.g. dimming an archived row. */
  rowClassName?: (row: T) => string;
  actionsLabel?: string;
  /** Current sort. Omit (with `onSortChange`) to leave every header inert. */
  sort?: EntityTableSort;
  onSortChange?: (sort: EntityTableSort) => void;
}

/**
 * Lightweight table with per-row actions, shared by the admin CRUD tabs.
 *
 * Promoted from AI Lab's LabTable rather than copied: it was already generic, and a second copy in
 * the WhatsApp bot tab would have been the largest duplication in that feature. Built on the shared
 * Carbon primitives so it reads like the rest of the admin app without pulling in the full
 * NotionTable machinery (react-table, resizing, editable cells) that a read-only server-paged list
 * does not need.
 *
 * `onEdit`/`onDelete` are kept as sugar so the AI Lab call sites are unchanged; `actions` is the
 * general form for anything else.
 */
export function EntityTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
  actions,
  rowClassName,
  actionsLabel = "Actions",
  sort,
  onSortChange,
}: EntityTableProps<T>) {
  const hasActions = Boolean(onEdit || onDelete || actions?.length);

  // A column is sortable only when it declares a key AND the caller wired a handler. Both halves
  // matter: a header that looks clickable and does nothing is worse than a plain one.
  const sortableKeyOf = (col: EntityTableColumn<T>) =>
    onSortChange && col.sortKey ? col.sortKey : undefined;

  const toggleSort = (sortKey: string) => {
    // First click on a new column sorts descending. These are logs and worklists — newest, biggest,
    // worst first is what a reader wants from a column they just reached for.
    const direction = sort?.key === sortKey && sort.direction === "desc" ? "asc" : "desc";
    onSortChange?.({ key: sortKey, direction });
  };

  return (
    <div className="border border-border-light rounded-md overflow-hidden">
      <Table className="w-full text-left font-primary text-base">
        <TableHead>
          <TableRow className="bg-background-secondary text-typography-700 text-sm">
            {columns.map(col => {
              const sortKey = sortableKeyOf(col);
              const isSorted = Boolean(sortKey && sort?.key === sortKey);

              return (
                <TableHeader
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.className ?? ""}`}
                  // aria-sort is what tells a screen-reader user the table is ordered and by which
                  // column; the arrow glyph alone says nothing to one.
                  aria-sort={
                    isSorted
                      ? sort?.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : sortKey
                        ? "none"
                        : undefined
                  }
                >
                  {sortKey ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
                      onClick={() => toggleSort(sortKey)}
                    >
                      {col.label}
                      {isSorted &&
                        (sort?.direction === "asc" ? (
                          <ArrowUp size={14} />
                        ) : (
                          <ArrowDown size={14} />
                        ))}
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHeader>
              );
            })}
            {hasActions && (
              <TableHeader className="px-4 py-3 font-medium text-right w-[140px]">
                {actionsLabel}
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow
              key={row.id}
              className={`border-t border-border-light hover:bg-background-secondary/50 transition-colors ${
                rowClassName?.(row) ?? ""
              }`}
            >
              {columns.map(col => (
                <TableCell
                  key={col.key}
                  className={`px-4 py-3 text-typography-900 align-top ${col.className ?? ""}`}
                >
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </TableCell>
              ))}
              {hasActions && (
                <TableCell className="px-4 py-3 align-top">
                  <div className="flex items-center justify-end gap-3 text-typography-600">
                    {actions
                      ?.filter(action => !action.hidden?.(row))
                      .map(action => (
                        <button
                          key={action.key}
                          onClick={() => action.onClick(row)}
                          className={`hover:text-primary-600 ${action.className ?? ""}`}
                          aria-label={action.label}
                          title={action.label}
                        >
                          {action.icon}
                        </button>
                      ))}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        className="hover:text-primary-600"
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Edit size={18} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        className="hover:text-destructive-600"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Delete size={18} />
                      </button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
