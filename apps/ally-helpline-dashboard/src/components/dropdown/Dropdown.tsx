import { FC } from "react";

import { Autocomplete, TextField } from "@mui/material";

import { DropdownProps } from "./types";

const Dropdown: FC<DropdownProps> = ({
  value,
  options,
  onChange,
  minWidth = 200,
  sx,
  placeholder,
  disableClearable = false,
  readOnly = false,
}) => {
  const selectedOption = options.find(o => String(o.value) === value) ?? null;

  return (
    <Autocomplete
      disablePortal
      disableClearable={disableClearable}
      options={options}
      value={selectedOption}
      onChange={(_, opt) => onChange(opt ? String(opt.value) : "")}
      isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
      getOptionLabel={o => o.label}
      filterOptions={readOnly ? opts => opts : undefined}
      renderOption={(props, option) => {
        const { key, ...restProps } = props;
        return (
          <li key={key} {...restProps}>
            {option.label}
          </li>
        );
      }}
      ListboxProps={{ sx: { maxHeight: 240, overflowY: "auto" } }}
      slotProps={{ popper: { placement: "bottom-start" } }}
      renderInput={params => (
        <TextField
          {...params}
          size="small"
          placeholder={placeholder}
          inputProps={{ ...params.inputProps, readOnly }}
        />
      )}
      sx={{
        minWidth,
        ".MuiOutlinedInput-root": {
          height: "36px",
          borderRadius: "4px",
        },
        ".MuiOutlinedInput-notchedOutline": {
          borderColor: "#E5E7EB",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "#E5E7EB",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "#E5E7EB",
        },
        ".MuiAutocomplete-option": {
          fontSize: "14px",
          color: "#47464F",
        },
        ...sx,
      }}
    />
  );
};

export default Dropdown;
