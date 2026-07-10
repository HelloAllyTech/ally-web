import { FC } from "react";

import { CustomCircularProgress } from "@components";
import { TrackDetailItem, TrackItemStatus, TrackSection } from "@types";

import { TrackItemNode } from "./TrackItemNode";

interface SectionMilestoneProps {
  section: TrackSection;
  sectionIndex: number;
  /** Id of the next actionable item across the whole track (for the chip). */
  nextItemId: string | null;
  onItemClick: (item: TrackDetailItem) => void;
}

/**
 * A milestone group on the journey map: section header row (index badge
 * wrapped in a progress ring) and its item nodes hanging off a vertical
 * connector line.
 */
export const SectionMilestone: FC<SectionMilestoneProps> = ({
  section,
  sectionIndex,
  nextItemId,
  onItemClick,
}) => {
  const items = [...section.items].sort((a, b) => a.order - b.order);
  const completedCount = items.filter(item => item.status === TrackItemStatus.COMPLETED).length;
  const sectionPct = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <section aria-label={section.title} className="relative">
      {/* Section header */}
      <div className="flex items-center gap-3 py-2">
        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
          {/* CustomCircularProgress draws its circle for the default 20px
              viewBox only — render at default size and stretch via CSS. */}
          <div className="absolute inset-0 [&_svg]:!h-full [&_svg]:!w-full">
            <CustomCircularProgress value={sectionPct} color="rgb(var(--color-primary-500))" />
          </div>
          <span className="text-sm font-semibold text-typography-900">{sectionIndex + 1}</span>
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-typography-900">{section.title}</h2>
          {section.description && (
            <p className="truncate text-xs text-typography-700">{section.description}</p>
          )}
        </div>
      </div>

      {/* Items on the connector line */}
      <div className="relative ml-6 border-l-2 border-border-light pl-5 sm:pl-7 pb-6">
        <div className="flex flex-col gap-3 pt-1">
          {items.map((item, index) => (
            <div key={item.id} className="relative">
              {/* Connector dot */}
              <span
                aria-hidden
                className={`absolute -left-[27px] sm:-left-[35px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 ${
                  item.status === TrackItemStatus.COMPLETED
                    ? "bg-primary-500 border-primary-500"
                    : item.status === TrackItemStatus.UNLOCKED
                      ? "bg-white border-primary-500"
                      : "bg-neutral-200 border-border-light"
                }`}
              />
              <TrackItemNode
                item={item}
                index={index}
                isNext={item.id === nextItemId}
                onClick={onItemClick}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
