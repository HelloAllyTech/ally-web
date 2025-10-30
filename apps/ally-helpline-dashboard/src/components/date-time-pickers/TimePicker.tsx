import { FC } from "react";

import { TimePicker as MuiTimePicker } from "@mui/x-date-pickers/TimePicker";

import { TimePickerProps } from "./types";

const TimePicker: FC<TimePickerProps> = ({ value, onChange, maxTime, minTime, disabled }) => {
  return (
    <MuiTimePicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      maxTime={maxTime}
      minTime={minTime}
      slotProps={{
        textField: {
          sx: {
            "& .MuiPickersInputBase-root, & .MuiInputBase-root": {
              borderRadius: "4px",
              padding: "8px",
              backgroundColor: "#fff",
              height: "36px",

              "& .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #D2D2D2",
              },
              "&:hover .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #D2D2D2",
              },
              "&.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
                border: "0.5px solid #0957D0",
              },
            },
          },
        },
      }}
    />
  );
};

export default TimePicker;
