import { FC, useEffect, useRef, useState } from "react";

import { Close } from "@assets";
import { FilterListProps } from "@components/types";
import { en, DEFAULT_SIMULATION_STATUS_OPTIONS } from "@constants";
import { useClickOutside } from "@hooks";

export const FilterList: FC<FilterListProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedFilters,
  options = DEFAULT_SIMULATION_STATUS_OPTIONS,
}) => {
  const [selectedStatuses, setSelectedStatuses] = useState<Array<{ id: string; label: string }>>(
    [],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useClickOutside(containerRef, onClose);

  useEffect(() => {
    setSelectedStatuses(selectedFilters);
  }, [selectedFilters]);

  const handleStatusChange = (status: { id: string; label: string }) => {
    const updatedStatuses = selectedStatuses.some(selectedStatus => selectedStatus.id === status.id)
      ? selectedStatuses.filter(selectedStatus => selectedStatus.id !== status.id)
      : [...selectedStatuses, status];

    setSelectedStatuses(updatedStatuses);
  };

  if (!isOpen) return null;

  const onApplyFilters = () => {
    onApply(selectedStatuses);
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 z-10 left-[40px] bg-white rounded-lg border w-56 animate-in fade-in-0 duration-200 px-[20px] py-[18px] font-['IBM_Plex_Serif']"
      onClick={e => e.stopPropagation()}
    >
      <button onClick={onClose} className="absolute right-[16px]">
        <Close />
      </button>
      <div className="space-y-3">
        <h3 className="text-gray-400 font-medium">{en.simulation.status}</h3>
        <div className="space-y-3 border-b pb-2">
          {options.map(option => (
            <label key={option.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                onChange={() => handleStatusChange(option)}
                checked={selectedStatuses.some(status => status.id === option.id)}
                className="w-4 h-4 border-gray-400  focus:ring-blue-500 accent-gray-100"
              />
              <span className="text-[14px] leading-relaxed text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onApplyFilters}
            className="bg-[#0957D0] text-white rounded-full px-6 py-1 hover:bg-blue-700 transition-colors font-[Roboto] text-[14px]"
          >
            {en.simulation.apply}
          </button>
        </div>
      </div>
    </div>
  );
};
