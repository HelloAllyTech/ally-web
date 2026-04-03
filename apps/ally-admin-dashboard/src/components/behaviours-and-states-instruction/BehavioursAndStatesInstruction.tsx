import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Plus, Trash } from "@assets";
import { Button, NotionTable } from "@components";
import {
  BEHAVIOURS_AND_STATES_INSTRUCTION_TABLE_COLUMNS,
  BEHAVIOUR_STATES,
  en,
  FORM_FIELD_IDS,
} from "@constants";
import { ButtonVariant } from "@src/components/types";
import { behaviourStateInstruction, HelperTagItem } from "@types";

interface BehaviourRow {
  id?: string;
  category?: string;
  behaviors?: string[];
  instructions?: string[];
  stateInstructions?: behaviourStateInstruction[];
}

interface BehavioursAndStatesInstructionProps {
  formMethods: any;
  id: string;
  isMandatory: boolean;
  regenerateButton?: ReactNode;
}

const STATE_NAMES_ROW_ID = "state-names-row";

const createEmptyFormValue = (): BehaviourRow => ({
  id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  category: "",
  behaviors: [],
  instructions: [],
  stateInstructions: BEHAVIOUR_STATES.map(state => ({
    stateId: state.stateId,
    instruction: "",
  })),
});

export const BehavioursAndStatesInstruction: FC<BehavioursAndStatesInstructionProps> = ({
  formMethods,
  id,
  isMandatory,
  regenerateButton,
}) => {
  const formData: BehaviourRow[] = formMethods.watch(id) ?? [];
  const stateNames: { stateId: string; name: string }[] =
    formMethods.watch(FORM_FIELD_IDS.STATE_NAMES) ?? [];
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  useEffect(() => {
    if (formData.length === 0) {
      formMethods.setValue(id, [createEmptyFormValue()], { shouldDirty: false });
    }
  }, [formData.length, formMethods, id]);

  const stateNamesDict = useMemo(() => {
    return stateNames.reduce(
      (acc, curr) => ({ ...acc, [curr.stateId]: curr.name }),
      {} as Record<string, string>,
    );
  }, [stateNames]);

  const createTableRowObject = useCallback((behavior: BehaviourRow) => {
    const row: Record<string, any> = {
      id: { value: behavior?.id ?? "", disabled: false, rowId: behavior.id },
      category: { value: behavior?.category ?? "", disabled: false, rowId: behavior.id },
      behaviors: { value: behavior?.behaviors, disabled: false, rowId: behavior.id },
    };

    BEHAVIOUR_STATES.forEach(state => {
      const stateInst = behavior.stateInstructions?.find(s => s.stateId === state.stateId);
      row[`stateInstruction_${state.stateId}`] = {
        value: stateInst?.instruction ?? "",
        disabled: false,
        rowId: behavior.id,
      };
    });

    return row;
  }, []);

  const createStateNamesRow = useCallback((names: Record<string, string>) => {
    const row: Record<string, any> = {
      id: { value: STATE_NAMES_ROW_ID, disabled: true, rowId: STATE_NAMES_ROW_ID },
      category: { value: "State names", disabled: true, rowId: STATE_NAMES_ROW_ID },
      behaviors: { value: [], disabled: true, rowId: STATE_NAMES_ROW_ID },
      hideSelection: { value: true },
    };

    BEHAVIOUR_STATES.forEach(state => {
      row[`stateInstruction_${state.stateId}`] = {
        value: names[state.stateId] ?? "",
        disabled: false,
        rowId: STATE_NAMES_ROW_ID,
        placeholder: en.simulation.addStateName,
      };
    });

    return row;
  }, []);

  const tableData = useMemo(
    () => ({
      data: [
        createStateNamesRow(stateNamesDict),
        ...formData.map(behavior => createTableRowObject(behavior)),
      ],
      columns: BEHAVIOURS_AND_STATES_INSTRUCTION_TABLE_COLUMNS.map(col => {
        if (col.id.startsWith("stateInstruction_")) {
          return { ...col, label: col.label };
        }
        return col;
      }),
    }),
    [formData, stateNamesDict, createTableRowObject, createStateNamesRow],
  );

  const handleAddRow = useCallback(() => {
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

      if (rowId === STATE_NAMES_ROW_ID) {
        if (columnId.startsWith("stateInstruction_")) {
          const stateId = columnId.replace("stateInstruction_", "");
          const updatedArray = [...stateNames];
          const index = updatedArray.findIndex(s => s.stateId === stateId);
          if (index >= 0) {
            updatedArray[index] = { ...updatedArray[index], name: value as string };
          } else {
            updatedArray.push({ stateId, name: value as string });
          }
          formMethods.setValue(FORM_FIELD_IDS.STATE_NAMES, updatedArray, { shouldDirty: true });
        }
        return;
      }

      if (columnId.startsWith("stateInstruction_")) {
        const stateId = columnId.replace("stateInstruction_", "");
        const updatedFormData = formData.map(behavior => {
          if (behavior.id !== rowId) return behavior;
          const stateInstructions = [...(behavior.stateInstructions || [])];
          const existingIndex = stateInstructions.findIndex(s => s.stateId === stateId);
          if (existingIndex >= 0) {
            stateInstructions[existingIndex] = { stateId, instruction: value as string };
          } else {
            stateInstructions.push({ stateId, instruction: value as string });
          }
          return { ...behavior, stateInstructions };
        });
        formMethods.setValue(id, updatedFormData, { shouldDirty: true });
      } else {
        const updatedFormData = formData.map(behavior =>
          behavior.id !== rowId ? behavior : { ...behavior, [columnId]: value },
        );
        formMethods.setValue(id, updatedFormData, { shouldDirty: true });
      }
    },
    [formMethods, id, formData, stateNames],
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
    <div className="flex flex-col gap-2 w-[930px] overflow-x-auto">
      <div className="text-base text-typography-900 font-primary flex gap-1 justify-between items-center min-h-10">
        <div className="flex gap-1 items-center">
          {en.simulation.behavioursInstruction}
          {isMandatory && <span className="text-destructive-500">*</span>}
        </div>
        <div className="flex gap-2 items-center">
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
