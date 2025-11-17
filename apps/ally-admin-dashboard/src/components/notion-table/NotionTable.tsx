import React, { useMemo, useEffect } from "react";

import clsx from "clsx";
import { useTable, useBlockLayout, useResizeColumns, useSortBy, useRowSelect } from "react-table";

import { DockToRight } from "@assets";

import { Cell } from "./Cell";
import { Header } from "./Header";
import { NotionTableProps } from "./types";

const SELECTION_COLUMN_ID = "selection";
const SELECTION_COLUMN_WIDTH = 50;

const defaultColumn = {
  minWidth: 50,
  maxWidth: 1000,
  width: 150,
  Cell: Cell,
  Header: Header,
  sortType: "alphanumericFalsyLast",
};

const IndeterminateCheckbox = React.forwardRef<
  HTMLInputElement,
  { indeterminate?: boolean } & React.InputHTMLAttributes<HTMLInputElement>
>(({ indeterminate, ...rest }, ref) => {
  const defaultRef = React.useRef<HTMLInputElement>(null);
  const resolvedRef = (ref || defaultRef) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (resolvedRef.current) resolvedRef.current.indeterminate = indeterminate ?? false;
  }, [resolvedRef, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={resolvedRef}
      {...rest}
      className="w-4 h-4 text-black border-border-light rounded focus:ring-black cursor-pointer"
    />
  );
});

IndeterminateCheckbox.displayName = "IndeterminateCheckbox";

const SelectionHeaderCell = ({ getToggleAllRowsSelectedProps }) => (
  <div className="flex items-center justify-center w-[20px]">
    <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
  </div>
);

const SelectionRowCell = ({ row }) => (
  <div className="flex items-center justify-center w-[30px]">
    <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
  </div>
);

const isSelectionColumn = (columnId: string) => columnId === SELECTION_COLUMN_ID;

const renderHeaderCell = (column: any, headerIndex: number) => {
  if (isSelectionColumn(column.id)) {
    return (
      <div className="relative bg-white border-[1px] min-h-[45.5px] border-border-light select-none border-l-1">
        <div className="flex items-center justify-center p-3 w-full h-full">
          {column.render("Header")}
        </div>
      </div>
    );
  }

  return <Header column={{ ...column, headerIndex }} />;
};

const renderTableCell = (
  cell: any,
  rowIndex: number,
  row: any,
  onRowChange?: (action: any) => void,
) => {
  if (isSelectionColumn(cell.column.id)) {
    return cell.render("Cell");
  }

  return (
    <Cell
      value={cell.value}
      column={cell.column}
      rowIndex={rowIndex}
      row={row}
      onCellChange={onRowChange}
    />
  );
};

export const NotionTable = ({
  tableData,
  tableFooter,
  tableStyle = {},
  onRowChange,
  onRowClick,
  onSelectionChange,
}: NotionTableProps) => {
  const { columns, data } = tableData;

  // Auto-size columns based on content
  const autoSizedColumns = useMemo(() => {
    return columns.map(column => ({
      ...column,
      width: column.minWidth,
    }));
  }, [columns]);
  const sortTypes = useMemo(
    () => ({
      alphanumericFalsyLast(rowA, rowB, columnId, desc) {
        // Extract values from the {value, disabled} structure if present
        const getValueForSort = (cellData: any) => {
          if (cellData && typeof cellData === "object" && "value" in cellData) {
            return cellData.value;
          }
          return cellData;
        };

        const valueA = getValueForSort(rowA.values[columnId]);
        const valueB = getValueForSort(rowB.values[columnId]);

        if (!valueA && !valueB) {
          return 0;
        }

        if (!valueA) {
          return desc ? -1 : 1;
        }

        if (!valueB) {
          return desc ? 1 : -1;
        }

        return isNaN(valueA) ? valueA.localeCompare(valueB) : valueA - valueB;
      },
    }),
    [],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    selectedFlatRows,
    state: { selectedRowIds },
  } = useTable(
    {
      columns: autoSizedColumns,
      data,
      defaultColumn,
      dataDispatch: onRowChange,
      sortTypes,
    },
    useBlockLayout,
    useResizeColumns,
    useSortBy,
    useRowSelect,
    hooks => {
      hooks.visibleColumns.push(columns => [
        {
          id: "selection",
          minWidth: 50,
          width: 50,
          maxWidth: 50,
          disableResizing: true,
          Header: SelectionHeaderCell,
          Cell: SelectionRowCell,
        },
        ...columns,
      ]);
    },
  );

  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = selectedFlatRows.map(row => row.original);
      onSelectionChange(selectedRows);
    }
  }, [selectedRowIds, onSelectionChange]);

  function isTableResizing() {
    for (const headerGroup of headerGroups) {
      for (const column of headerGroup.headers) {
        if (column.isResizing) {
          return true;
        }
      }
    }

    return false;
  }

  return (
    <div style={tableStyle} className="overflow-auto flex h-[calc(100vh-160px)]">
      <div
        {...getTableProps()}
        className={clsx("w-full font-primary text-sm", isTableResizing() && "select-none")}
      >
        <div className="flex w-full sticky top-0 z-10">
          {headerGroups.map(headerGroup => {
            const headerGroupProps = headerGroup.getHeaderGroupProps();
            const { key, ...restHeaderGroupProps } = headerGroupProps;
            return (
              <div key={key} {...restHeaderGroupProps} className="flex w-full">
                {headerGroup.headers.map((column, headerIndex) => {
                  const colKey = column.getHeaderProps?.().key ?? `${column.id}-${headerIndex}`;
                  const headerProps = column.getHeaderProps();
                  const { ...restHeaderProps } = headerProps;

                  return (
                    <div
                      key={colKey}
                      {...restHeaderProps}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth,
                        maxWidth: column.maxWidth,
                      }}
                      className="border-1 border-border-light"
                    >
                      {renderHeaderCell(column, headerIndex)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div {...getTableBodyProps()} className="w-full text-typography-900">
          {rows.map(row => {
            prepareRow(row);
            const rowProps = row.getRowProps();
            const { key, ...restRowProps } = rowProps;
            const rowIndex = row.index;

            return (
              <div
                key={key}
                {...restRowProps}
                className="relative flex w-full border-b border-border-light hover:bg-background-secondary border-l"
              >
                {onRowClick && (
                  <button
                    className="absolute p-1 bg-white border-[1px] border-border-light shadow-md rounded-[3px] z-10 top-[12px] left-[190px] opacity-0 hover:opacity-100"
                    onClick={() => onRowClick(rowIndex)}
                  >
                    <DockToRight />
                  </button>
                )}
                {row.cells.map(cell => {
                  const cellProps = cell.getCellProps();
                  const { key: cellKey, ...restCellProps } = cellProps;

                  return (
                    <div
                      key={cellKey}
                      {...restCellProps}
                      className={`relative flex items-center w-full px-3 py-[7px] border-r border-border-light`}
                      style={{
                        width: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.width,
                        minWidth: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.minWidth,
                        maxWidth: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.maxWidth,
                      }}
                    >
                      {renderTableCell(cell, rowIndex, row?.original, onRowChange)}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {tableFooter}
        </div>
      </div>
    </div>
  );
};
