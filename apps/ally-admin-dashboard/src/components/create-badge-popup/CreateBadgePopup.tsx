import { FC } from "react";

import { Calendar, Contribution, Compress, Timer } from "@assets";
import { OptionSelectionPopover } from "@components";
import { en } from "@constants";

export type Badge =
  | "SIMULATION_MINUTES"
  | "ACTIVE_DAY_STREAK"
  | "COMMENTS_REACTIONS_GIVEN"
  | "COMMENTS_REACTIONS_RECEIVED";

export interface BadgeOption {
  value: Badge;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  role: string;
}

export const BADGE_POPUP_OPTIONS: BadgeOption[] = [
  {
    value: "SIMULATION_MINUTES",
    label: "App Journey Badges",
    description: "Earned when completing simulation minutes.",
    icon: Timer,
    role: "LEARNER",
  },
  {
    value: "ACTIVE_DAY_STREAK",
    label: "Momentum Badges",
    description: "Earned when maintaining a streak.",
    icon: Calendar,
    role: "LEARNER",
  },
  {
    value: "COMMENTS_REACTIONS_GIVEN",
    label: "Contribution Badges",
    description: "Earned when giving comment or reactions.",
    icon: Contribution,
    role: "SIMULATION_REVIEWER",
  },
  {
    value: "COMMENTS_REACTIONS_RECEIVED",
    label: "Resonance Badges",
    description: "Earned when receiving comment or reactions.",
    icon: Compress,
    role: "LEARNER",
  },
];

interface CreateBadgePopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (Badge: string) => void;
}

export const CreateBadgePopup: FC<CreateBadgePopupProps> = ({ isOpen, onClose, onSelect }) => {
  return (
    <OptionSelectionPopover
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelect}
      options={BADGE_POPUP_OPTIONS}
      title={en.simulation.createNewBadge}
      description={en.simulation.selectBadgeType}
      buttonText={en.simulation.createBadge}
    />
  );
};
