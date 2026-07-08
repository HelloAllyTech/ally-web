import { FC } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { CustomImage, Tooltip } from "@ally-ui-mono/ui-shared";
import { CloseRed, DragIndicator, TooltipIcon, Plus } from "@assets";
import { en } from "@constants";
import { SimulationCardItemProps } from "@types";
import { normalizeScore } from "@utils";

import { AddMessageModal } from "./AddMessageModal";

export const SimulationCardItem: FC<SimulationCardItemProps> = ({
  simulation,
  index,
  selectedSimulations,
  setSelectedSimulations,
  openMessageIndex,
  setOpenMessageIndex,
  handleMessageClick,
  renderMessage,
  addMessageRef,
  isDisabled = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(simulation.scenarioId),
    disabled: isDisabled,
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
    if (data.messageTitle) {
      const updated = [...selectedSimulations];
      updated[openMessageIndex] = {
        ...updated[openMessageIndex],
        messageTitle: data.messageTitle || "",
        messageContent: data.messageContent || "",
      };
      setSelectedSimulations(updated);
    }

    setOpenMessageIndex(null);
  };

  const handleMinimumScoreChange = (
    index: number,
    value: string,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    let updatedValue = Number(value);

    if (updatedValue < 0 || !Number.isInteger(updatedValue)) {
      updatedValue = normalizeScore(updatedValue);

      toast.error(en.errors.minimumScoreError);

      if (event) {
        event.target.value = String(updatedValue);
      }
    }

    const updated = [...selectedSimulations];
    updated[index] = {
      ...updated[index],
      minimumScore: updatedValue || 0,
    };
    setSelectedSimulations(updated);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex p-3 pr-12 relative group rounded-md shadow-sm hover:shadow-lg  min-w-[800px] w-full border items-center ${
          isDragging ? "border-primary-500 border-2" : "border-gray-300"
        }`}
      >
        {/* Remove Button */}
        {!isDisabled && (
          <button
            onClick={() => handleRemoveCard(index)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition z-10"
            type="button"
          >
            <CloseRed />
          </button>
        )}

        {/* Drag Handle - Only this should trigger dragging */}
        <div
          {...attributes}
          {...(!isDisabled && listeners)}
          className={isDisabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
        >
          <DragIndicator
            className={`w-5 h-5 mr-5 mt-1 ${isDisabled ? "text-gray-300" : "text-gray-500"}`}
          />
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
            <Tooltip label={en.simulation.minScoreTooltip} align="top">
              <button type="button" className="inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>

            <span className="text-sm text-typography-800 font-primary whitespace-nowrap">
              {en.simulation.minScore}
            </span>

            <input
              type="number"
              className="border outline-none w-16 p-1 bg-secondary-50 rounded-sm"
              defaultValue={simulation.minimumScore}
              onBlur={event => handleMinimumScoreChange(index, event.target.value, event)}
              min={0}
              disabled={isDisabled}
              // Scrolling over a focused number input silently changes its
              // value in the browser — blur so the page scrolls instead.
              onWheel={e => e.currentTarget.blur()}
            />
          </div>
        </div>
      </div>
      {/* Add Message / Render Message Below the Card */}
      <>
        {!simulation.messageTitle ? (
          <div className="relative flex justify-center my-4">
            <div ref={element => (addMessageRef.current[index] = element)}>
              <button
                className="border border-dashed rounded-md hover:bg-secondary-50 flex gap-2 text-typography-500 p-3"
                onClick={() => handleMessageClick(index)}
                type="button"
                disabled={isDisabled}
              >
                <Plus className="mt-1" />
                {en.simulation.addMessage}
              </button>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {renderMessage(simulation.messageTitle, simulation.messageContent, index)}
            </motion.div>
          </AnimatePresence>
        )}

        {openMessageIndex === index && (
          <div className="relative">
            <div className="fixed inset-0 bg-black/10 z-10" onClick={handleCloseModal} />
            <div
              className="absolute left-1/2 -translate-x-1/2 z-20"
              onClick={event => event.stopPropagation()}
            >
              <AnimatePresence>
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 z-20"
                  initial={{ opacity: 0, scale: 0.8, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  onClick={event => event.stopPropagation()}
                >
                  <AddMessageModal
                    handleCancel={handleCloseModal}
                    initialValues={{
                      messageTitle: simulation.messageTitle || "",
                      messageContent: simulation.messageContent || "",
                    }}
                    handlePrimaryAction={handleAddMessage}
                    isOpen
                    anchorElement={addMessageRef?.current?.[index]}
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
