import React, { useCallback } from "react";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import { NumberInput, TimeInput } from "@components";
import { DETECTION_CONFIG_FIELDS, EVENT_DETECTION_TYPES } from "@constants";
import { isInfinityValue, toggleInfinityValue, getInfinityDisplay } from "@utils";

interface TimeWindowValues {
  startTime?: string | null | undefined;
  endTime?: string | null | undefined;
}

interface OccurrenceControlValues {
  eventType?: string;
  maxOccurrences?: number;
  minGapTime?: string | null | undefined;
  occurrenceInterval?: number;
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
  onOccurrenceIntervalChange?: (value: number) => void;
}

interface ScoreWindowCallbacks {
  onMinScoreChange?: (value: number | null) => void;
  onMaxScoreChange?: (value: number | null) => void;
}

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  tooltip?: boolean;
  tooltipTitle?: string;
}

const InfinityButton: React.FC<{ onClick: () => void; displayText: string }> = ({
  onClick,
  displayText,
}) => (
  <span className="text-base cursor-pointer hover:text-typography-600" onClick={onClick}>
    {displayText}
  </span>
);

const FieldRow: React.FC<FieldRowProps> = ({ label, children, tooltip, tooltipTitle }) => (
  <div className="flex flex-row min-h-[40px] items-center text-base justify-between">
    <div className="w-[40%] flex items-center gap-2">
      <span className="text-base font-regular text-typography-800">{label}</span>
      {tooltip && (
        <Tooltip label={tooltipTitle || label} align="top">
          <button type="button" className="cursor-pointer inline-flex items-center">
            <TooltipIcon />
          </button>
        </Tooltip>
      )}
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
    if (value === "" || value === getInfinityDisplay(DETECTION_CONFIG_FIELDS.END_TIME)) {
      onEndTimeChange?.(null);
    } else {
      onEndTimeChange?.(value);
    }
  };

  const handleEndTimeInfinityToggle = useCallback(() => {
    const newValue = toggleInfinityValue(endTime, DETECTION_CONFIG_FIELDS.END_TIME);
    onEndTimeChange?.(newValue);
  }, [endTime, onEndTimeChange]);

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
        {isInfinityValue(endTime) ? (
          <InfinityButton
            onClick={handleEndTimeInfinityToggle}
            displayText={getInfinityDisplay(DETECTION_CONFIG_FIELDS.END_TIME)}
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
  eventType,
  maxOccurrences = "∞",
  minGapTime = "00:00:00",
  occurrenceInterval = 0,
  onMaxOccurrencesChange,
  onMinGapTimeChange,
  onOccurrenceIntervalChange,
}) => {
  const handleMaxOccurrencesChange = (value: number) => {
    onMaxOccurrencesChange?.(value);
  };

  const handleMinGapTimeChange = (value: string) => {
    onMinGapTimeChange?.(value);
  };

  const handleOccurrenceIntervalChange = (value: number) => {
    onOccurrenceIntervalChange?.(value);
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
      {eventType === EVENT_DETECTION_TYPES.BINARY_CLASSIFIER && (
        <FieldRow
          label="Occurrence Interval"
          tooltip
          tooltipTitle="Triggers when this event occurs {N} times. Then triggers again at {2N}, {3N}, …"
        >
          <NumberInput
            value={occurrenceInterval}
            onChange={handleOccurrenceIntervalChange}
            placeholder="0"
            min={1}
            className="w-[80px]"
            inputClassName="!py-0 text-base"
          />
        </FieldRow>
      )}
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
    const newValue = toggleInfinityValue(minScore, DETECTION_CONFIG_FIELDS.MIN_SCORE);
    onMinScoreChange?.(newValue);
  }, [minScore, onMinScoreChange]);

  const handleMaxInfinityToggle = useCallback(() => {
    const newValue = toggleInfinityValue(maxScore, DETECTION_CONFIG_FIELDS.MAX_SCORE);
    onMaxScoreChange?.(newValue);
  }, [maxScore, onMaxScoreChange]);

  return (
    <>
      <SectionHeader title="Score Window" />
      <FieldRow label="Minimum score">
        {isInfinityValue(minScore) ? (
          <InfinityButton
            onClick={handleMinInfinityToggle}
            displayText={getInfinityDisplay(DETECTION_CONFIG_FIELDS.MIN_SCORE)}
          />
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
        {isInfinityValue(maxScore) ? (
          <InfinityButton
            onClick={handleMaxInfinityToggle}
            displayText={getInfinityDisplay(DETECTION_CONFIG_FIELDS.MAX_SCORE)}
          />
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
