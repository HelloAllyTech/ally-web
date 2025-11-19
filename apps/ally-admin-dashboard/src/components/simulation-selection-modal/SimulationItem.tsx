import { FC } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

import { CloseRed, DragIndicator, InfoIcon, Plus } from "@assets";
import { en, toolTipStyles } from "@constants";
import { SimulationCardItemProps } from "@types";

import { AddMessageModal } from "./AddMessageModal";
import { CustomImage } from "../custom-image";

export const SimulationCardItem: FC<SimulationCardItemProps> = ({
  simulation,
  index,
  selectedSimulations,
  setSelectedSimulations,
  openMessageIndex,
  setOpenMessageIndex,
  handleMessageClick,
  renderMessage,
  addButtonRef,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(simulation.scenarioId),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRemoveCard = (index: number) => {
    const newSimulations = [...selectedSimulations];
    newSimulations.splice(index, 1);

    const reordered = newSimulations.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    setSelectedSimulations(reordered);
  };

  const handleCloseModal = () => setOpenMessageIndex(null);

  const handleAddMessage = (data: any) => {
    if (openMessageIndex === null) return;

    const updated = [...selectedSimulations];
    updated[openMessageIndex] = {
      ...updated[openMessageIndex],
      messageTitle: data.messageTitle || "",
      feedback: data.feedback || "",
    };

    setSelectedSimulations(updated);
    setOpenMessageIndex(null);
  };

  const handleMinimumScoreChange = (index: number, value: string) => {
    const updated = [...selectedSimulations];
    updated[index] = {
      ...updated[index],
      minimumScore: Number(value) || 0,
    };
    setSelectedSimulations(updated);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex p-3 pr-12 relative group rounded-md shadow-sm hover:shadow-lg  min-w-[800px] w-full border items-center ${
          isDragging ? "border-blue-500 border-2" : "border-gray-300"
        }`}
      >
        {/* Remove Button */}
        <button
          onClick={() => handleRemoveCard(index)}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition z-10"
          type="button"
        >
          <CloseRed />
        </button>

        {/* Drag Handle - Only this should trigger dragging */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <DragIndicator className="w-5 h-5 text-gray-500 mr-5 mt-1" />
        </div>

        <div className="flex items-start justify-between w-full">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 flex items-center justify-center text-md text-typography-900">
              {simulation.order}
            </span>

            <div className="w-32 h-20 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
              <CustomImage
                src={simulation.coverImageUrl}
                alt={simulation.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col max-w-xl">
              <span className="text-sm text-typography-900 font-primary">{simulation.title}</span>
              <span className="text-xs text-typography-800 font-primary truncate max-w-xl">
                {simulation.description}
              </span>
            </div>
          </div>

          {/* Minimum score section */}
          <div className="flex items-center gap-3 self-center">
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
              className="border outline-none w-16 p-1 bg-secondary-50 rounded-sm"
              defaultValue={simulation.minimumScore}
              onBlur={e => handleMinimumScoreChange(index, e.target.value)}
              min="0"
            />
          </div>
        </div>
      </div>
      {/* Add Message / Render Message Below the Card */}
      <>
        {!simulation.messageTitle ? (
          <div className="relative flex justify-center my-4">
            <button
              className="border border-dashed rounded-md hover:bg-secondary-50 flex gap-2 text-typography-500 p-3"
              ref={element => (addButtonRef.current[index] = element)}
              onClick={() => handleMessageClick(index)}
              type="button"
            >
              <Plus className="mt-1" />
              {en.simulation.addMessage}
            </button>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderMessage(simulation.messageTitle, simulation.feedback, index)}
            </motion.div>
          </AnimatePresence>
        )}

        {openMessageIndex === index && (
          <div className="relative">
            <div className="fixed inset-0 bg-black/10 z-10" onClick={handleCloseModal} />
            <div
              className="absolute left-1/2 -translate-x-1/2 z-20"
              onClick={e => e.stopPropagation()}
            >
              <AnimatePresence>
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 z-20"
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  onClick={e => e.stopPropagation()}
                >
                  <AddMessageModal
                    handleCancel={handleCloseModal}
                    initialValues={{
                      messageTitle: simulation.messageTitle || "",
                      feedback: simulation.feedback || "",
                    }}
                    handlePrimaryAction={handleAddMessage}
                    isOpen={true}
                    anchorElement={addButtonRef.current[index]}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </>
    </>
  );
};
