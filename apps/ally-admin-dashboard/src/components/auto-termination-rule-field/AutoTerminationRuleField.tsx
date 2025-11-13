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

export const AutoTerminationRuleField: React.FC<AutoTerminationRuleFieldProps> = ({
  label,
  formMethods,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);

  const { setValue } = formMethods;

  const { data: sessionEventsData } = useGetSessionEventsQuery({});

  const eventOptions =
    sessionEventsData?.data?.map(event => ({
      value: event.id || "",
      label: event.name || "",
    })) || [];

  const mandatoryIcon = <span className="text-destructive-500">*</span>;

  const handleToggle = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    setValue(TERMINATION_FIELDS_MAP.toggle.id, newValue);
    if (!newValue) {
      setValue(TERMINATION_FIELDS_MAP.triggerEvent.id, "");
      setValue(TERMINATION_FIELDS_MAP.triggerMessage.id, "");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full border border-border-light rounded-md p-4 mi">
      <div className="flex items-center justify-between">
        <span className="text-base text-typography-900">{label}</span>
        <div className="flex items-center gap-2">
          <ToggleSwitch enabled={isEnabled} onChange={handleToggle} />
          <span className="text-base text-typography-900 min-w-[55px]">
            {isEnabled ? en.common.enabled : en.common.disabled}
          </span>
        </div>
      </div>

      {isEnabled && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-base text-typography-900 flex items-center gap-1">
              {TERMINATION_FIELDS_MAP.triggerEvent.label} {isEnabled && mandatoryIcon}
            </label>
            <DropdownField
              id={TERMINATION_FIELDS_MAP.triggerEvent.id}
              label={TERMINATION_FIELDS_MAP.triggerEvent.label}
              formMethods={formMethods}
              options={eventOptions}
              placeholder={TERMINATION_FIELDS_MAP.triggerEvent.placeholder}
              isMandatory={isEnabled}
            />
          </div>

          <InputField
            label={TERMINATION_FIELDS_MAP.triggerMessage.label}
            id={TERMINATION_FIELDS_MAP.triggerMessage.id}
            formMethods={formMethods}
            multiline={true}
            placeholder={TERMINATION_FIELDS_MAP.triggerMessage.placeholder}
            maxLength={200}
            minHeight="120"
            isMandatory={isEnabled}
          />
        </div>
      )}
    </div>
  );
};
