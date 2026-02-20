import { FC, ReactNode } from "react";

import { en, DEFAULT_STATE_INSTRUCTIONS, STATES_INSTRUCTION_TABLE_HEADERS } from "@constants";
import type { stateInstruction } from "@types";

import { EditableTable } from "./EditableTable";

interface StateInstructionProps {
  formMethods: any;
  id: string;
  isMandatory: boolean;
  regenerateButton?: ReactNode;
}
export const StateInstruction: FC<StateInstructionProps> = ({
  formMethods,
  id,
  isMandatory,
  regenerateButton,
}) => {
  const formData = (formMethods.watch(id) as stateInstruction[]) ?? [];

  const tableData = DEFAULT_STATE_INSTRUCTIONS.map(defaultRow => {
    const fromBackend = formData.find(row => String(row.stateId) === String(defaultRow.stateId));
    return fromBackend ? { ...defaultRow, ...fromBackend } : defaultRow;
  });

  const handleRowChange = (rowIndex: number, key: string, value: string | string[]) => {
    const valueToSet =
      key === "dialogues"
        ? (value as string)
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean)
        : value;
    const updatedArray = tableData.map((row, index) =>
      index === rowIndex ? { ...row, [key]: valueToSet } : row,
    );
    formMethods.setValue(id, updatedArray);
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex flex-row justify-between text-base text-typography-900 font-primary flex gap-1">
        <span>
          {en.simulation.statesInstruction}
          {isMandatory && <span className="text-destructive-500">*</span>}
        </span>
        {regenerateButton}
      </div>
      <EditableTable
        columns={STATES_INSTRUCTION_TABLE_HEADERS}
        data={tableData}
        onRowChange={handleRowChange}
      />
    </div>
  );
};
