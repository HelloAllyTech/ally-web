import { FC, useState, useEffect, useMemo, useRef } from "react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";

import { Search } from "@assets";
import { en } from "@constants";
import { useSimulations } from "@hooks";
import { GetScenarioType, Simulation } from "@types";

import { Button } from "../button";
import { EmptyState } from "../empty-state";
import { SimulationCardItem } from "./SimulationItem";
import { CustomImage } from "../custom-image";

interface SimulationProps {
  showSimulation: boolean;
  toggleSimulationModal: () => void;
  formMethods?: any;
  selectedSimulations: GetScenarioType[];
  setSelectedSimulations: (simulations: GetScenarioType[]) => void;
}

export const SimulationSelectionModal: FC<SimulationProps> = ({
  showSimulation,
  toggleSimulationModal,
  formMethods,
  selectedSimulations,
  setSelectedSimulations,
}) => {
  const [checkedSimulation, setCheckedSimulation] = useState<GetScenarioType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [openMessageIndex, setOpenMessageIndex] = useState<number | null>(null);

  const addMessageButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
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
        const filtered = prev.filter(item => item.scenarioId !== simulation.scenarioId);
        return filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
      } else {
        return [...prev, { ...simulation, order: prev.length + 1 }];
      }
    });
  };

  const handleMessageClick = (index: number) => {
    setOpenMessageIndex(prev => (prev === index ? null : index));
  };

  const handleDeleteMessage = (index: number) => {
    const updated = [...selectedSimulations];

    updated[index] = {
      ...updated[index],
      messageTitle: "",
      feedback: "",
    };

    setSelectedSimulations(updated);
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

  useEffect(() => {
    if (showSimulation) {
      setCheckedSimulation(selectedSimulations);
    }
  }, [showSimulation, selectedSimulations]);

  const renderEmptyScreen = () => (
    <EmptyState
      title={en.simulation.noSimulationsAddedYet}
      subtitle={en.simulation.searchSelectSimulations}
      actionLabel={en.simulation.addSimulation}
      onAction={toggleSimulationModal}
    />
  );

  const renderMessage = (messageTitle: string, feedback: string, index: number) => (
    <div className="rounded-md flex flex-col justify-center border mx-auto my-3 w-[800px] group">
      <div className="w-full bg-secondary-50 px-2 py-2 rounded-t-md flex justify-between items-center">
        <p className="text-sm text-typography-900 font-medium">{en.simulation.message}:</p>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex cursor-pointer gap-2">
          <button
            className="text-xs"
            onClick={() => handleMessageClick(index)}
            ref={element => (addMessageButtonRefs.current[index] = element)}
          >
            {en.common.edit}
          </button>

          <button className="text-xs" onClick={() => handleDeleteMessage(index)}>
            {en.common.delete}
          </button>
        </div>
      </div>

      <p className="text-sm font-semibold text-typography-900 px-2">{messageTitle}</p>
      <p className="text-sm text-typography-800 px-2 pb-3 break-words">{feedback}</p>
    </div>
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = selectedSimulations.findIndex(
      simulation => simulation.scenarioId === active.id,
    );
    const newIndex = selectedSimulations.findIndex(simulation => simulation.scenarioId === over.id);

    const reordered = arrayMove(selectedSimulations, oldIndex, newIndex).map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setSelectedSimulations(reordered);
  };

  const renderSimulationList = () => (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={selectedSimulations.map(s => s.scenarioId)}
        strategy={verticalListSortingStrategy}
      >
        {selectedSimulations.map((simulation, index) => (
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
            addButtonRef={element => (addMessageButtonRefs.current[index] = element)}
            anchorElement={addMessageButtonRefs.current[index]}
          />
        ))}
      </SortableContext>
    </DndContext>
  );

  const renderSimulationModal = () => (
    <div className="fixed inset-0 z-50" onClick={toggleSimulationModal}>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
      <div className="fixed inset-0 flex items-center justify-center px-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-xl w-full animate-in fade-in-0 zoom-in-95 duration-200 px-6 py-4"
          onClick={e => e.stopPropagation()}
        >
          <h1 className="text-lg font-semibold">{en.simulation.addSimulationToPath}</h1>

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
                    className="flex items-center gap-5 py-2 hover:bg-secondary-50 rounded-md px-2 cursor-pointer"
                    onClick={() => handleCheckBoxClick(mapToGetScenarioType(simulation, nextOrder))}
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
                    <div className="w-20 h-16 rounded-md overflow-hidden flex-shrink-0">
                      <CustomImage
                        src={simulation.coverImageUrl}
                        alt={simulation.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm text-typography-900 font-primary truncate max-w-[200px]">
                      {simulation.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>

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

  return (
    <>
      {selectedSimulations.length > 0 ? renderSimulationList() : renderEmptyScreen()}
      {showSimulation && renderSimulationModal()}
    </>
  );
};
