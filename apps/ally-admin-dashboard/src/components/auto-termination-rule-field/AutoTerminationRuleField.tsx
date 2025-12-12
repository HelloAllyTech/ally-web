import { useState } from "react";

import { useGetSessionEventsQuery } from "@api";
import { ToggleSwitch } from "@components";
import { en } from "@constants";

import { DropdownField } from "../dropdown-field";
import { InputField } from "../input-field";

interface AutoTerminationRuleFieldProps {
  label?: string;
  formMethods: any;
}

const TERMINATION_FIELDS_MAP = {
  toggle: {
    id: "autoTerminationStatus",
    label: en.simulation.autoTermination,
  },
  triggerEvent: {
    id: "terminationEventId",
    label: en.simulation.triggerEvent,
    placeholder: en.simulation.triggerEventPlaceholder,
  },
  triggerMessage: {
    id: "terminationMessage",
    label: en.simulation.triggerMessage,
    placeholder: en.simulation.terminationMessagePlaceholder,
  },
};

const DEFAULT_LIMIT = 100;
const DEFAULT_OFFSET = 0;

export const AutoTerminationRuleField: React.FC<AutoTerminationRuleFieldProps> = ({
  label,
  formMethods,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const { setValue, watch } = formMethods;
  const autoTerminationStatus = watch(TERMINATION_FIELDS_MAP.toggle.id);

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

  const handleSearchTextChange = (searchTerm: string) => {
    setSearchTerm(searchTerm);
  };

  const handleToggle = () => {
    setValue(TERMINATION_FIELDS_MAP.toggle.id, !autoTerminationStatus);
  };

  return (
    <div className="flex flex-col gap-6 w-full border border-border-light rounded-md p-4 mi">
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
          <div className="flex flex-col gap-2">
            <label className="text-base text-typography-900 flex items-center gap-1">
              {TERMINATION_FIELDS_MAP.triggerEvent.label} {autoTerminationStatus && mandatoryIcon}
            </label>
            <DropdownField
              id={TERMINATION_FIELDS_MAP.triggerEvent.id}
              label={TERMINATION_FIELDS_MAP.triggerEvent.label}
              formMethods={formMethods}
              options={eventOptions}
              isSearchable
              handleSearchTextChange={handleSearchTextChange}
              placeholder={TERMINATION_FIELDS_MAP.triggerEvent.placeholder}
              isMandatory={autoTerminationStatus}
              defaultOption={formMethods.getValues().terminationName}
            />
          </div>

          <InputField
            label={TERMINATION_FIELDS_MAP.triggerMessage.label}
            id={TERMINATION_FIELDS_MAP.triggerMessage.id}
            formMethods={formMethods}
            multiline
            placeholder={TERMINATION_FIELDS_MAP.triggerMessage.placeholder}
            maxLength={200}
            minHeight="120"
            isMandatory={autoTerminationStatus}
          />
        </div>
      )}
    </div>
  );
};
