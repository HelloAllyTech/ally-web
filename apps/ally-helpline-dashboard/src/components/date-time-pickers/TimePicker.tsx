import { ChangeEvent, FC } from "react";

import dayjs from "dayjs";

import { TimePicker as CarbonTimePicker } from "@ally-ui-mono/ui-shared";

import { TimePickerProps } from "./types";

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const TimePicker: FC<TimePickerProps> = ({ value, onChange, maxTime, minTime, disabled }) => {
  const formatted = value ? value.format("HH:mm") : "";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value.trim();

    if (!text) {
      onChange(null);
      return;
    }

    const match = TIME_PATTERN.exec(text);
    if (!match) {
      return;
    }

    let next = (value ?? dayjs())
      .hour(Number(match[1]))
      .minute(Number(match[2]))
      .second(0)
      .millisecond(0);

    if (maxTime && next.isAfter(maxTime)) {
      next = maxTime;
    }
    if (minTime && next.isBefore(minTime)) {
      next = minTime;
    }

    onChange(next);
  };

  return (
    <CarbonTimePicker
      id="time-picker-input"
      labelText=""
      hideLabel
      value={formatted}
      onChange={handleChange}
      disabled={disabled}
      placeholder="hh:mm"
      maxLength={5}
      size="md"
    />
  );
};

export default TimePicker;
