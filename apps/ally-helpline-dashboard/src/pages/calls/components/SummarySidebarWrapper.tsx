import { FC, useEffect, useState } from "react";

import { Tabs, Tab } from "@mui/material";

import { DataPolicy } from "@assets";
import { Drawer } from "@components";
import { ALLY_DATA_POLICY_URL } from "@constants";
import { openLinkInNewTab } from "@utils";

import { tabStyles } from "../constants";
import { SummarySidebarWrapperProps } from "./types";

const SummarySidebarWrapper: FC<SummarySidebarWrapperProps> = ({
  onSidebarClose = () => {},
  extraHeaderList = [],
  tabList,
  title,
  children,
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0].id);

  useEffect(() => {
    if (tabList?.length) {
      setSelectedTab(tabList[0].id);
    }
  }, [tabList]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const getTabContent = () => tabList.find(tab => tab.id === selectedTab)?.content;

  return (
    <Drawer
      open={true}
      onClose={onSidebarClose}
      className="font-primary"
      title={title}
      headerButtons={[
        {
          alt: "Data policy",
          icon: <DataPolicy />,
          onClick: () => openLinkInNewTab(ALLY_DATA_POLICY_URL),
          show: true,
          text: "Data policy",
        },
        ...extraHeaderList,
      ]}
    >
      <div className="w-[55vw] h-full flex flex-col">
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          className="w-full normal-case border-b border-[#DBDBDB] mb-4"
          sx={{
            "& .MuiButtonBase-root": {
              fontFamily: "IBM_Plex_Serif",
            },
          }}
        >
          {tabList?.map(tab => (
            <Tab key={tab.id} label={tab.label} value={tab.id} sx={tabStyles} />
          ))}
        </Tabs>
        {getTabContent()}
      </div>
      {children}
    </Drawer>
  );
};

export default SummarySidebarWrapper;
