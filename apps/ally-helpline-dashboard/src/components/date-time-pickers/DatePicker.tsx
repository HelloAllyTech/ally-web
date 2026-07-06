import { FC } from "react";

import dayjs from "dayjs";

import { DatePicker as CarbonDatePicker, DatePickerInput } from "@ally-ui-mono/ui-shared";

import { DatePickerProps } from "./types";

const DatePicker: FC<DatePickerProps> = ({ value, onChange, disableFuture, maxDate }) => {
  const resolvedMax = maxDate ?? (disableFuture ? dayjs() : undefined);

  return (
    <CarbonDatePicker
      datePickerType="single"
      dateFormat="d/m/Y"
      value={value ? value.toDate() : undefined}
      maxDate={resolvedMax ? resolvedMax.toDate() : undefined}
      onChange={(dates: Date[]) => onChange(dates?.[0] ? dayjs(dates[0]) : null)}
    >
      <DatePickerInput id="date-picker-input" placeholder="dd/mm/yyyy" size="md" labelText="" />
    </CarbonDatePicker>
  );
};

export default DatePicker;
