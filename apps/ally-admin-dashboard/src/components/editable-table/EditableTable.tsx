import { useState } from "react";

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@ally-ui-mono/ui-shared";

export const EditableTable = ({ columns, initialRows }) => {
  const [rows, setRows] = useState(initialRows);

  const updateCell = (rowIndex, key, value) => {
    setRows(prev =>
      prev.map((row, index) => (index === rowIndex ? { ...row, [key]: value } : row)),
    );
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <Table className="w-full min-w-full border-collapse text-left text-sm">
        <TableHead>
          <TableRow className="bg-gray-50">
            {columns.map(col => (
              <TableHeader
                key={String(col.key)}
                className="border-b border-r border-gray-200 px-4 py-3 text-left font-medium text-gray-700 last:border-r-0"
              >
                {col.header}
              </TableHeader>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={row.id ?? rowIndex} className="hover:bg-gray-50/50 transition-colors">
              {columns.map(column => (
                <TableCell
                  key={column.key}
                  className="border-b border-r border-gray-200 p-0 last:border-r-0"
                >
                  {column.editable ? (
                    <input
                      type="text"
                      className="w-full min-h-[40px] border-0 bg-transparent px-4 py-2.5 text-gray-900 focus:outline-none"
                      value={row[column.key] ?? ""}
                      onChange={e => updateCell(rowIndex, column.key, e.target.value)}
                    />
                  ) : (
                    <span className="block px-4 py-2.5 text-gray-900">{row[column.key] ?? ""}</span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
