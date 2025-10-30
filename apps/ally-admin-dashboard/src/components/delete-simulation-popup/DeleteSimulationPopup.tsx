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
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in fade-in-0 zoom-in-95 duration-200 px-[32px] py-[24px] text-gray-700 font-['IBM_Plex_Serif']">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-[8px] right-[8px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Close width={24} height={24} />
        </button>

        {/* Header */}
        <div className="text-center mb-2">
          <h2 className="text-[24px] font-medium font-['Replay_Pro']">
            {en.simulation.deleteDescription}
            <span className="italic font-semibold ml-1">
              {en.simulation.simulation.toLowerCase()}
            </span>
            ?
          </h2>
        </div>

        {/* Simulation details card */}
        <div className="rounded-lg p-2 mb-3 flex items-center gap-4 border border-gray-200">
          <div className="w-24 h-16 rounded-lg flex-shrink-0 flex items-center justify-center">
            <CustomImage
              src={simulation.coverImageUrl}
              alt={simulation.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] truncate">{simulation.title}</h3>
            <p className="text-gray-500 text-[14px] mt-1 line-clamp-2">{simulation.description}</p>
          </div>
        </div>

        {/* Confirmation checkbox */}
        <div className="mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={e => setIsConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-[14px] leading-relaxed">
              {en.simulation.deleteConfirmationText}
            </span>
          </label>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 bg-white border border-gray-300 text-[14px] font-medium py-2 px-4 rounded-[50px] hover:bg-gray-50 transition-colors"
          >
            {en.simulation.cancel}
          </button>
          <button
            onClick={handleConfirmDelete}
            disabled={!isConfirmed}
            className={`flex-1 text-[14px] font-medium py-2 px-4 rounded-[50px] transition-colors bg-red-600 text-white hover:bg-red-700 ${
              isConfirmed
                ? "hover:bg-red-700"
                : "bg-red-600 text-white hover:bg-red-700 opacity-50 cursor-not-allowed"
            }`}
          >
            {en.simulation.deleteForever}
          </button>
        </div>
      </div>
    </div>
  );
};
