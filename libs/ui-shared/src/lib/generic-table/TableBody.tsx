"use client";
import React from "react";

import { Column } from "./types";

/**
 * Utility function to get a value from a row by key.
 * @template T
 * @param {T} row - The data row.
 * @param {keyof T | string} key - The key to access.
 * @returns {any} The value from the row.
 */
function getValue<T extends Record<string, any>>(row: T, key: keyof T | string) {
  if (typeof key === "string" && key in row) return (row as any)[key];
  return row[key as keyof T];
}

/**
 * TableBody renders the table's <tbody> with data rows and optional row click handler.
 *
 * @template T - The type of data for each row.
 * @param {Object} props - The props for the table body.
 * @param {Column<T>[]} props.columns - The column definitions.
 * @param {T[]} props.data - The data rows.
 * @param {React.ReactNode} [props.fallbackUI] - The fallback UI if no data.
 * @param {(row: T) => void} [props.onRowClick] - Optional row click handler.
 */
const TableBody = <T extends Record<string, any>>({
  columns,
  data,
  fallbackUI,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  fallbackUI?: React.ReactNode;
  onRowClick?: (row: T) => void;
}) => {
  // Filter-only columns (hidden) are offered as filters but never rendered.
  const visibleColumns = columns.filter(col => !col.hidden);

  /**
   * Render the fallback UI if no data is provided.
   * @returns {React.ReactNode} - The fallback UI.
   */
  if (!data || data.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={visibleColumns.length} className="px-4 py-6 text-center text-gray-400">
            {fallbackUI || "No data found."}
          </td>
        </tr>
      </tbody>
    );
  }

  /**
   * Render the table body.
   * @returns {React.ReactNode} - The table body.
   */
  return (
    <tbody>
      {data.map((row, rowIndex) => (
        <tr
          key={rowIndex}
          className="hover:bg-gray-100 cursor-pointer"
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {visibleColumns.map((col, columnIndex) => (
            <td
              key={col.key as string}
              className={`px-4 min-h-[36px] border-b border-gray-300 font-primary ${
                columnIndex === visibleColumns.length - 1 ? "border-r-0" : "border-r"
              } ${col.className || ""}`}
              style={col.style}
            >
              {col.render
                ? col.render(getValue(row, col.key), row)
                : String(getValue(row, col.key) ?? "")}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
};

export default TableBody;
