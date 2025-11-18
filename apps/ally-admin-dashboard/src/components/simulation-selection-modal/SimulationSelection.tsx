import { FC, useState, useEffect, useMemo } from "react";

import { Search } from "@assets";
import { en } from "@constants";
import { useSimulations } from "@hooks";
import { GetScenarioType, Simulation } from "@types";

import { Button } from "../button";
import { EmptyState } from "../empty-state";
import { SimulationCardItem } from "./SimulationItem";

interface SimulationProps {
  showSimulation: boolean;
  toggleSimulationModal: () => void;
  data: GetScenarioType[] | undefined;
  formMethods?: any;
}

export const SimulationSelectionModal: FC<SimulationProps> = ({
  showSimulation,
  toggleSimulationModal,
  data,
  formMethods,
}) => {
  const [selectedSimulations, setSelectedSimulations] = useState<GetScenarioType[]>(data ?? []);
  const [checkedSimulation, setCheckedSimulation] = useState<GetScenarioType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMessageIndex, setOpenMessageIndex] = useState<number | null>(null);

  const { simulationsResponse } = useSimulations({});

  const mapToGetScenarioType = (simulation: Simulation, order: number) => {
    return {
      scenarioId: simulation.id,
      order,
      coverImageUrl: simulation.coverImageUrl,
      title: simulation.title,
      description: simulation.description,
      minimumScore: 0,
      messageTitle: "",
      feedback: "",
    };
  };

  // Filter simulations based on search query
  const filteredSimulations = useMemo(() => {
    if (!simulationsResponse?.data) return [];
    if (!searchQuery.trim()) return simulationsResponse.data;

    const query = searchQuery.toLowerCase();
    return simulationsResponse.data.filter(
      simulation =>
        simulation.title.toLowerCase().includes(query) ||
        simulation.description.toLowerCase().includes(query),
    );
  }, [simulationsResponse?.data, searchQuery]);

  const toggleSelection = () => {
    setSelectedSimulations(checkedSimulation);
    toggleSimulationModal();
  };

  const handleCheckBoxClick = (simulation: GetScenarioType) => {
    setCheckedSimulation(prev => {
      const exists = prev.some(item => item.scenarioId === simulation.scenarioId);

      if (exists) {
        // Remove and reorder
        const filtered = prev.filter(item => item.scenarioId !== simulation.scenarioId);
        return filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
      } else {
        // Add with next order number
        return [...prev, { ...simulation, order: prev.length + 1 }];
      }
    });
  };

  const handleMessageClick = (index: number) => {
    const isOpening = openMessageIndex !== index;
    if (isOpening) {
      setOpenMessageIndex(index);
    } else {
      setOpenMessageIndex(null);
    }
  };

  const handleDeleteMessage = (index: number) => {
    const updatedSimulations = [...selectedSimulations];

    updatedSimulations[index] = {
      ...updatedSimulations[index],
      messageTitle: "",
      feedback: "",
    };

    setSelectedSimulations(updatedSimulations);
  };

  // Sync with form when simulations change
  useEffect(() => {
    if (formMethods) {
      // Map simulations to the expected payload format
      const scenarios = selectedSimulations.map(simulation => ({
        scenarioId: simulation.scenarioId,
        order: simulation.order,
        minimumScore: simulation.minimumScore,
        messageTitle: simulation.messageTitle || "",
        feedback: simulation.feedback || "",
        coverImageUrl: simulation.coverImageUrl,
        title: simulation.title,
        description: simulation.description,
      }));

      formMethods.setValue("scenarios", scenarios);
    }
  }, [selectedSimulations, formMethods]);

  // Sync checked state when modal opens
  useEffect(() => {
    if (showSimulation) {
      setCheckedSimulation(selectedSimulations);
    }
  }, [showSimulation, selectedSimulations]);

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

  const renderMessage = (messageTitle: string, feedback: string, index: number) => {
    return (
      <div className="rounded-md flex flex-col justify-center border mx-auto my-3 w-[800px] group">
        <div className="w-full bg-secondary-50 px-2 py-2 rounded-t-md flex justify-between items-center">
          <p className="text-sm text-typography-900 font-medium">{en.simulation.message}:</p>

          {/* Hover Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex cursor-pointer ">
            <p className="text-xs" onClick={() => handleMessageClick(index)}>
              {en.common.edit}
            </p>
            <p className="text-xs" onClick={() => handleDeleteMessage(index)}>
              {en.common.delete}
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-typography-900 px-2">{messageTitle}</p>
        <p className="text-sm text-typography-800 px-2 pb-3 break-words">{feedback}</p>
      </div>
    );
  };

  const renderSimulationList = () => {
    return (
      <div>
        {selectedSimulations?.map((simulation, index) => (
          <SimulationCardItem
            key={simulation.scenarioId}
            simulation={simulation}
            index={index}
            isLast={index === selectedSimulations.length - 1}
            selectedSimulations={selectedSimulations}
            setSelectedSimulations={setSelectedSimulations}
            openMessageIndex={openMessageIndex}
            setOpenMessageIndex={setOpenMessageIndex}
            handleMessageClick={handleMessageClick}
            renderMessage={renderMessage}
          />
        ))}
      </div>
    );
  };

  const renderSimulationModal = () => {
    return (
      <div className="fixed inset-0 z-50" onClick={toggleSimulationModal}>
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
        <div className="fixed inset-0 flex items-center justify-center px-4">
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-xl w-full animate-in fade-in-0 zoom-in-95 duration-200 px-6 py-4"
            onClick={e => e.stopPropagation()}
          >
            <h1 className="text-lg font-semibold">{en.simulation.addSimulationToPath}</h1>

            {/* Search bar */}
            <div className="relative w-full mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
              <input
                type="text"
                placeholder="Search simulation"
                className="pl-10 w-full !outline-none border rounded-md py-1"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Simulation list */}
            <div className="mt-4 max-h-80 overflow-y-auto">
              {filteredSimulations.length === 0 ? (
                <p className="text-center text-typography-600 py-8">
                  {en.simulation.noSimulationFound}
                </p>
              ) : (
                filteredSimulations.map(simulation => {
                  const isSelected = checkedSimulation.some(
                    item => item.scenarioId === simulation.id,
                  );
                  const nextOrder = checkedSimulation.length + 1;

                  return (
                    <div
                      key={simulation.id}
                      className="flex items-center gap-3 py-2 hover:bg-secondary-50 rounded-md px-2 cursor-pointer"
                      onClick={() =>
                        handleCheckBoxClick(mapToGetScenarioType(simulation, nextOrder))
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() =>
                          handleCheckBoxClick(mapToGetScenarioType(simulation, nextOrder))
                        }
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
                  );
                })
              )}
            </div>

            {/* Buttons */}
            <div className="mt-4 flex justify-end gap-3 border-t pt-3">
              <Button
                variant="secondary"
                className="w-1/3 !text-base"
                onClick={toggleSimulationModal}
              >
                {en.common.cancel}
              </Button>
              <Button className="w-1/3 !text-base" onClick={toggleSelection}>
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
      {selectedSimulations?.length > 0 ? renderSimulationList() : renderEmptyScreen()}
      {showSimulation && renderSimulationModal()}
    </>
  );
};
