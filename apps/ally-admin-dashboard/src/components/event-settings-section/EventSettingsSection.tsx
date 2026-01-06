import React from "react";

import { NumberInput, TimeInput } from "@components";

interface TimeWindowValues {
  applicableFrom?: string;
  applicableTill?: string | null;
}

interface OccurrenceControlValues {
  maxOccurrences?: number;
  minGapTime?: string;
}

interface TimeWindowCallbacks {
  onApplicableFromChange?: (value: string) => void;
  onApplicableTillChange?: (value: string | null) => void;
}

interface OccurrenceControlCallbacks {
  onMaxOccurrencesChange?: (value: number) => void;
  onMinGapTimeChange?: (value: string) => void;
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, children }) => (
  <div className="flex flex-row min-h-[40px] items-center text-base justify-between">
    <div className="w-[40%]">
      <span className="text-base font-regular text-typography-800">{label}</span>
    </div>
    <div className="w-[60%] flex text-left justify-start text-neutral-800">{children}</div>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-4 mt-4 mb-2">
    <span className="text-base font-regular text-typography-800 whitespace-nowrap">{title}</span>
    <div className="flex-1 h-[1px] bg-border-light" />
  </div>
);

export const TimeWindowSection: React.FC<TimeWindowValues & TimeWindowCallbacks> = ({
  applicableFrom = "00:00:00",
  applicableTill = null,
  onApplicableFromChange,
  onApplicableTillChange,
}) => {
  const handleApplicableFromChange = (value: string) => {
    onApplicableFromChange?.(value);
  };

  const handleApplicableTillChange = (value: string) => {
    if (value === "" || value === "∞") {
      onApplicableTillChange?.(null);
    } else {
      onApplicableTillChange?.(value);
    }
  };

  return (
    <>
      <SectionHeader title="Time Window" />

      <FieldRow label="Applicable from">
        <TimeInput
          value={applicableFrom}
          onChange={handleApplicableFromChange}
          placeholder="00:00:00"
          className="ml-[-10px]"
        />
      </FieldRow>

      <FieldRow label="Applicable till">
        {applicableTill === null || applicableTill === "00:00:00" ? (
          <span
            className="text-base cursor-pointer hover:text-typography-600"
            onClick={() =>
              onApplicableTillChange?.(applicableTill === null ? "00:01:00" : applicableTill)
            }
          >
            ∞
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <TimeInput
              value={applicableTill}
              onChange={handleApplicableTillChange}
              placeholder="00:00:00"
              className="ml-[-10px]"
            />
          </div>
        )}
      </FieldRow>
    </>
  );
};

export const OccurrenceControlSection: React.FC<
  OccurrenceControlValues & OccurrenceControlCallbacks
> = ({
  maxOccurrences = 1,
  minGapTime = "00:00:00",
  onMaxOccurrencesChange,
  onMinGapTimeChange,
}) => {
  const handleMaxOccurrencesChange = (value: number) => {
    onMaxOccurrencesChange?.(value);
  };

  const handleMinGapTimeChange = (value: string) => {
    onMinGapTimeChange?.(value);
  };

  return (
    <>
      <SectionHeader title="Occurrence Control" />

      <FieldRow label="Maximum occurrences">
        <NumberInput
          value={maxOccurrences}
          onChange={handleMaxOccurrencesChange}
          min={1}
          placeholder="1"
          className="w-[80px]"
          inputClassName="!py-0 text-base"
        />
      </FieldRow>

      <FieldRow label="Minimum gap time">
        <TimeInput
          value={minGapTime}
          onChange={handleMinGapTimeChange}
          placeholder="00:00:00"
          className="ml-[-10px]"
        />
      </FieldRow>
    </>
  );
};
