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
}

const TabGroup: FC<TabGroupProps> = ({ value, onChange, tabs, className, children }) => {
  return (
    <>
      <Tabs
        value={value}
        onChange={onChange}
        className={`${className} w-full border-b border-[#E5E7EB]`}
        variant="fullWidth"
        sx={{
          "& .MuiButtonBase-root": {
            fontFamily: "IBM_Plex_Serif",
          },
        }}
      >
        {tabs.map(tab => (
          <Tab
            key={tab.value}
            label={tab.label}
            value={tab.value}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              color: "#49454F",
            }}
          />
        ))}
      </Tabs>
      {children}
    </>
  );
};

export default TabGroup;
