import { FC } from "react";

import { useGetComponentTemplatesQuery } from "@api";
import { Close } from "@assets";
import { NO_SAVED_TEMPLATES_MESSAGE, START_BLANK_LABEL, TRACK_ITEM_TYPE_LABELS } from "@constants";
import {
  CompletionCriteria,
  TrackComponentTemplate,
  TrackItemContent,
  TrackItemType,
} from "@types";
import { formatRelativeTime } from "@utils";

interface TemplatePickerModalProps {
  type: TrackItemType;
  onClose: () => void;
  onStartBlank: () => void;
  /**
   * `content`/`completionCriteria` are freshly deep-copied before this fires —
   * never the RTK Query cache's own template object — so the caller can
   * mutate them into a new item without ever touching the saved template.
   */
  onSelectTemplate: (
    type: TrackItemType,
    content: TrackItemContent,
    completionCriteria: CompletionCriteria | null,
    title: string,
  ) => void;
}

/** Structural clone with a JSON fallback for environments with no `structuredClone`. */
const deepClone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

/**
 * Modal opened from "Choose from library" on the type picker, scoped to a
 * single component type. Selecting a template inserts a deep copy of its
 * content as a brand-new item — there is never a live link back to the
 * template, so editing one can never affect the other.
 */
export const TemplatePickerModal: FC<TemplatePickerModalProps> = ({
  type,
  onClose,
  onStartBlank,
  onSelectTemplate,
}) => {
  const { data, isLoading } = useGetComponentTemplatesQuery({ type });
  const templates = data?.items ?? [];

  const handleSelect = (template: TrackComponentTemplate) => {
    onSelectTemplate(
      template.type,
      deepClone(template.content),
      template.completionCriteria ? deepClone(template.completionCriteria) : null,
      template.title,
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-[420px] max-h-[70vh] bg-white rounded-md shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
          <span className="text-sm font-semibold text-typography-900">
            {TRACK_ITEM_TYPE_LABELS[type]} templates
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-typography-500 hover:text-typography-700"
          >
            <Close className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <p className="px-2 py-6 text-center text-sm text-typography-500">Loading templates…</p>
          ) : templates.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-typography-500">
              {NO_SAVED_TEMPLATES_MESSAGE}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleSelect(template)}
                  className="text-left rounded-md px-3 py-2 hover:bg-secondary-50 flex items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium text-typography-900 truncate">
                    {template.title}
                  </span>
                  <span className="text-xs text-typography-500 flex-shrink-0">
                    {formatRelativeTime(template.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border-light">
          <button
            type="button"
            onClick={onStartBlank}
            className="w-full text-center rounded-md border border-dashed border-border-dark py-2 text-sm text-typography-700 hover:bg-secondary-50"
          >
            {START_BLANK_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
};
