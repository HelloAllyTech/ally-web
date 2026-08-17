import { FC, useEffect, useRef } from "react";

import { TRACK_ITEM_TYPE_DESCRIPTIONS, TRACK_ITEM_TYPE_LABELS } from "@constants";
import { TrackItemType } from "@types";

interface ComponentTypePickerProps {
  onSelect: (type: TrackItemType) => void;
  onClose: () => void;
}

const TYPE_ORDER: TrackItemType[] = [
  TrackItemType.ROLEPLAY,
  TrackItemType.CASE,
  TrackItemType.QUIZ,
  TrackItemType.ANNOTATED_ARTIFACT,
  TrackItemType.ARTICLE,
  TrackItemType.VIDEO,
  TrackItemType.JOURNAL,
];

/** Popover with the component-type tiles for adding an item to a section. */
export const ComponentTypePicker: FC<ComponentTypePickerProps> = ({ onSelect, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-30 left-0 top-full mt-1 w-64 bg-white border border-border-light rounded-md shadow-lg p-2"
    >
      <p className="text-xs font-medium text-typography-500 px-2 py-1">Add component</p>
      <div className="flex flex-col">
        {TYPE_ORDER.map(type => (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(type)}
            className="text-left rounded-md px-2 py-2 hover:bg-secondary-50"
          >
            <span className="block text-sm font-medium text-typography-900">
              {TRACK_ITEM_TYPE_LABELS[type]}
            </span>
            <span className="block text-xs text-typography-500">
              {TRACK_ITEM_TYPE_DESCRIPTIONS[type]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
