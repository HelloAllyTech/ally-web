import { FC, useRef, useState, useEffect } from "react";

import { Tooltip } from "@mui/material";

import { CloseRed, DragIndicator, InfoIcon, Search } from "@assets";
import { en, toolTipStyles } from "@constants";
import { useSimulations } from "@hooks";
import { GetScenarioType, Simulation } from "@types";

import { AddMessageModal } from "../add-message-modal";
import { Button } from "../button";
import { EmptyState } from "../empty-state";

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

  const [openMessageIndex, setOpenMessageIndex] = useState<number | null>(null);

  const { simulationsResponse } = useSimulations({});

  const dragCard = useRef<number>(0);
  const dragOverCard = useRef<number>(0);

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

  const toggleSelection = (simulation: GetScenarioType) => {
    setSelectedSimulations(prev => {
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

  const handleSort = () => {
    const from = dragCard.current!;
    const to = dragOverCard.current!;

    // If indices are same, no reordering needed
    if (from === to) return;

    // Create a shallow copy
    const updated = [...selectedSimulations];

    // Extract dragged item
    const [draggedItem] = updated.splice(from, 1);

    // Insert at new index
    updated.splice(to, 0, draggedItem);

    updated.forEach((item, index) => {
      item.order = index + 1;
    });

    // Reset refs
    dragCard.current = 0;
    dragOverCard.current = 0;

    // Update state
    setSelectedSimulations(updated);
  };

  const handleRemoveCard = (index: number) => {
    const newSimulations = [...selectedSimulations];
    newSimulations.splice(index, 1);

    // Reorder remaining items
    const reordered = newSimulations.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setSelectedSimulations(reordered);
  };

  const handleCloseModal = () => {
    setOpenMessageIndex(null);
  };

  const handleAddMessage = (data: any) => {
    if (openMessageIndex === null) return;

    const updatedSimulations = [...selectedSimulations];
    const targetIndex = openMessageIndex;

    // Add message properties to the simulation at the target index
    updatedSimulations[targetIndex] = {
      ...updatedSimulations[targetIndex],
      messageTitle: data.messageTitle || "",
      feedback: data.feedback || "",
    };

    setSelectedSimulations(updatedSimulations);
    setOpenMessageIndex(null);
  };

  const handleMessageClick = (index: number) => {
    const isOpening = openMessageIndex !== index;
    if (isOpening) {
      setOpenMessageIndex(index);
    } else {
      setOpenMessageIndex(null);
    }
  };

  const handleMinimumScoreChange = (index: number, value: string) => {
    const newSimulations = [...selectedSimulations];
    newSimulations[index] = {
      ...newSimulations[index],
      minimumScore: Number(value) || 0,
    };
    setSelectedSimulations(newSimulations);
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
      <div className="rounded-md flex flex-col justify-center border mx-auto my-2 w-[800px] group">
        <div className="w-full bg-secondary-50 px-2 py-1 rounded-t-md flex justify-between items-center">
          <p className="text-sm text-typography-900 font-medium">Message:</p>

          {/* Hover Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-3 cursor-pointer ">
            <p className="text-xs" onClick={() => handleMessageClick(index)}>
              {en.common.edit}
            </p>
            <p className="text-xs" onClick={() => handleDeleteMessage(index)}>
              {en.common.delete}
            </p>
          </div>
        </div>

        <p className="text-sm font-semibold text-typography-900 px-2">{messageTitle}</p>
        <p className="text-sm text-typography-800 px-2 py-3 break-words">{feedback}</p>
      </div>
    );
  };

  const SimulationItem = ({ simulation, index, isLast }) => {
    return (
      <>
        <div className="flex flex-col border p-5 relative group max-w-full rounded-md shadow-sm hover:shadow-lg overflow-auto">
          <div className="flex flex-col items-center justify-between">
            <button
              onClick={() => {
                handleRemoveCard(index);
              }}
              className="absolute right-3 top-10 opacity-0 group-hover:opacity-100 transition"
            >
              <CloseRed />
            </button>
          </div>
          <div className="flex items-center gap-5 justify-between">
            <div
              className="flex items-center gap-3"
              draggable
              onDragStart={() => (dragCard.current = index)}
              onDragEnter={() => (dragOverCard.current = index)}
              onDragEnd={handleSort}
              onDragOver={e => e.preventDefault()}
            >
              <span>
                <DragIndicator />
              </span>
              <span>{simulation.order}</span>
              <img
                src={simulation.coverImageUrl}
                alt={simulation.title}
                className="w-28 h-16 rounded-md object-cover shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-sm text-typography-900 font-primary">{simulation.title}</span>
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
                onBlur={e => handleMinimumScoreChange(index, e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>

        {!isLast && (
          <>
            {!simulation.messageTitle ? (
              <div className="relative flex justify-center my-4">
                <button
                  className="p-2 border border-dashed rounded-md hover:bg-secondary-50"
                  onClick={() => handleMessageClick(index)}
                >
                  {en.simulation.addMessage}
                </button>
              </div>
            ) : (
              renderMessage(simulation.messageTitle, simulation.feedback, index)
            )}

            {/* Render modal directly below this card if it's open for this index */}
            {openMessageIndex === index && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="fixed inset-0" onClick={handleCloseModal} />
                <div className="relative z-10">
                  <AddMessageModal
                    handleCancel={handleCloseModal}
                    initialValues={{
                      messageTitle: simulation.messageTitle || "",
                      feedback: simulation.feedback || "",
                    }}
                    handlePrimaryAction={handleAddMessage}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </>
    );
  };

  const renderSimulationList = () => {
    return (
      <div>
        {selectedSimulations?.map((simulation, index) => (
          <SimulationItem
            key={simulation.scenarioId}
            simulation={simulation}
            index={index}
            isLast={index === selectedSimulations.length - 1}
          />
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
            <div className="relative w-full mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-typography-800" />
              <input
                type="text"
                placeholder="Search simulation"
                className="pl-10 w-full !outline-none border rounded-md py-1"
              />
            </div>

            {/* Simulation list */}
            <div className="mt-4 max-h-80 overflow-y-auto">
              {simulationsResponse?.data.map(simulation => {
                const isSelected = selectedSimulations.some(
                  selectedVal => selectedVal.scenarioId === simulation.id,
                );
                const nextOrder = selectedSimulations.length + 1;

                return (
                  <div
                    key={simulation.id}
                    className="flex items-center gap-3 py-2 hover:bg-secondary-50 rounded-md px-2 cursor-pointer"
                    onClick={() => toggleSelection(mapToGetScenarioType(simulation, nextOrder))}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(mapToGetScenarioType(simulation, nextOrder))}
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
              })}
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
      {selectedSimulations?.length > 0 ? renderSimulationList() : renderEmptyScreen()}
      {showSimulation && renderSimulationModal()}
    </>
  );
};
