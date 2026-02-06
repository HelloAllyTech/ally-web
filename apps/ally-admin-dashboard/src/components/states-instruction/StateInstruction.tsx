import { useGetStatesInstructionQuery } from "@api";
import { en, STATES_INSTRUCTION_TABLE_HEADERS } from "@constants";

import { EditableTable } from "./EditableTable";

const LIMIT = 10;

export const StateInstruction = () => {
  const { data: stateInstructionData } = useGetStatesInstructionQuery({
    limit: LIMIT,
    offset: 0,
  });

  const handleRowChange = () => {
    //TODO:handle row change
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="text-base text-typography-900 font-primary">
        {en.simulation.statesInstruction}
      </div>
      <EditableTable
        columns={STATES_INSTRUCTION_TABLE_HEADERS}
        data={stateInstructionData ?? []}
        onRowChange={handleRowChange}
      />
    </div>
  );
};
