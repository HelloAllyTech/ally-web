import { FC, Fragment, useEffect, useRef, useState } from "react";

import { Close } from "@assets";
import { FilterListProps } from "@components/types";
import { en } from "@constants";
import { useClickOutside } from "@hooks";

export const FilterList: FC<FilterListProps> = ({
  isOpen,
  onClose,
  onApply,
  selectedFilters,
  options,
  sections,
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

  // Single-group (legacy) callers pass `options`; multi-dimension callers
  // pass `sections`. Both render through the same checkbox-group markup.
  const filterSections = sections ?? [{ title: en.simulation.status, options: options ?? [] }];

  return (
    <div
      ref={containerRef}
      className="absolute top-0 z-50 left-[40px] bg-white rounded-lg border w-56 animate-in fade-in-0 duration-200 px-[20px] py-[18px] font-primary"
      onClick={e => e.stopPropagation()}
    >
      <button onClick={onClose} className="absolute right-[16px]">
        <Close />
      </button>
      <div className="space-y-3">
        {filterSections.map(section => (
          <Fragment key={section.title}>
            <div className="text-typography-600 font-regular text-base">{section.title}</div>
            <div className="space-y-3 border-b pb-2">
              {section.options.map(option => (
                <label key={option.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    onChange={() => handleStatusChange(option)}
                    checked={selectedStatuses.some(status => status.id === option.id)}
                    className="w-4 h-4 border-border-dark focus:ring-primary accent-neutral-100"
                  />
                  <span className="text-base leading-relaxed text-typography-900">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </Fragment>
        ))}
        <div className="flex justify-end">
          <button
            onClick={onApplyFilters}
            className="bg-primary-500 text-white rounded-full px-6 py-1 hover:bg-primary-700 transition-colors font-tertiary text-base"
          >
            {en.simulation.apply}
          </button>
        </div>
      </div>
    </div>
  );
};
