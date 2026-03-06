import { FC, useEffect, useState } from "react";

import { Tabs, Tab } from "@mui/material";

import { Drawer } from "@components";
import { ShortSessionUI } from "@containers";

import { tabStyles } from "../constants";
import { SummarySidebarWrapperProps } from "./types";

const SummarySidebarWrapper: FC<SummarySidebarWrapperProps> = ({
  onSidebarClose = () => {},
  extraHeaderList = [],
  tabList,
  title,
  isShortSession = false,
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
      drawerClassName="h-screen"
      bodyClassName="h-[calc(100%-64px)]"
      title={title}
      headerButtons={extraHeaderList?.length > 0 ? extraHeaderList : []}
    >
      {isShortSession ? (
        <ShortSessionUI className="mx-3" />
      ) : (
        <>
          <div className="w-[50vw] h-full flex flex-col">
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
        </>
      )}
    </Drawer>
  );
};

export default SummarySidebarWrapper;
