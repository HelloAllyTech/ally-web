import { Dayjs } from "dayjs";

export interface DatePickerProps {
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  disableFuture?: boolean;
  maxDate?: Dayjs;
}

export interface TimePickerProps {
  value: Dayjs | null;
  onChange: (time: Dayjs | null) => void;
  maxTime?: Dayjs | null;
  disabled?: boolean;
}
