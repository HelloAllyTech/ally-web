import React, { FC } from "react";
import { ToggleButton, ToggleButtonGroup as MuiToggleButtonGroup } from "@mui/material";
import { cn } from "@/utils/tailwind";

type ToggleButtonGroupProps = {
  disabled?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  items: {
    value: string;
    label: string;
  }[];
  className?: string;
  successValue?: string;
};

export const ToggleButtonGroup: FC<ToggleButtonGroupProps> = ({
  disabled,
  value,
  onValueChange,
  items,
  className,
  successValue,
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
      className={cn("h-9 !rounded-[32px] bg-[#FFFFFF] border border-[#E5E7EB] p-[4px]", className)}
      sx={{
        "& .MuiToggleButton-root": {
          border: "none",
          borderRadius: "32px",
          padding: "6px 16px",
          textTransform: "none",
          fontSize: "14px",
          fontWeight: 500,
          "&.Mui-selected": {
            backgroundColor: value === successValue ? "#33BA60" : "#49454F",
            color: "#FFFFFF",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
            "&:hover": {
              backgroundColor: value === successValue ? "#33BA60" : "#49454F",
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
          }}
        >
          {label}
        </ToggleButton>
      ))}
    </MuiToggleButtonGroup>
  );
};
