import { FC, useCallback, useMemo } from "react";

import { Plus } from "@assets";
import { NotionTable } from "@components";
import { BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS, en } from "@constants";

interface BehaviourRow {
  id?: string;
  category?: string;
  behaviours?: string[];
  response?: string;
}

interface BehavioursInstructionProps {
  formMethods: any;
  id: string;
}

const createEmptyFormValue = () => ({
  id: `new-${Date.now()}`,
  category: "",
  behaviours: [] as string[],
  response: "",
});

export const BehavioursInstruction: FC<BehavioursInstructionProps> = ({ formMethods, id }) => {
  const formData: BehaviourRow[] = formMethods.watch(id) ?? [];

  const createBehavioursInstructionObject = useCallback(
    (behaviour: BehaviourRow) => ({
      id: { value: behaviour?.id ?? "", disabled: false, rowId: behaviour.id },
      category: { value: behaviour?.category ?? "", disabled: false, rowId: behaviour.id },
      behaviours: {
        value: Array.isArray(behaviour?.behaviours) ? behaviour.behaviours : [],
        disabled: false,
        rowId: behaviour.id,
      },
      response: { value: behaviour?.response ?? "", disabled: false, rowId: behaviour.id },
    }),
    [],
  );

  const tableData = useMemo(
    () => ({
      data: formData.map(behaviour => createBehavioursInstructionObject(behaviour)),
      columns: BEHAVIOURS_INSTRUCTION_TABLE_COLUMNS,
    }),
    [formData, createBehavioursInstructionObject],
  );

  const handleAddRow = useCallback(() => {
    const formValue = createEmptyFormValue();
    formMethods.setValue(id, [...formData, formValue], { shouldDirty: true });
  }, [formMethods, id, formData]);

  const handleRowChange = useCallback(
    (action: { columnId?: string; value?: string; rowId?: string }) => {
      const { columnId, value, rowId } = action;
      if (columnId == null || rowId == null || value === undefined) return;

      const updatedFormData = formData.map(behaviour =>
        behaviour.id !== rowId ? behaviour : { ...behaviour, [columnId]: value },
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
