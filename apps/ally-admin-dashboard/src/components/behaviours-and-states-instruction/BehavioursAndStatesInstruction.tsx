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
import { useIsPlaceholderUsed } from "@hooks";
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

  // Body-driven gate: drop the per-state instruction columns (and the
  // state-names header row) when the selected variant uses the new
  // score-bounded states model (`{state_x_guidelines}`). For Prompt #2
  // and any future variant that gets state guidance from the new
  // StatesEditor, the legacy fixed -1/1/2/3 state cells are dead
  // weight — the rules-only view (category + behaviours) is all the
  // author needs. The rules still score the counselor unchanged.
  const selectedMainPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const { isUsed: usesStateXGuidelines } = useIsPlaceholderUsed(
    selectedMainPromptCode,
    "state_x_guidelines",
  );
  const showLegacyStateColumns = !usesStateXGuidelines;

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

  const tableData = useMemo(() => {
    // Drop the per-state-instruction columns from the unified table when
    // the variant doesn't use the legacy fixed-state coaching model.
    // Without those columns the state-names header row would render with
    // only "Category"/"Behaviours" cells (and nothing in them), so we
    // skip the header row too — leaving the table as a pure rules grid.
    const columns = BEHAVIOURS_AND_STATES_INSTRUCTION_TABLE_COLUMNS.filter(
      col => showLegacyStateColumns || !col.id.startsWith("stateInstruction_"),
    ).map(col => {
      if (col.id.startsWith("stateInstruction_")) {
        return { ...col, label: col.label };
      }
      return col;
    });

    const data = showLegacyStateColumns
      ? [
          createStateNamesRow(stateNamesDict),
          ...formData.map(behavior => createTableRowObject(behavior)),
        ]
      : formData.map(behavior => createTableRowObject(behavior));

    return { data, columns };
  }, [formData, stateNamesDict, createTableRowObject, createStateNamesRow, showLegacyStateColumns]);

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
          {/*
            For variants that use the new score-bounded states model
            (`{state_x_guidelines}`), this section's purpose collapses to
            "score the counselor" — the per-state coaching grid is
            already hidden by `showLegacyStateColumns`. Relabel the
            header to match the new purpose so authors aren't confused
            by "Behaviour Instructions" when no behaviour-driven
            coaching reaches the agent.
          */}
          {showLegacyStateColumns
            ? en.simulation.behavioursInstruction
            : en.simulation.scoringRubric}
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
