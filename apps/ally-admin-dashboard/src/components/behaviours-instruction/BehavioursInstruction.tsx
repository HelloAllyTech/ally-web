import { FC, useCallback, useMemo } from "react";

import { Plus } from "@assets";
import { NotionTable } from "@components";
import { BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS, en } from "@constants";
import { HelperTagItem } from "@types";

interface BehaviourRow {
  id?: string;
  category?: string;
  behaviors?: string[];
  instructions?: string;
}

interface BehavioursInstructionProps {
  formMethods: any;
  id: string;
  isMandatory: boolean;
}

const createEmptyFormValue = () => ({
  id: `temp-${Date.now()}`,
  category: "",
  behaviors: [] as string[],
  instructions: [] as string[],
});

export const BehavioursInstruction: FC<BehavioursInstructionProps> = ({
  formMethods,
  id,
  isMandatory,
}) => {
  const formData: BehaviourRow[] = formMethods.watch(id) ?? [];

  const createBehavioursInstructionObject = useCallback(
    (behavior: BehaviourRow) => ({
      id: { value: behavior?.id ?? "", disabled: false, rowId: behavior.id },
      category: { value: behavior?.category ?? "", disabled: false, rowId: behavior.id },
      behaviors: {
        value: behavior?.behaviors,
        disabled: false,
        rowId: behavior.id,
      },
      instructions: { value: behavior?.instructions ?? "", disabled: false, rowId: behavior.id },
    }),
    [],
  );

  const tableData = useMemo(
    () => ({
      data: formData.map(behavior => createBehavioursInstructionObject(behavior)),
      columns: BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS,
    }),
    [formData, createBehavioursInstructionObject],
  );

  const handleAddRow = useCallback(() => {
    const formValue = createEmptyFormValue();
    formMethods.setValue(id, [...formData, formValue], { shouldDirty: true });
  }, [formMethods, id, formData]);

  const handleRowChange = useCallback(
    (action: { columnId?: string; value?: string | HelperTagItem[]; rowId?: string }) => {
      const { columnId, value, rowId } = action;
      if (columnId == null || rowId == null || value === undefined) return;

      const newValue = value;

      const updatedFormData = formData.map(behavior =>
        behavior.id !== rowId ? behavior : { ...behavior, [columnId]: newValue },
      );
      formMethods.setValue(id, updatedFormData, { shouldDirty: true });
    },
    [formMethods, id, formData],
  );

  const tableFooter = (
    <button
      type="button"
      onClick={handleAddRow}
      className="w-fit border border-dashed px-3 py-2 flex text-typography-700 gap-3 items-center text-xs mt-2"
    >
      <Plus />
      {en.simulation.newRow}
    </button>
  );

  const tableStyle = { paddingBottom: "10px" };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-base text-typography-900 font-primary flex gap-1">
        {en.simulation.behavioursInstruction}
        {isMandatory && <span className="text-destructive-500">*</span>}
      </div>
      <NotionTable
        tableData={tableData}
        tableFooter={tableFooter}
        onRowChange={handleRowChange}
        tableStyle={tableStyle}
        autoHeight
        hideSelectionColumn
      />
    </div>
  );
};
