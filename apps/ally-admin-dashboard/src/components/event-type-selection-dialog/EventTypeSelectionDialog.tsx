import { FC } from "react";

import {
  AccountTree,
  AlarmOn,
  Chat,
  DiamondShine,
  SemanticSimilarity,
  BinaryClassification,
} from "@assets";
import { OptionSelectionPopover } from "@components";
import { en } from "@constants";

export type EventType =
  | "SENTENCE_SIMILARITY"
  | "SEMANTIC_SIMILARITY"
  | "TIME_BASED"
  | "SCORE_BASED"
  | "COMBINATION"
  | "BINARY_CLASSIFICATION";

export interface EventTypeOption {
  value: EventType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const EVENT_TYPE_POPUP_OPTIONS: EventTypeOption[] = [
  {
    value: "SENTENCE_SIMILARITY",
    label: "Sentence Similarity",
    description: "Trigger based on what the speaker says.",
    icon: Chat,
  },
  {
    value: "SEMANTIC_SIMILARITY",
    label: "Semantic Similarity",
    description: "Trigger based on similar meaning.",
    icon: SemanticSimilarity,
  },
  {
    value: "BINARY_CLASSIFICATION",
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
