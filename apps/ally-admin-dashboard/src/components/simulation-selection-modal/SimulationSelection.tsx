import { FC, useRef, useState } from "react";

import { Tooltip } from "@mui/material";

import { CloseRed, DragIndicator, InfoIcon, Search } from "@assets";
import { en, toolTipStyles } from "@constants";
import { useSimulations } from "@hooks";
import { Simulation, GetScenarioType } from "@types";

import { Button } from "../button";
import { EmptyState } from "../empty-state";

interface SimulationProps {
  showSimulation: boolean;
  toggleSimulationModal: () => void;
  data: GetScenarioType[] | undefined;
}
export const SimulationSelectionModal: FC<SimulationProps> = ({
  showSimulation,
  toggleSimulationModal,
  data,
}) => {
  const [selectedSimulations, setSelectedSimulations] = useState<Simulation[]>([]);

  const { simulationsResponse } = useSimulations({});

  const dragCard = useRef<number>(0);
  const dragOverCard = useRef<number>(0);

  const toggleSelection = (simulation: Simulation) => {
    setSelectedSimulations(prev =>
      prev.some(item => item.id === simulation.id)
        ? prev.filter(item => item.id !== simulation.id)
        : [...prev, simulation],
    );
  };

  const handleSort = () => {
    const newSimulations = [...selectedSimulations];
    const draggedItem = newSimulations[dragCard.current!];

    // Remove the dragged item
    newSimulations.splice(dragCard.current!, 1);

    // Insert it at the new position
    newSimulations.splice(dragOverCard.current!, 0, draggedItem);

    // Reset refs
    dragCard.current = null;
    dragOverCard.current = null;

    // Update state
    setSelectedSimulations(newSimulations);
  };

  const handleRemoveCard = (index: number) => {
    const newSimulations = [...selectedSimulations];
    newSimulations.splice(index, 1);
    setSelectedSimulations(newSimulations);
  };

  const renderEmptyScreen = () => {
    return (
      <EmptyState
        title={en.simulation.noSimulationsAddedYet}
        subtitle={en.simulation.searchSelectSimulations}
        actionLabel={en.simulation.addSimulation}
        onAction={toggleSimulationModal}
      />
    );
  };

  const renderSimulationList = () => {
    return (
      <div>
        {data?.map((simulation, index) => (
          <div
            className="flex flex-col mb-5 border p-5 relative group max-w-full rounded-md shadow-sm hover:shadow-lg overflow-auto"
            key={simulation.scenarioId}
          >
            <button
              onClick={() => {
                handleRemoveCard(index);
              }}
              className="absolute right-3 top-10 opacity-0 group-hover:opacity-100 transition"
            >
              <CloseRed />
            </button>
            <div className="flex items-center gap-5 justify-between">
              <div
                className="flex items-center gap-3 "
                draggable
                onDragStart={() => (dragCard.current = index)}
                onDragEnter={() => (dragOverCard.current = index)}
                onDragEnd={handleSort}
                onDragOver={e => e.preventDefault()}
              >
                <span>
                  <DragIndicator />
                </span>
                <span>{index + 1}</span>
                <img
                  src={simulation.coverImageUrl}
                  alt={simulation.title}
                  className="w-28 h-16 rounded-md object-cover shrink-0"
                />
                <div className="flex flex-col ">
                  <span className="text-sm text-typography-900 font-primary">
                    {simulation.title}
                  </span>
                  <span className="text-xs text-typography-800 font-primary truncate max-w-xl">
                    {simulation.description}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Tooltip
                  title={en.simulation.minScoreTooltip}
                  placement="top"
                  slotProps={toolTipStyles}
                  arrow
                >
                  <span>
                    <InfoIcon />
                  </span>
                </Tooltip>

                <span className="text-sm text-typography-800 font-primary whitespace-nowrap">
                  {en.simulation.minScore}
                </span>
                <input
                  type="number"
                  className="border outline-none w-16 p-1 bg-secondary-50 mr-5"
                  defaultValue={simulation.minimumScore}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSimulationModal = () => {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
        <div className="fixed inset-0 flex items-center justify-center px-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full animate-in fade-in-0 zoom-in-95 duration-200 px-6 py-4">
            <h1 className="text-lg font-semibold">{en.simulation.addSimulationToPath}</h1>

            {/* Search bar */}
            <div className="relative w-full mt-4 ">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
              <input
                type="text"
                placeholder="Search simulation"
                className="pl-10 w-full !outline-none border  border-  rounded-md py-1"
              />
            </div>

            {/* Simulation list */}
            <div className="mt-4 max-h-80 overflow-y-auto">
              {simulationsResponse?.data.map(simulation => (
                <div
                  key={simulation.id}
                  className="flex items-center gap-3 py-2 hover:bg-secondary-50 rounded-md px-2 cursor-pointer"
                  onClick={() => toggleSelection(simulation)}
                >
                  <input
                    type="checkbox"
                    checked={selectedSimulations.some(
                      selectedVal => selectedVal.id === simulation.id,
                    )}
                    onChange={() => toggleSelection(simulation)}
                    onClick={e => e.stopPropagation()}
                    className="cursor-pointer"
                  />
                  <img
                    src={simulation.coverImageUrl}
                    alt={simulation.title}
                    className="w-20 h-15 rounded-md object-cover"
                  />
                  <span className="text-sm text-typography-900 font-primary">
                    {simulation.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="mt-4 flex justify-end gap-3 border-t pt-3 ">
              <Button
                variant="secondary"
                className="w-1/3 !text-base"
                onClick={toggleSimulationModal}
              >
                {en.common.cancel}
              </Button>
              <Button className="w-1/3 !text-base" onClick={toggleSimulationModal}>
                {en.simulation.addSelected}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {data?.length > 0 ? renderSimulationList() : renderEmptyScreen()}
      {showSimulation && renderSimulationModal()}
    </>
  );
};
