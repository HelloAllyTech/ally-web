import { FC } from "react";

import { en, DEFAULT_STATE_INSTRUCTIONS, STATES_INSTRUCTION_TABLE_HEADERS } from "@constants";
import type { stateInstruction } from "@types";

import { EditableTable } from "./EditableTable";

interface StateInstructionProps {
  formMethods: any;
  id: string;
}
export const StateInstruction: FC<StateInstructionProps> = ({ formMethods, id }) => {
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
      <div className="text-base text-typography-900 font-primary">
        {en.simulation.statesInstruction}
      </div>
      <EditableTable
        columns={STATES_INSTRUCTION_TABLE_HEADERS}
        data={tableData}
        onRowChange={handleRowChange}
      />
    </div>
  );
};
