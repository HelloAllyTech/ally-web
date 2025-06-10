import { FC } from "react";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";

import { DropdownProps } from "./types";

const Dropdown: FC<DropdownProps> = ({ value, options, onChange, minWidth = 200, sx }) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth }}>
      <Select
        value={value}
        onChange={handleChange}
        sx={{
          borderRadius: "4px",
          color: "#14171D",
          ".MuiOutlinedInput-notchedOutline": {
            borderColor: "#E5E7EB",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E5E7EB",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E5E7EB",
          },
          ".MuiSelect-select": {
            color: "#47464F",
            fontSize: "14px",
            fontWeight: "500",
          },
          ...sx
        }}
      >
        {options.map((option) => (
          <MenuItem 
            key={option} 
            value={option}
            sx={{
              fontSize: "14px",
              color: "#47464F",
              "&.Mui-selected": {
                backgroundColor: "#F3E8FF",
                color: "#6941C6",
                "&:hover": {
                  backgroundColor: "#F3E8FF",
                }
              },
              "&:hover": {
                backgroundColor: "#F9FAFB",
              }
            }}
          >
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default Dropdown; 