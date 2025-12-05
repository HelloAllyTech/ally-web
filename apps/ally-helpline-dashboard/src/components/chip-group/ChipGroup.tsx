import { FC } from "react";

export interface ChipItem {
  id: string | number;
  name: string;
}

export interface ChipGroupProps {
  items: ChipItem[];
  maxVisible?: number;
  className?: string;
  chipClassName?: string;
  overflowClassName?: string;
}

export const ChipGroup: FC<ChipGroupProps> = ({
  items,
  maxVisible = 2,
  className = "",
  chipClassName = "",
  overflowClassName = "",
}) => {
  const visibleItems = items.slice(0, maxVisible);
  const overflowCount = items.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visibleItems.map(item => (
        <div
          key={item.id}
          className={`text-[11px] bg-gray-100 text-typography-700 border-[0.5px] min-h-[22px] border-gray-200 rounded-full px-[6px] overflow-hidden text-ellipsis whitespace-nowrap  pt-[2px] pb-[1px] ${chipClassName}`}
        >
          {item.name}
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className={`text-[11px] bg-gray-100 text-typography-700 border-[0.5px] border-gray-200 rounded-full h-[22px] w-[22px] text-center py-[2px] ${overflowClassName}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
};

export default ChipGroup;
