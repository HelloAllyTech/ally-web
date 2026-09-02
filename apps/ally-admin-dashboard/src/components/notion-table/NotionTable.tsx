import React, { useMemo, useEffect, useRef } from "react";

import clsx from "clsx";
import { useTable, useBlockLayout, useResizeColumns, useSortBy, useRowSelect } from "react-table";

import { InfiniteScroll } from "@ally-ui-mono/ui-shared";
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
  { indeterminate?: boolean; disabled?: boolean } & React.InputHTMLAttributes<HTMLInputElement>
>(({ indeterminate, disabled, ...rest }, ref) => {
  const defaultRef = React.useRef<HTMLInputElement>(null);
  const resolvedRef = (ref || defaultRef) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (resolvedRef.current) resolvedRef.current.indeterminate = indeterminate ?? false;
  }, [resolvedRef, indeterminate]);

  return (
    <input
      type="checkbox"
      disabled={disabled}
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

const SelectionRowCell = ({ row }) => {
  const isEditable = row.original?.isEditable?.value ?? true;
  const hideSelection = row.original?.hideSelection?.value ?? false;

  if (hideSelection) {
    return <div className="w-[30px]" />;
  }

  return (
    <div className="flex items-center justify-center w-[30px]">
      <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} disabled={!isEditable} />
    </div>
  );
};

const isSelectionColumn = (columnId: string) => columnId === SELECTION_COLUMN_ID;

// Skips row-click when the click lands on something with its own interactive
// behavior (the selection checkbox, an enabled control) so "row" trigger mode
// can't hijack a click meant for that control.
const ROW_CLICK_SKIP_SELECTOR =
  'input, textarea, select, button, [role="button"], a[href], [contenteditable="true"]';

const renderHeaderCell = (column: any, headerIndex: number, hasResizer: boolean) => {
  if (isSelectionColumn(column.id)) {
    return (
      <div className="relative w-full bg-white min-h-[45.5px] select-none border-r border-l border-border-light">
        <div className="flex items-center justify-center p-3 w-full h-full">
          {column.render("Header")}
        </div>
      </div>
    );
  }

  return <Header column={{ ...column, headerIndex, hasResizer: hasResizer }} />;
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
  infiniteScroll,
  autoHeight = false,
  editIndex = 1,
  hasResizer = true,
  hideSelectionColumn = false,
  fillWidth = false,
  rowClickTrigger = "hover",
}: NotionTableProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { columns = [], data = [] } = tableData || {};

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
      autoResetSelectedRows: true,
    },
    useBlockLayout,
    useResizeColumns,
    useSortBy,
    useRowSelect,
    hooks => {
      hooks.visibleColumns.push(columns =>
        hideSelectionColumn
          ? columns
          : [
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
            ],
      );
    },
  );

  const prevSelectedIdsRef = useRef<string>("");

  useEffect(() => {
    if (onSelectionChange) {
      const currentIds = Object.keys(selectedRowIds).sort().join(",");
      if (currentIds !== prevSelectedIdsRef.current) {
        prevSelectedIdsRef.current = currentIds;
        const selectedRows = selectedFlatRows.map(row => row.original);
        onSelectionChange(selectedRows);
      }
    }
  }, [selectedRowIds, onSelectionChange, selectedFlatRows]);

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

  const renderRows = () =>
    rows.map(row => {
      prepareRow(row);
      const rowProps = row.getRowProps();
      const { key, ...restRowProps } = rowProps;
      const rowIndex = row.index;
      const isEditable = row.original?.isEditable?.value ?? true;
      const visibleCells = row.cells;
      const isRowClickable = Boolean(onRowClick) && isEditable && rowClickTrigger === "row";

      return (
        <div
          key={key}
          {...restRowProps}
          onClick={
            isRowClickable
              ? event => {
                  if ((event.target as HTMLElement).closest(ROW_CLICK_SKIP_SELECTOR)) return;
                  onRowClick(rowIndex);
                }
              : undefined
          }
          className={clsx(
            "relative flex w-full border-border-light border-l",
            isEditable
              ? "hover:bg-background-secondary"
              : "opacity-80 cursor-not-allowed bg-gray-50",
            isRowClickable && "cursor-pointer",
          )}
          style={fillWidth ? { width: "100%" } : restRowProps.style}
        >
          {visibleCells.map((cell, cellIndex) => {
            const cellProps = cell.getCellProps();
            const { key: cellKey, ...restCellProps } = cellProps;
            const isLastCell = fillWidth && cellIndex === visibleCells.length - 1;
            return (
              <div
                key={cellKey}
                {...restCellProps}
                className="relative flex items-start border-b w-full px-3 py-[7px] border-r border-border-light group"
                style={{
                  backgroundColor: cell.column.id === "score" && cell.value.color,
                  ...(isLastCell
                    ? { flex: 1, minWidth: cell.column.minWidth }
                    : {
                        width: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.width,
                        minWidth: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.minWidth,
                        maxWidth: isSelectionColumn(cell.column.id)
                          ? SELECTION_COLUMN_WIDTH - 1
                          : cell.column.maxWidth,
                      }),
                }}
              >
                {onRowClick &&
                  rowClickTrigger === "hover" &&
                  cellIndex === editIndex &&
                  isEditable && (
                    <button
                      className="absolute ml-auto p-1 bg-white border-[1px] border-border-light shadow-md rounded-[3px] z-10 right-[6px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onRowClick(rowIndex)}
                    >
                      <DockToRight />
                    </button>
                  )}
                {renderTableCell(cell, rowIndex, row?.original, onRowChange)}
              </div>
            );
          })}
        </div>
      );
    });

  const rowElements = renderRows();

  return (
    <div
      ref={scrollContainerRef}
      style={tableStyle}
      className={clsx(
        "overflow-auto flex custom-scrollbar",
        !autoHeight && "h-[calc(100vh-160px)]",
      )}
    >
      <div
        {...getTableProps()}
        className={clsx("w-full font-primary text-sm", isTableResizing() && "select-none")}
      >
        <div className="flex w-full sticky top-0 z-10">
          {headerGroups.map(headerGroup => {
            const headerGroupProps = headerGroup.getHeaderGroupProps();
            const { key, ...restHeaderGroupProps } = headerGroupProps;
            return (
              <div
                key={key}
                {...restHeaderGroupProps}
                style={fillWidth ? { width: "100%" } : restHeaderGroupProps.style}
                className="flex w-full"
              >
                {headerGroup.headers.map((column, headerIndex) => {
                  const headerProps = column.getHeaderProps();
                  const { key: headerKey, ...restHeaderProps } = headerProps;
                  const colKey = headerKey ?? `${column.id}-${headerIndex}`;
                  const isLastHeader = fillWidth && headerIndex === headerGroup.headers.length - 1;

                  return (
                    <div
                      key={colKey}
                      {...restHeaderProps}
                      style={
                        isLastHeader
                          ? { flex: 1, minWidth: column.minWidth }
                          : {
                              width: column.width,
                              minWidth: column.minWidth,
                              maxWidth: column.maxWidth,
                            }
                      }
                      className={`border border-border-light border-r-0 ${hideSelectionColumn ? "border-l" : "border-l-0"}`}
                    >
                      {renderHeaderCell(column, headerIndex, hasResizer)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div {...getTableBodyProps()} className="w-full text-typography-900">
          {infiniteScroll ? (
            <InfiniteScroll
              onInfiniteScroll={infiniteScroll.onLoadMore}
              isLoading={infiniteScroll.isLoading}
              hasMore={infiniteScroll.hasMore}
              scrollContainerRef={scrollContainerRef}
            >
              {rowElements}
            </InfiniteScroll>
          ) : (
            rowElements
          )}
          {tableFooter}
        </div>
      </div>
    </div>
  );
};
