import { useCallback, useEffect, useMemo, useState } from "react";

import { useGetBehavioursInstructionQuery } from "@api";
import { Plus } from "@assets";
import { NotionTable } from "@components";
import { BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS, en } from "@constants";

const LIMIT = 30;

const createBehavioursInstructionObject = (behaviour: any, rowId: string) => ({
  id: {
    value: behaviour?.id ?? "",
    disabled: false,
    rowId,
  },
  category: {
    value: behaviour?.category ?? "",
    disabled: false,
    rowId,
  },
  behaviours: {
    value: Array.isArray(behaviour?.behaviours) ? behaviour.behaviours : [],
    disabled: false,
    rowId,
  },
  response: {
    value: behaviour?.response ?? "",
    disabled: false,
    rowId,
  },
});

const createEmptyBehavioursInstructionObject = () => {
  const rowId = `new-${Date.now()}`;
  return createBehavioursInstructionObject({ category: "", behaviours: [], response: "" }, rowId);
};

export const BehavioursInstruction = () => {
  const [offset, setOffset] = useState<number>(0);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { data: behavioursInstructionData, isLoading } = useGetBehavioursInstructionQuery({
    limit: LIMIT,
    offset: 0,
  });

  useEffect(() => {
    if (behavioursInstructionData) {
      setTableRows(prev => {
        const dataRows = behavioursInstructionData.map(behaviour =>
          createBehavioursInstructionObject(behaviour, behaviour.id),
        );
        if (offset === 0) {
          const userAddedRows = prev.filter(row => row.id?.rowId?.toString().startsWith("new-"));
          return [...dataRows, ...userAddedRows];
        }
        const existingIds = new Set(prev.map(row => row.id?.rowId));
        const newIds = dataRows.filter(row => !existingIds.has(row.id?.rowId));
        return [...prev, ...newIds];
      });
      setHasMore(behavioursInstructionData.length === LIMIT);
    }
  }, [behavioursInstructionData, offset]);

  const handleLoadMore = () => {
    if (isLoading || !hasMore) return;
    setOffset(prev => prev + LIMIT);
  };

  const handleAddRow = useCallback(() => {
    setTableRows(prev => [...prev, createEmptyBehavioursInstructionObject()]);
  }, []);

  const handleRowChange = async (action: { columnId?: string; value?: any; rowId?: string }) => {
    const { columnId, value, rowId } = action;
    if (columnId == null || rowId == null) return;
    const selectedRow = tableRows.find(row => row?.id === rowId);
    if (value !== undefined && selectedRow) {
      const updatedRow = { ...selectedRow, [columnId]: { ...selectedRow[columnId], value } };
      setTableRows(prev => prev.map(row => (row?.id === rowId ? updatedRow : row)));
    }
  };

  const tableData = useMemo(
    () => ({
      data: tableRows,
      columns: BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS,
    }),
    [tableRows],
  );

  const tableFooter = (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleLoadMore}
        className="flex justify-start items-center text-typography-700 hover:text-typography-900 disabled:opacity-50 w-[200px]"
        disabled={isLoading || !hasMore}
      >
        <span className="text-base font-primary">
          {isLoading ? en.common.loading : hasMore ? `+ ${en.common.loadMore}` : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={handleAddRow}
        className="w-fit border border-dashed px-3 py-2 flex text-typography-700 gap-3 items-center text-xs mt-2"
      >
        <Plus />
        {en.simulation.newRow}
      </button>
    </div>
  );
  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-base text-typography-900 font-primary">
        {en.simulation.behavioursInstruction}
      </div>
      <NotionTable
        tableData={tableData}
        tableFooter={tableFooter}
        onRowChange={handleRowChange}
        autoHeight
      />
    </div>
  );
};
