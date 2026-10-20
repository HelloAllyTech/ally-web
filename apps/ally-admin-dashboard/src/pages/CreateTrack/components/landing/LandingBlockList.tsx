import { FC } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { Locked } from "@assets";
import { ToggleSwitch } from "@components";
import { en } from "@constants";
import { TrackLandingPage } from "@types";

import {
  LANDING_BLOCK_ORDER,
  LandingBlockKey,
  LandingBlockStatus,
  LandingToggleKey,
  hasLandingToggle,
} from "./landingBlocks";

const STATUS_STYLES: Record<LandingBlockStatus, string> = {
  SET: "bg-success-50 text-success-700",
  AUTO: "bg-primary-50 text-primary-700",
  NEEDS_INPUT: "bg-warning-50 text-warning-text",
  OFF: "bg-secondary-50 text-typography-700",
};

export const LandingStatusTag: FC<{ status: LandingBlockStatus }> = ({ status }) => (
  <span
    className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs lg:text-[10px] ${STATUS_STYLES[status]}`}
    data-testid="landing-status-tag"
  >
    {en.courseLanding.status[status]}
  </span>
);

interface LandingBlockListProps {
  statuses: Record<LandingBlockKey, LandingBlockStatus>;
  selected: LandingBlockKey;
  onSelect: (key: LandingBlockKey) => void;
  page: TrackLandingPage;
  onToggle: (key: LandingToggleKey, enabled: boolean) => void;
}

/** The block list: one row per block with its status tag and, where it has one, its on/off switch. */
export const LandingBlockList: FC<LandingBlockListProps> = ({
  statuses,
  selected,
  onSelect,
  page,
  onToggle,
}) => (
  <ul aria-label={en.courseLanding.blockListLabel} className="flex flex-col gap-1">
    {LANDING_BLOCK_ORDER.map(key => {
      const label = en.courseLanding.blocks[key];
      const isSelected = key === selected;
      return (
        <li
          key={key}
          className={`flex items-center gap-2 pr-2 rounded-md ${
            isSelected
              ? "bg-primary-50 text-primary-700"
              : "hover:bg-secondary-50 text-typography-800"
          }`}
          data-testid={`landing-block-${key}`}
        >
          <button
            type="button"
            onClick={() => onSelect(key)}
            aria-current={isSelected ? "true" : undefined}
            className="flex-1 min-w-0 flex items-center gap-2 px-2 py-2 max-lg:min-h-10 text-left"
          >
            <span className="text-sm font-medium truncate">{label}</span>
            <LandingStatusTag status={statuses[key]} />
          </button>
          {hasLandingToggle(key) ? (
            <ToggleSwitch
              enabled={page[key].enabled}
              onChange={enabled => onToggle(key, enabled)}
              label={en.courseLanding.toggleLabel(label)}
            />
          ) : key === "contentNotes" ? (
            <Tooltip label={en.courseLanding.contentNotesLockHint} align="top">
              <button
                type="button"
                className="inline-flex items-center justify-center w-6 h-6 cursor-help text-typography-700"
                aria-label={en.courseLanding.contentNotesLockHint}
              >
                <Locked className="w-4 h-4" aria-hidden="true" />
              </button>
            </Tooltip>
          ) : (
            // Hero has no switch of its own: its hook is what turns the layout on. A spacer keeps
            // the status tags of every row lined up with the switches below it.
            <span className="w-11" aria-hidden="true" />
          )}
        </li>
      );
    })}
  </ul>
);
