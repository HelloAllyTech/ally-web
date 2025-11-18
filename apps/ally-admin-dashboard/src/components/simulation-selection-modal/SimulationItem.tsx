import { useRef } from "react";

import { Tooltip } from "@mui/material";

import { CloseRed, DragIndicator, InfoIcon, Plus } from "@assets";
import { en, toolTipStyles } from "@constants";
import { SimulationCardItemProps } from "@types";

import { AddMessageModal } from "./AddMessageModal";

export const SimulationCardItem: React.FC<SimulationCardItemProps> = ({
  simulation,
  index,
  isLast,
  selectedSimulations,
  setSelectedSimulations,
  openMessageIndex,
  setOpenMessageIndex,
  handleMessageClick,
  renderMessage,
}) => {
  const dragCard = useRef<number>(0);
  const dragOverCard = useRef<number>(0);

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

  const handleMinimumScoreChange = (index: number, value: string) => {
    const newSimulations = [...selectedSimulations];
    newSimulations[index] = {
      ...newSimulations[index],
      minimumScore: Number(value) || 0,
    };
    setSelectedSimulations(newSimulations);
  };

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
                className="p-2 border border-dashed rounded-md hover:bg-secondary-50 flex gap-2 text-typography-500 p-3"
                onClick={() => handleMessageClick(index)}
              >
                <Plus className="mt-2" />
                {en.simulation.addMessage}
              </button>
            </div>
          ) : (
            renderMessage(simulation.messageTitle, simulation.feedback, index)
          )}

          {openMessageIndex === index && (
            <div className="relative">
              <div className="fixed inset-0 bg-black/10 z-10" onClick={handleCloseModal} />

              <div
                className="absolute left-1/2 -translate-x-1/2 z-20 "
                onClick={e => e.stopPropagation()}
              >
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
