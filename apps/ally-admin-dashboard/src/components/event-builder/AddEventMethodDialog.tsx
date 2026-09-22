import { FC } from "react";

import { DiamondShine, Search } from "@assets";

// By path, not through the `@components` barrel — see the note in
// GenerateEventPanel about the `@components` <-> `@constants` cycle.
import { OptionSelectionPopover } from "../option-selection-popover";

/**
 * How the author wants to add an advanced event to a simulation.
 *
 * The two options are not two kinds of event — they are two ways to get one,
 * and the second is exactly what "Add event" did before. Naming the choice
 * rather than replacing the old behaviour matters because the catalogue is
 * shared: reusing an event that already exists keeps a simulation's reporting
 * comparable with everyone else's, and a generator that quietly became the only
 * path would fill the library with near-duplicates of events already in it.
 */
export const ADD_EVENT_METHOD = {
  DESCRIBE: "describe",
  CATALOGUE: "catalogue",
} as const;

export type AddEventMethod = (typeof ADD_EVENT_METHOD)[keyof typeof ADD_EVENT_METHOD];

const OPTIONS = [
  {
    value: ADD_EVENT_METHOD.DESCRIBE,
    label: "Describe it",
    description: "Write what to detect; we'll draft the classification and its examples.",
    icon: DiamondShine,
  },
  {
    value: ADD_EVENT_METHOD.CATALOGUE,
    label: "Pick from the catalogue",
    description: "Reuse an event that already exists.",
    icon: Search,
  },
];

interface AddEventMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: AddEventMethod) => void;
}

export const AddEventMethodDialog: FC<AddEventMethodDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => (
  <OptionSelectionPopover
    isOpen={isOpen}
    onClose={onClose}
    onSelect={value => onSelect(value as AddEventMethod)}
    options={OPTIONS}
    title="Add event"
    description="Add an event to this simulation."
    buttonText="Continue"
  />
);
