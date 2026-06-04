import { FC, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Trash } from "@assets";
import { Button, NotionTable } from "@components";
import { AddItemButton } from "../add-item-button";
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

  // Body-driven gate: the legacy per-state instruction columns and the
  // state-names header row only matter when the variant body actually
  // consumes `{behavior_instructions_json}` AND doesn't use the new
  // score-bounded states model (`{state_x_guidelines}`). That's the
  // Prompt #1 shape. For anything else — Prompt #2 (states), Prompt #3
  // (neither placeholder), or any lean variant — the per-state cells
  // are dead weight: their values would never reach the agent. Hide
  // them and the table collapses to a pure scoring rubric (category +
  // behaviours), which still drives the score-keeper via the
  // SHOULD_DO/SHOULD_NOT_DO → ±10 mapping in ally-be regardless of
  // what the prompt body references.
  const selectedMainPromptCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const behaviorJsonLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    "behavior_instructions_json",
  );
  const { isUsed: usesStateXGuidelines } = useIsPlaceholderUsed(
    selectedMainPromptCode,
    "state_x_guidelines",
  );
  // When no variant is selected (e.g. the variant picker is hidden by the
  // feature flag, or the scenario was authored before variants existed),
  // the runtime resolves to the default Prompt #1 — which has
  // {behavior_instructions_json} and no {state_x_guidelines}. The UI gate
  // mirrors that fallback so the per-state coaching columns stay visible
  // for legacy scenarios instead of disappearing into a "no_selection"
  // edge case. For loaded variants the gate evaluates against the
  // variant's actual reconciled body.
  const showLegacyStateColumns =
    behaviorJsonLookup.kind === "no_selection"
      ? true
      : behaviorJsonLookup.isUsed && !usesStateXGuidelines;

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
    <AddItemButton
      onClick={handleAddRow}
      label={en.simulation.newRow}
      className="mt-2 px-3 py-2"
    />
  );

  const tableStyle = { paddingBottom: "10px" };

  const handleSelectionChange = useCallback((selectedRows: any[]) => {
    setSelectedRows(selectedRows.map(row => row.id.value));
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full overflow-x-auto">
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
        fillWidth
      />
    </div>
  );
};
