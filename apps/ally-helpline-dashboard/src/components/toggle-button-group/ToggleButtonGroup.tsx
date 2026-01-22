import React, { FC } from "react";

import { ToggleButton, ToggleButtonGroup as MuiToggleButtonGroup } from "@mui/material";

import { cn } from "@utils";

import { ToggleButtonGroupProps } from "./types";

const ToggleButtonGroup: FC<ToggleButtonGroupProps> = ({
  disabled,
  value,
  onValueChange,
  items,
  className,
  successValue,
  equalWidth,
  inheritFontSize = false,
}) => {
  const handleChange = (_: React.MouseEvent<HTMLElement>, newValue: string) => {
    if (newValue !== null) {
      onValueChange(newValue);
    }
  };

  return (
    <MuiToggleButtonGroup
      value={value}
      exclusive
      disabled={disabled}
      onChange={handleChange}
      className={cn("h-9 !rounded-[4px] bg-neutral-100 border-[0.5px] border-border", className)}
      sx={{
        "& .MuiToggleButton-root": {
          border: "none",
          borderRadius: "4px",
          padding: "16px 24px",
          textTransform: "none",
          fontSize: inheritFontSize ? "inherit" : "14px",
          fontWeight: 500,
          "&.Mui-selected": {
            backgroundColor: value === successValue ? "#33BA60" : "#FFFFFF",
            color: "#4D4D4D",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
            border: "0.5px solid #D2D2D2",
            "&:hover": {
              backgroundColor: value === successValue ? "#33BA60" : "#FFFFFF",
            },
          },
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      }}
    >
      {items.map(({ value, label }) => (
        <ToggleButton
          key={value}
          value={value}
          disabled={disabled}
          sx={{
            "&.Mui-disabled": {
              border: "none",
            },
            ...(equalWidth && {
              flex: 1,
              minWidth: 0,
            }),
          }}
        >
          {label}
        </ToggleButton>
      ))}
    </MuiToggleButtonGroup>
  );
};

export default ToggleButtonGroup;
