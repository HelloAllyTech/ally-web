import { useState, useEffect, useRef } from "react";

import { useGetSessionEventsQuery } from "@api";
import { BlueAdd, TrashRed } from "@assets";
import { en } from "@constants";

import { CustomDropdownField } from "../custom-dropdown-field";
import { InputField } from "../input-field";

interface AutoTerminationRuleFieldProps {
  label?: string;
  formMethods: any;
}

const TERMINATION_RULES_FIELD = "terminationEvents";

const TERMINATION_FIELDS_MAP = {
  triggerEvent: {
    id: "id",
    label: en.simulation.triggerEvent,
  },
  triggerMessage: {
    id: "message",
    label: en.simulation.triggerMessage,
    placeholder: en.simulation.terminationMessagePlaceholder,
  },
};

const createEmptyRule = () => ({
  id: "",
  message: "",
});

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;
const RULE_LIMIT = 10;

export const AutoTerminationRuleField: React.FC<AutoTerminationRuleFieldProps> = ({
  label,
  formMethods,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { setValue, watch } = formMethods;

  const watchedRules = watch(TERMINATION_RULES_FIELD) || [createEmptyRule()];

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

  const optionLabelMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    eventOptions.forEach(opt => {
      if (opt.value) optionLabelMapRef.current[opt.value] = opt.label;
    });
  }, [eventOptions]);

  const handleSearchTextChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
  };

  const handleAddTermination = () => {
    setValue(TERMINATION_RULES_FIELD, [...watchedRules, createEmptyRule()]);
  };

  const handleRemoveTermination = (ruleId: number) => {
    const updatedRules = watchedRules.filter((rule: any) => rule.id !== ruleId);
    setValue(TERMINATION_RULES_FIELD, updatedRules);
  };

  const onHandleSelect = (option: { value: string; label: string }) => {
    const updatedRules = watchedRules.map((rule: any) => {
      if (rule.id === option.value || rule.id === "") {
        return { id: option.value, message: rule.message, name: option.label };
      }
      return rule;
    });
    setValue(TERMINATION_RULES_FIELD, updatedRules);
  };

  return (
    <div
      className={`flex flex-col gap-6 w-full border border-border-light rounded-md p-4 bg-neutral-50 `}
    >
      <div className="flex items-center justify-between">
        <span className="text-base text-typography-900">{label}</span>
      </div>

      <div className="flex flex-col gap-6">
        {watchedRules.map((rule: any, index: number) => (
          <div
            key={rule.id}
            className="flex flex-col gap-4 border border-border-light rounded-md p-4 bg-white relative"
          >
            <button
              type="button"
              onClick={() => handleRemoveTermination(rule.id)}
              disabled={watchedRules.length === 1}
              className="absolute top-2 right-2 disabled:opacity-40"
            >
              <TrashRed />
            </button>

            <div className="flex flex-col gap-2">
              <label className="text-base text-typography-900 flex items-center gap-1">
                {TERMINATION_FIELDS_MAP.triggerEvent.label}
              </label>

              <CustomDropdownField
                options={eventOptions}
                isSearchable
                handleSearchTextChange={handleSearchTextChange}
                onHandleSelect={option => onHandleSelect(option)}
                defaultOption={{ label: rule?.name, value: rule?.id }}
              />
            </div>
            <InputField
              label={TERMINATION_FIELDS_MAP.triggerMessage.label}
              id={`${TERMINATION_RULES_FIELD}.${index}.${TERMINATION_FIELDS_MAP.triggerMessage.id}`}
              formMethods={formMethods}
              multiline
              defaultValue={rule?.message}
              placeholder={TERMINATION_FIELDS_MAP.triggerMessage.placeholder}
              maxLength={200}
              minHeight="120"
              disabled={!rule.id}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddTermination}
          className="text-primary-500 flex gap-3 items-center font-medium font-tertiary text-base disabled:opacity-40"
          disabled={watchedRules.length >= RULE_LIMIT || !watchedRules[watchedRules.length - 1]?.id}
        >
          <BlueAdd />
          {en.simulation.add}
        </button>
      </div>
    </div>
  );
};
