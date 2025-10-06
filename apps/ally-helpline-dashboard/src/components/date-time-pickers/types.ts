import { Dayjs } from "dayjs";

export interface DatePickerProps {
  value: Dayjs | null;
  onChange: (date: Dayjs | null) => void;
  disableFuture?: boolean;
}

export interface TimePickerProps {
  value: Dayjs | null;
  onChange: (time: Dayjs | null) => void;
}
