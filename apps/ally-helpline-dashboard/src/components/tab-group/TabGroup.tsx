import { FC, ReactNode } from "react";

import { Tabs, Tab } from "@mui/material";

export interface TabItem {
  label: string;
  value: string;
}

export interface TabGroupProps {
  value: string;
  onChange: (event: React.SyntheticEvent, newValue: any) => void;
  tabs: TabItem[];
  className?: string;
  children?: ReactNode;
  /** When false, tabs only take the width of their content instead of stretching. Default true. */
  fullWidth?: boolean;
}

const TabGroup: FC<TabGroupProps> = ({
  value,
  onChange,
  tabs,
  className,
  children,
  fullWidth = true,
}) => {
  return (
    <>
      <Tabs
        value={value}
        onChange={onChange}
        className={`${className} ${fullWidth ? "w-full" : "w-fit"} border-b border-[#E5E7EB]`}
        variant={fullWidth ? "fullWidth" : "standard"}
        sx={{
          "& .MuiButtonBase-root": {
            fontFamily: "IBM_Plex_Serif, serif",
          },
        }}
      >
        {tabs.map(tab => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            disableRipple
            sx={{
              textTransform: "none",
              fontWeight: 500,
              color: "#49454F",
              "&:focus": {
                outline: "none",
              },
              "&:focus-visible": {
                outline: "none",
              },
            }}
          />
        ))}
      </Tabs>
      {children}
    </>
  );
};

export default TabGroup;
