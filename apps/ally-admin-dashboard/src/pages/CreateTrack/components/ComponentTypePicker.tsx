import { FC, useEffect, useRef, useState } from "react";

import { ArrowSolid } from "@assets";
import {
  CHOOSE_FROM_LIBRARY_LABEL,
  isComponentLibrarySupportedType,
  START_BLANK_LABEL,
  TRACK_ITEM_TYPE_DESCRIPTIONS,
  TRACK_ITEM_TYPE_LABELS,
} from "@constants";
import { useCanViewComponentLibrary } from "@hooks";
import { CompletionCriteria, TrackItemContent, TrackItemType } from "@types";

import { TemplatePickerModal } from "./TemplatePickerModal";

interface ComponentTypePickerProps {
  onSelect: (type: TrackItemType) => void;
  onClose: () => void;
  /**
   * Fired when the author picks a saved template instead of starting blank.
   * `content`/`completionCriteria` are already deep-copied by
   * `TemplatePickerModal` — the caller can safely mutate them into a new item
   * with no risk of touching the RTK Query cache's copy of the template.
   */
  onSelectTemplate?: (
    type: TrackItemType,
    content: TrackItemContent,
    completionCriteria: CompletionCriteria | null,
    title: string,
  ) => void;
}

const TYPE_ORDER: TrackItemType[] = [
  TrackItemType.ROLEPLAY,
  TrackItemType.CASE,
  TrackItemType.QUIZ,
  TrackItemType.ANNOTATED_ARTIFACT,
  TrackItemType.ARTICLE,
  TrackItemType.VIDEO,
  TrackItemType.JOURNAL,
  TrackItemType.GAME,
];

/**
 * Popover with the component-type tiles for adding an item to a section.
 * ROLEPLAY/CASE/GAME still add a blank item immediately on click — unchanged.
 * The 5 Component Library types (JOURNAL/QUIZ/ARTICLE/VIDEO/ANNOTATED_ARTIFACT)
 * instead show a "Start blank" / "Choose from library" sub-choice, but only
 * when the viewer can actually reach the library — otherwise they behave
 * exactly like the other tiles, since there would be only one option to pick.
 */
export const ComponentTypePicker: FC<ComponentTypePickerProps> = ({
  onSelect,
  onClose,
  onSelectTemplate,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const canViewLibrary = useCanViewComponentLibrary();
  const [subChoiceType, setSubChoiceType] = useState<TrackItemType | null>(null);
  const [templateModalType, setTemplateModalType] = useState<TrackItemType | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // The template modal owns its own dismissal while it's open — an
      // outside click there should not also tear down this popover
      // underneath it.
      if (templateModalType) return;
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, templateModalType]);

  const handleTileClick = (type: TrackItemType) => {
    if (canViewLibrary && isComponentLibrarySupportedType(type)) {
      setSubChoiceType(type);
      return;
    }
    onSelect(type);
  };

  return (
    <div
      ref={ref}
      className="absolute z-30 left-0 top-full mt-1 w-64 bg-white border border-border-light rounded-md shadow-lg p-2"
    >
      <p className="text-xs font-medium text-typography-500 px-2 py-1">Add component</p>
      <div className="flex flex-col">
        {TYPE_ORDER.map(type =>
          subChoiceType === type ? (
            <div key={type} className="flex flex-col rounded-md px-2 py-1.5 gap-1 bg-secondary-50">
              <button
                type="button"
                onClick={() => setSubChoiceType(null)}
                className="inline-flex items-center gap-1 text-xs text-typography-500 hover:text-typography-700 w-fit mb-1"
              >
                <ArrowSolid className="w-3 h-3 rotate-90" />
                Back
              </button>
              <button
                type="button"
                onClick={() => onSelect(type)}
                className="text-left rounded-md px-2 py-2 text-sm font-medium text-typography-900 hover:bg-white"
              >
                {START_BLANK_LABEL}
              </button>
              <button
                type="button"
                onClick={() => setTemplateModalType(type)}
                className="text-left rounded-md px-2 py-2 text-sm font-medium text-typography-900 hover:bg-white"
              >
                {CHOOSE_FROM_LIBRARY_LABEL}
              </button>
            </div>
          ) : (
            <button
              key={type}
              type="button"
              onClick={() => handleTileClick(type)}
              className="text-left rounded-md px-2 py-2 hover:bg-secondary-50"
            >
              <span className="block text-sm font-medium text-typography-900">
                {TRACK_ITEM_TYPE_LABELS[type]}
              </span>
              <span className="block text-xs text-typography-500">
                {TRACK_ITEM_TYPE_DESCRIPTIONS[type]}
              </span>
            </button>
          ),
        )}
      </div>

      {templateModalType && (
        <TemplatePickerModal
          type={templateModalType}
          onClose={() => setTemplateModalType(null)}
          onStartBlank={() => {
            onSelect(templateModalType);
            setTemplateModalType(null);
          }}
          onSelectTemplate={(type, content, completionCriteria, title) => {
            onSelectTemplate?.(type, content, completionCriteria, title);
            setTemplateModalType(null);
          }}
        />
      )}
    </div>
  );
};
