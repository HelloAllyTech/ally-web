import React from "react";

import { Delete, Edit } from "@icons";

export interface LabTableColumn<T> {
  key: string;
  label: string;
  /** Custom cell renderer; falls back to String(row[key]). */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface LabTableProps<T extends { id: string }> {
  columns: LabTableColumn<T>[];
  rows: T[];
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
}

/**
 * Lightweight, self-contained table with per-row Edit/Delete actions for the
 * AI Lab CRUD tabs. Uses the shared design tokens so it reads like the rest of
 * the admin app without pulling in the full NotionTable machinery.
 */
export function LabTable<T extends { id: string }>({
  columns,
  rows,
  onEdit,
  onDelete,
}: LabTableProps<T>) {
  return (
    <div className="border border-border-light rounded-md overflow-hidden">
      <table className="w-full text-left font-primary text-base">
        <thead>
          <tr className="bg-background-secondary text-typography-700 text-sm">
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.className ?? ""}`}>
                {col.label}
              </th>
            ))}
            <th className="px-4 py-3 font-medium text-right w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={row.id}
              className="border-t border-border-light hover:bg-background-secondary/50 transition-colors"
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-typography-900 align-top ${col.className ?? ""}`}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
              <td className="px-4 py-3 align-top">
                <div className="flex items-center justify-end gap-3 text-typography-600">
                  <button
                    onClick={() => onEdit(row)}
                    className="hover:text-primary-600"
                    aria-label="Edit"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(row)}
                    className="hover:text-destructive-600"
                    aria-label="Delete"
                    title="Delete"
                  >
                    <Delete size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
