import { FC } from "react";

import { AccountTree, AlarmOn, DiamondShine, BinaryClassification } from "@assets";
import { OptionSelectionPopover } from "@components";
import { en } from "@constants";

export type EventType =
  // SENTENCE_SIMILARITY / SEMANTIC_SIMILARITY are deprecated — retired from
  // EVENT_TYPE_POPUP_OPTIONS below (can no longer be created), but kept in
  // this union since existing events of these types still need to type-check
  // through EVENT_TYPE_OPTIONS / TRIGGER_CONDITION_CONFIGS for read/edit.
  | "SENTENCE_SIMILARITY"
  | "SEMANTIC_SIMILARITY"
  | "TIME_BASED"
  | "SCORE_BASED"
  | "COMBINATION"
  | "BINARY_CLASSIFIER";

export interface EventTypeOption {
  value: EventType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Sentence Similarity / Semantic Similarity are deprecated and intentionally
// absent here — this array drives the "Create event" picker, so removing
// them stops new events of these types from being created. Existing events
// of these types still render correctly via EVENT_TYPE_OPTIONS /
// TRIGGER_CONDITION_CONFIGS, which are untouched.
export const EVENT_TYPE_POPUP_OPTIONS: EventTypeOption[] = [
  {
    value: "BINARY_CLASSIFIER",
    label: "Binary Classification (Zero-shot)",
    description: "Trigger based on binary classification.",
    icon: BinaryClassification,
  },
  {
    value: "TIME_BASED",
    label: "Time Based",
    description: "Trigger before, after, or at a specific time.",
    icon: AlarmOn,
  },
  {
    value: "SCORE_BASED",
    label: "Score Based",
    description: "Trigger when score is greater, less, or equal to threshold.",
    icon: DiamondShine,
  },
  {
    value: "COMBINATION",
    label: "Combination of",
    description: "Trigger based on multiple events.",
    icon: AccountTree,
  },
];

interface EventTypeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (eventType: string) => void;
}

export const EventTypeSelectionDialog: FC<EventTypeSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  return (
    <OptionSelectionPopover
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelect}
      options={EVENT_TYPE_POPUP_OPTIONS}
      title={en.simulation.createNewEvent}
      description={en.simulation.selectEventType}
      buttonText="Create event"
    />
  );
};
