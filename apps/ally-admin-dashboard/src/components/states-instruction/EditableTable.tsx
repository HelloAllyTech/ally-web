import React, { useState, useEffect } from "react";

export interface EditableColumn {
  key: string;
  header: string;
  editable?: boolean;
  width?: string | number;
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
    e: React.ChangeEvent<HTMLInputElement>,
    rowIndex: number,
    key: string,
  ) => {
    const value = e.target.value;
    setRows(prev =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
    onRowChange?.(rowIndex, key, value);
  };

  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
      <table className="w-full min-w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="border-b border-r  border-border-light px-4 py-3 font-medium text-gray-700 font-primary"
                style={{ minWidth: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
              {columns.map(column => (
                <td
                  key={`${rowIndex}-${column.key}`}
                  className="border-b border-r border-gray-200 p-0 last:border-r-0"
                >
                  {column.editable ? (
                    <input
                      type="text"
                      value={row[column.key] ?? ""}
                      onChange={e => handleInputChange(e, rowIndex, column.key)}
                      className="w-full min-h-[40px] border-0 bg-transparent px-4 py-2.5 outline-none"
                    />
                  ) : (
                    <span className="px-4 py-2.5 text-gray-900">{row[column.key] ?? ""}</span>
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
