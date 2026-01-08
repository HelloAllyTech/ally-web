import React, { useCallback } from "react";

import { NumberInput, TimeInput } from "@components";

interface TimeWindowValues {
  startTime?: string | null | undefined;
  endTime?: string | null | undefined;
}

interface OccurrenceControlValues {
  maxOccurrences?: number;
  minGapTime?: string | null | undefined;
}

interface ScoreWindowValues {
  minScore?: number | null;
  maxScore?: number | null;
}

interface TimeWindowCallbacks {
  onStartTimeChange?: (value: string) => void;
  onEndTimeChange?: (value: string | null) => void;
}

interface OccurrenceControlCallbacks {
  onMaxOccurrencesChange?: (value: number) => void;
  onMinGapTimeChange?: (value: string) => void;
}

interface ScoreWindowCallbacks {
  onMinScoreChange?: (value: number | null) => void;
  onMaxScoreChange?: (value: number | null) => void;
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
}

const InfinityButton: React.FC<{ onClick: () => void; magnitude?: string }> = ({
  onClick,
  magnitude = null,
}) => (
  <span className="text-base cursor-pointer hover:text-typography-600" onClick={onClick}>
    {magnitude}∞
  </span>
);

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
  startTime = "00:00:00",
  endTime = null,
  onStartTimeChange,
  onEndTimeChange,
}) => {
  const handleStartTimeChange = (value: string) => {
    onStartTimeChange?.(value);
  };

  const handleEndTimeChange = (value: string) => {
    if (value === "" || value === "∞") {
      onEndTimeChange?.(null);
    } else {
      onEndTimeChange?.(value);
    }
  };

  return (
    <>
      <SectionHeader title="Time Window" />

      <FieldRow label="Applicable from">
        <TimeInput
          value={startTime || "00:00:00"}
          onChange={handleStartTimeChange}
          placeholder="00:00:00"
          className="ml-[-10px]"
        />
      </FieldRow>

      <FieldRow label="Applicable till">
        {endTime === null || endTime === "00:00:00" ? (
          <InfinityButton
            onClick={() => onEndTimeChange?.(endTime === null ? "00:01:00" : endTime)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <TimeInput
              value={endTime}
              onChange={handleEndTimeChange}
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

export const ScoreWindowSection: React.FC<ScoreWindowValues & ScoreWindowCallbacks> = ({
  minScore = null,
  maxScore = null,
  onMinScoreChange,
  onMaxScoreChange,
}) => {
  const handleMinScoreChange = useCallback(
    (value: number) => onMinScoreChange?.(value),
    [onMinScoreChange],
  );

  const handleMaxScoreChange = useCallback(
    (value: number) => onMaxScoreChange?.(value),
    [onMaxScoreChange],
  );

  const handleMinInfinityToggle = useCallback(() => {
    if (minScore === null) onMinScoreChange?.(0);
    else onMinScoreChange?.(null);
  }, [minScore, onMinScoreChange]);

  const handleMaxInfinityToggle = useCallback(() => {
    if (maxScore === null) onMaxScoreChange?.(0);
    else onMaxScoreChange?.(null);
  }, [maxScore, onMaxScoreChange]);

  return (
    <>
      <SectionHeader title="Score Window" />
      <FieldRow label="Minimum score">
        {minScore === null ? (
          <InfinityButton onClick={handleMinInfinityToggle} magnitude="-" />
        ) : (
          <div className="flex items-center gap-2">
            <NumberInput
              value={minScore}
              onChange={handleMinScoreChange}
              placeholder="0"
              className="w-[80px]"
              inputClassName="!py-0 text-base"
            />
          </div>
        )}
      </FieldRow>

      <FieldRow label="Maximum score">
        {maxScore === null ? (
          <InfinityButton onClick={handleMaxInfinityToggle} magnitude="+" />
        ) : (
          <div className="flex items-center gap-2">
            <NumberInput
              value={maxScore}
              onChange={handleMaxScoreChange}
              placeholder="100"
              className="w-[80px]"
              inputClassName="!py-0 text-base"
            />
          </div>
        )}
      </FieldRow>
    </>
  );
};
