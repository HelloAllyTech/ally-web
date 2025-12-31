import { useState } from "react";

import { useGetSessionEventsQuery } from "@api";
import { BlueAdd, TrashRed } from "@assets";
import { ToggleSwitch } from "@components";
import { en } from "@constants";

import { DropdownField } from "../dropdown-field";
import { InputField } from "../input-field";

interface AutoTerminationRuleFieldProps {
  label?: string;
  formMethods: any;
}

const AUTO_TERMINATION_TOGGLE_FIELD = "autoTerminationStatus";
const TERMINATION_RULES_FIELD = "terminationRules";

const TERMINATION_FIELDS_MAP = {
  triggerEvent: {
    id: "terminationEventId",
    label: en.simulation.triggerEvent,
  },
  triggerMessage: {
    id: "terminationMessage",
    label: en.simulation.triggerMessage,
    placeholder: en.simulation.terminationMessagePlaceholder,
  },
};

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;
const RULE_LIMIT = 10;

export const AutoTerminationRuleField: React.FC<AutoTerminationRuleFieldProps> = ({
  label,
  formMethods,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { setValue, watch } = formMethods;
  const autoTerminationStatus = watch(AUTO_TERMINATION_TOGGLE_FIELD) || false;
  const terminationRules = watch(TERMINATION_RULES_FIELD) || [];

  const { data: sessionEventsData } = useGetSessionEventsQuery({
    offset: DEFAULT_OFFSET,
    limit: DEFAULT_LIMIT,
    searchName: searchTerm,
  });

  const eventOptions =
    sessionEventsData?.data?.map(event => ({
      value: event.id || "",
      label: event.name || "",
    })) || [];

  const mandatoryIcon = <span className="text-destructive-500">*</span>;

  const createEmptyRule = () => ({
    id: terminationRules.length + 1,
    terminationEventId: "",
    terminationMessage: "",
  });

  const handleSearchTextChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
  };

  const handleToggle = () => {
    const newStatus = !autoTerminationStatus;
    setValue(AUTO_TERMINATION_TOGGLE_FIELD, newStatus);

    if (newStatus) {
      setValue(TERMINATION_RULES_FIELD, [createEmptyRule()]);
    } else {
      setValue(TERMINATION_RULES_FIELD, []);
    }
  };
  const handleAddTermination = () => {
    setValue(TERMINATION_RULES_FIELD, [...terminationRules, createEmptyRule()]);
  };

  const handleRemoveTermination = (ruleId: number) => {
    const updatedRules = terminationRules.filter((rule: any) => rule.id !== ruleId);
    setValue(TERMINATION_RULES_FIELD, updatedRules);
  };

  return (
    <div
      className={`flex flex-col gap-6 w-full border border-border-light rounded-md p-4  ${autoTerminationStatus ? "bg-secondary-50" : "bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-base text-typography-900">{label}</span>
        <div className="flex items-center gap-2">
          <ToggleSwitch enabled={autoTerminationStatus} onChange={handleToggle} />
          <span className="text-base text-typography-900 min-w-[55px]">
            {autoTerminationStatus ? en.common.enabled : en.common.disabled}
          </span>
        </div>
      </div>

      {autoTerminationStatus && (
        <div className="flex flex-col gap-6">
          {terminationRules.map((rule: any, index: number) => (
            <div
              key={rule.id}
              className="flex flex-col gap-4 border border-border-light rounded-md p-4 bg-white relative"
            >
              <button
                type="button"
                onClick={() => handleRemoveTermination(rule.id)}
                disabled={terminationRules.length === 1}
                className="absolute top-2 right-2 disabled:opacity-40"
              >
                <TrashRed />
              </button>

              <div className="flex flex-col gap-2">
                <label className="text-base text-typography-900 flex items-center gap-1">
                  {TERMINATION_FIELDS_MAP.triggerEvent.label} {mandatoryIcon}
                </label>
                <DropdownField
                  id={`${TERMINATION_RULES_FIELD}.${index}.${TERMINATION_FIELDS_MAP.triggerEvent.id}`}
                  label={TERMINATION_FIELDS_MAP.triggerEvent.label}
                  formMethods={formMethods}
                  options={eventOptions}
                  isSearchable
                  handleSearchTextChange={handleSearchTextChange}
                  isMandatory={autoTerminationStatus}
                  defaultOption={rule.terminationEventId || ""}
                />
              </div>

              <InputField
                label={TERMINATION_FIELDS_MAP.triggerMessage.label}
                id={`${TERMINATION_RULES_FIELD}.${index}.${TERMINATION_FIELDS_MAP.triggerMessage.id}`}
                formMethods={formMethods}
                multiline
                placeholder={TERMINATION_FIELDS_MAP.triggerMessage.placeholder}
                maxLength={200}
                minHeight="120"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddTermination}
            className="text-primary-500 flex gap-3 items-center font-semibold font-tertiary text-base disabled:opacity-40"
            disabled={terminationRules.length >= RULE_LIMIT}
          >
            <BlueAdd />
            {en.simulation.add}
          </button>
        </div>
      )}
    </div>
  );
};
