// TODO: Remove this component once the BEHAVIOURS_AND_STATES_INSTRUCTION_FLAG is removed
import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { ButtonVariant } from "@src/components/types";
import { toast } from "sonner";

import { Plus, Trash } from "@assets";
import { Button, NotionTable } from "@components";
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
  regenerateButton?: ReactNode;
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
  regenerateButton,
}) => {
  const formData: BehaviourRow[] = formMethods.watch(id) ?? [];
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    if (formData.length === 0) {
      formMethods.setValue(id, [createEmptyFormValue()], { shouldDirty: false });
    }
  }, [formData.length, formMethods, id]);

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
    //TODO: max 10 behaviours instruction rows
    if (formData.length >= 10) {
      toast.error(en.errors.maxRowsBehavioursInstruction);
      return;
    }
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

  const handleDeleteSelectedRows = useCallback(() => {
    const updatedFormData = formData.filter(behavior => !selectedRows.includes(behavior.id));
    formMethods.setValue(id, updatedFormData, { shouldDirty: true });
    setSelectedRows([]);
  }, [formMethods, id, formData, selectedRows]);

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

  const handleSelectionChange = useCallback((selectedRows: any[]) => {
    setSelectedRows(selectedRows.map(row => row.id.value));
  }, []);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-base text-typography-900 font-primary flex gap-1 justify-between items-center min-h-10">
        <div className="flex gap-1 items-center">
          {en.simulation.behavioursInstruction}
          {isMandatory && <span className="text-destructive-500">*</span>}
        </div>
        <div className="flex gap-2 items-cente">
          {selectedRows.length > 0 && (
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={handleDeleteSelectedRows}
              className="!h-[30px]"
            >
              <Trash />
              {en.common.delete}
            </Button>
          )}
          {regenerateButton}
        </div>
      </div>
      <NotionTable
        tableData={tableData}
        tableFooter={tableFooter}
        onRowChange={handleRowChange}
        tableStyle={tableStyle}
        onSelectionChange={handleSelectionChange}
        autoHeight
      />
    </div>
  );
};
