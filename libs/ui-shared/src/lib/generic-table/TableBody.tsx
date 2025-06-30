import { Column } from "./types";

/**
 * Utility function to get a value from a row by key.
 */
function getValue<T extends Record<string, any>>(row: T, key: keyof T | string) {
  if (typeof key === "string" && key in row) return (row as any)[key];
  return row[key as keyof T];
}

/**
 * TableBody renders the table's <tbody> with data rows and optional row click handler.
 */
function TableBody<T extends Record<string, any>>({
  columns,
  data,
  fallbackUI,
  onRowClick,
}: {
  columns: Column<T>[];
  data: T[];
  fallbackUI?: React.ReactNode;
  onRowClick?: (row: T) => void;
}) {
  if (data?.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-400">
            {fallbackUI || "No data found."}
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody>
      {data?.map((row, rowIndex) => (
        <tr
          key={rowIndex}
          className="hover:bg-gray-100 cursor-pointer text-xs sm:text-sm"
          onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
          {columns?.map((col, columnIndex) => (
            <td
              key={col.key as string}
              className={`px-4 py-[10px] border-b border-gray-300 ${
                columnIndex === columns.length - 1 ? "border-r-0" : "border-r"
              } text-xs sm:text-sm ${col.className || ""}`}
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
}

export default TableBody;
