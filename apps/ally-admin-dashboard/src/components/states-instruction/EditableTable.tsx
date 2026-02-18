import React, { useState, useEffect } from "react";

export interface EditableColumn {
  key: string;
  header: string;
  editable?: boolean;
  width?: string | number;
  format?: (value: unknown) => string;
}

export interface EditableTableProps {
  columns: EditableColumn[];
  data: any[];
  onRowChange?: (rowIndex: number, key: string, value: any) => void;
  className?: string;
}

export const EditableTable = ({
  columns,
  data,
  onRowChange,
  className = "",
}: EditableTableProps) => {
  const [rows, setRows] = useState<any[]>(data);

  useEffect(() => {
    setRows(data);
  }, [data]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    rowIndex: number,
    key: string,
  ) => {
    const value = e.target.value;
    setRows(prev =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  const handleBlur = (rowIndex: number, key: string, value: any) => {
    onRowChange?.(rowIndex, key, value);
  };

  return (
    <div className={`w-full overflow-x-auto border border-gray-200 ${className}`}>
      <table className="w-full min-w-full table-auto border-collapse text-left text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="border-b border-r last:border-r-0 border-border-light px-4 py-3 font-medium text-gray-700 font-primary"
                style={{ minWidth: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
              {columns.map(column => (
                <td
                  key={`${rowIndex}-${column.key}`}
                  className={`${rowIndex === rows.length - 1 ? "border-b-0" : "border-b"} border-b border-r border-gray-200 p-0 last:border-r-0 align-top`}
                >
                  {column.editable ? (
                    <textarea
                      value={row[column.key] ?? ""}
                      onChange={e => handleInputChange(e, rowIndex, column.key)}
                      onBlur={() => handleBlur(rowIndex, column.key, row[column.key])}
                      rows={3}
                      className="w-full min-h-[40px] overflow-y-auto custom-scrollbar border-0 bg-transparent px-4 py-2.5 outline-none resize-none"
                    />
                  ) : (
                    <span className="block px-4 py-2.5 text-gray-900 whitespace-pre-wrap break-words">
                      {column.format
                        ? column.format(row[column.key])
                        : String(row[column.key] ?? "")}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
