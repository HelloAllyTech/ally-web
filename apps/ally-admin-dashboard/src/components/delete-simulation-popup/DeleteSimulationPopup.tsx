import { FC, useState } from "react";

import { Close } from "@assets";
import { CustomImage } from "@components";
import { DeleteSimulationPopupProps } from "@components/types";
import { en } from "@constants";

export const DeleteSimulationPopup: FC<DeleteSimulationPopupProps> = ({
  isOpen,
  onClose,
  simulation,
  onConfirmDelete,
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen || !simulation) return null;

  const handleConfirmDelete = () => {
    if (isConfirmed) {
      onConfirmDelete();
      setIsConfirmed(false); // Reset for next time
    }
  };

  const handleClose = () => {
    setIsConfirmed(false); // Reset checkbox when closing
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200 px-[32px] py-[24px] text-typography-900 font-primary">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-[8px] right-[8px] text-typography-600 hover:text-typography-800 transition-colors"
        >
          <Close width={24} height={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-medium font-primary">
            {en.simulation.deleteDescription}
            <span className="italic font-semibold ml-1">
              {en.simulation.simulation.toLowerCase()}
            </span>
            ?
          </h2>
        </div>

        {/* Simulation details card */}
        <div className="rounded-lg p-2 mb-3 flex items-center gap-4 border border-border-light">
          <div className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center">
            <CustomImage
              src={simulation.coverImageUrl}
              alt={simulation.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg truncate">{simulation.title}</h3>
            <p className="text-typography-800 text-base mt-1 line-clamp-2">
              {simulation.description}
            </p>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={e => setIsConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-primary border-border-light rounded"
            />
            <span className="text-base leading-relaxed">
              {en.simulation.deleteConfirmationText}
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-white font-tertiary border border-border-medium text-base font-medium py-2 px-4 rounded-[50px] hover:bg-background-secondary transition-colors"
          >
            {en.simulation.cancel}
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={!isConfirmed}
            className={`flex-1 text-base font-tertiary font-medium py-2 px-4 rounded-[50px] transition-colors bg-destructive-500 text-white hover:bg-destructive-600 ${
              isConfirmed
                ? "hover:bg-destructive-600"
                : "bg-destructive-500 text-white hover:bg-destructive-600 opacity-50 cursor-not-allowed"
            }`}
          >
            {en.simulation.deleteForever}
          </button>
        </div>
      </div>
    </div>
  );
};
