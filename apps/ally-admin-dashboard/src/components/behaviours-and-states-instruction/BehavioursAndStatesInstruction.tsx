import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { Select, SelectItem } from "@ally-ui-mono/ui-shared";
import { Close, Trash } from "@assets";
import { Button, NotionTable } from "@components";
import {
  BEHAVIOURS_AND_STATES_INSTRUCTION_TABLE_COLUMNS,
  BEHAVIOURS_INSTRUCTION_CATEGORIES,
  BEHAVIOUR_STATES,
  en,
  FORM_FIELD_IDS,
} from "@constants";
import { useIsPlaceholderUsed } from "@hooks";
import { ButtonVariant } from "@src/components/types";
import { behaviourStateInstruction, HelperTagItem } from "@types";

import { HelperTag } from "../helper-tag";

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
}

const STATE_NAMES_ROW_ID = "state-names-row";

// The two rubric categories ("Helper should do" / "Helper should not do")
// differ only by the word "not", and "not" is the first thing a narrow column
// clips — a truncated "Helper sho..." reads identically for both, which made it
// impossible to tell at a glance how a behaviour class was scored. So the
// category column is wide enough to hold the longer label in full, and each row
// additionally carries a colour accent (and colour-matched select text) so the
// rubric can be scanned without reading every cell. Colour is redundant with
// the now-untruncated text, never the only signal.
const RUBRIC_GRID = "grid grid-cols-[1fr_248px_40px]";

const rubricAccent = (isShould: boolean) =>
  isShould ? "border-l-success-400" : "border-l-destructive-400";

const rubricSelectTone = (isShould: boolean) =>
  isShould
    ? "[&_select]:!text-success-600 [&_select]:!font-medium"
    : "[&_select]:!text-destructive-600 [&_select]:!font-medium";

// A stable per-row id. The table identifies the row to mutate by this id, and
// the edit handler ignores changes whose rowId is null — so every row reaching
// the table must carry one.
const makeRowId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createEmptyFormValue = (): BehaviourRow => ({
  id: makeRowId(),
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
}) => {
  const formData: BehaviourRow[] = formMethods.watch(id) ?? [];
  const stateNames: { stateId: string; name: string }[] =
    formMethods.watch(FORM_FIELD_IDS.STATE_NAMES) ?? [];
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [pendingRow, setPendingRow] = useState<{ category: string } | null>(null);

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

  // Backfill ids on any row that lacks one (e.g. rows auto-populated from a
  // competency, or older drafts persisted before rows carried ids). Without an
  // id the table can't target the row, so its × / + controls do nothing. The
  // `some(!r.id)` guard makes this self-terminating; shouldDirty:false keeps it
  // from marking the form dirty or tripping competency auto-creation.
  useEffect(() => {
    if (formData.some(row => !row.id)) {
      const withIds = formData.map(row => (row.id ? row : { ...row, id: makeRowId() }));
      formMethods.setValue(id, withIds, { shouldDirty: false });
    }
  }, [formData, formMethods, id]);

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
    );

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

  // Flattened rows for scoring rubric view: one row per (behaviour tag, category) pair.
  const rubricRows = useMemo(() => {
    const rows: { rowId: string; tag: HelperTagItem; isShould: boolean }[] = [];
    for (const row of formData) {
      if (!row.behaviors?.length) continue;
      const isShould = row.category === "SHOULD_DO";
      for (const tag of row.behaviors as unknown as HelperTagItem[]) {
        if (tag?.id) {
          rows.push({ rowId: row.id ?? "", tag, isShould });
        }
      }
    }
    return rows;
  }, [formData]);

  const handleRemoveBehaviourFromRow = useCallback(
    (rowId: string, tagId: string) => {
      const updatedFormData = formData
        .map(row => {
          if (row.id !== rowId) return row;
          const newBehaviors = (row.behaviors as unknown as HelperTagItem[]).filter(
            t => t.id !== tagId,
          );
          return { ...row, behaviors: newBehaviors };
        })
        .filter(row => (row.behaviors as unknown as HelperTagItem[]).length > 0);
      const nextData = updatedFormData.length > 0 ? updatedFormData : [createEmptyFormValue()];
      formMethods.setValue(id, nextData, {
        shouldDirty: true,
      });
    },
    [formData, formMethods, id],
  );

  const handleRubricRowCategoryChange = useCallback(
    (rowId: string, tagId: string, newCategory: string) => {
      // Move the tag to a row with the matching category (create one if needed)
      const updatedFormData = formData.map(row => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          behaviors: (row.behaviors as unknown as HelperTagItem[]).filter(t => t.id !== tagId),
        };
      });
      const targetRow = updatedFormData.find(
        row =>
          row.category === newCategory && (row.behaviors as unknown as HelperTagItem[]).length < 5,
      );
      const tag = (
        formData.find(r => r.id === rowId)?.behaviors as unknown as HelperTagItem[]
      )?.find(t => t.id === tagId);
      if (!tag) return;
      let finalData;
      if (targetRow) {
        finalData = updatedFormData.map(row =>
          row.id === targetRow.id
            ? { ...row, behaviors: [...(row.behaviors as unknown as HelperTagItem[]), tag] }
            : row,
        );
      } else {
        finalData = [
          ...updatedFormData,
          { ...createEmptyFormValue(), category: newCategory, behaviors: [tag] },
        ];
      }
      const cleaned = finalData.filter(
        row => (row.behaviors as unknown as HelperTagItem[]).length > 0,
      );
      formMethods.setValue(id, cleaned.length > 0 ? cleaned : [createEmptyFormValue()], {
        shouldDirty: true,
      });
    },
    [formData, formMethods, id],
  );

  const commitPendingTag = useCallback(
    (tag: HelperTagItem, category: string) => {
      const existingRow = formData.find(
        r => r.category === category && (r.behaviors as unknown as HelperTagItem[]).length < 5,
      );
      let updatedFormData;
      if (existingRow) {
        updatedFormData = formData.map(r =>
          r.id === existingRow.id
            ? { ...r, behaviors: [...(r.behaviors as unknown as HelperTagItem[]), tag] }
            : r,
        );
      } else {
        updatedFormData = [
          ...formData.filter(r => (r.behaviors as unknown as HelperTagItem[]).length > 0),
          { ...createEmptyFormValue(), category, behaviors: [tag] },
        ];
      }
      formMethods.setValue(id, updatedFormData, { shouldDirty: true });
      setPendingRow(null);
    },
    [formData, formMethods, id],
  );

  const renderScoringRubric = () => (
    <>
      <div className="w-full border border-border-light rounded overflow-hidden">
        {/* Header */}
        <div
          className={`${RUBRIC_GRID} border-l-[3px] border-l-transparent bg-white border-b border-border-light`}
        >
          <div className="px-4 py-2.5 text-xs font-medium text-typography-600 uppercase tracking-wide">
            Helper Behaviour Class
          </div>
          <div className="px-4 py-2.5 text-xs font-medium text-typography-600 uppercase tracking-wide border-l border-border-light">
            Category
          </div>
          <div />
        </div>

        {/* Rows */}
        {rubricRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-typography-500 text-center">
            No behaviour classes added yet.
          </div>
        ) : (
          rubricRows.map(({ rowId, tag, isShould }, i) => (
            <div
              key={`${rowId}-${tag.id}`}
              className={`${RUBRIC_GRID} items-center border-b border-border-light last:border-b-0 border-l-[3px] ${rubricAccent(isShould)} ${i % 2 === 0 ? "bg-white" : "bg-background-secondary/40"} group`}
            >
              <div className="px-4 py-2.5 text-sm text-typography-900">{tag.name}</div>
              <div className="px-3 py-2 border-l border-border-light">
                <Select
                  id={`rubric-category-${rowId}-${tag.id}`}
                  labelText="Category"
                  hideLabel
                  value={isShould ? "SHOULD_DO" : "SHOULD_NOT_DO"}
                  onChange={e => handleRubricRowCategoryChange(rowId, tag.id, e.target.value)}
                  className={`w-full ${rubricSelectTone(isShould)}`}
                >
                  {BEHAVIOURS_INSTRUCTION_CATEGORIES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => handleRemoveBehaviourFromRow(rowId, tag.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-typography-400 hover:text-destructive-500 p-1"
                >
                  <Close className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pending new row */}
        {pendingRow && (
          <div
            className={`${RUBRIC_GRID} items-center border-t border-border-light border-l-[3px] ${rubricAccent(pendingRow.category === "SHOULD_DO")} bg-white`}
          >
            <div className="px-4 py-2">
              <HelperTag
                tags={[]}
                maxTags={1}
                updateTags={tags => {
                  if (tags.length === 1) {
                    commitPendingTag(tags[0] as HelperTagItem, pendingRow.category);
                  }
                }}
              />
            </div>
            <div className="px-3 py-2 border-l border-border-light">
              <Select
                id="rubric-pending-category"
                labelText="Category"
                hideLabel
                value={pendingRow.category}
                onChange={e =>
                  setPendingRow(prev => (prev ? { ...prev, category: e.target.value } : null))
                }
                className={`w-full ${rubricSelectTone(pendingRow.category === "SHOULD_DO")}`}
              >
                {BEHAVIOURS_INSTRUCTION_CATEGORIES.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} text={opt.label} />
                ))}
              </Select>
            </div>
            <div />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPendingRow({ category: "SHOULD_DO" })}
        className="self-start text-sm text-primary hover:text-primary-700 mt-2 px-3 py-2"
      >
        + {en.simulation.newRow}
      </button>
    </>
  );

  const tableFooter = (
    <button
      type="button"
      onClick={handleAddRow}
      className="self-start text-sm text-primary hover:text-primary-700 mt-2 px-3 py-2"
    >
      + {en.simulation.newRow}
    </button>
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
        </div>
      </div>
      {showLegacyStateColumns ? (
        <NotionTable
          tableData={tableData}
          tableFooter={tableFooter}
          onRowChange={handleRowChange}
          tableStyle={tableStyle}
          onSelectionChange={handleSelectionChange}
          autoHeight
          fillWidth
        />
      ) : (
        renderScoringRubric()
      )}
    </div>
  );
};
