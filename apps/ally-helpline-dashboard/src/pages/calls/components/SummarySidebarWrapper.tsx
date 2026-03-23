import { FC, useEffect, useState } from "react";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { Drawer } from "@components";
import { ShortSessionUI } from "@containers";

import { SummarySidebarWrapperProps } from "./types";

const SummarySidebarWrapper: FC<SummarySidebarWrapperProps> = ({
  onSidebarClose = () => {},
  extraHeaderList = [],
  tabList,
  title,
  isShortSession = false,
  summaryData,
  children,
  onTabChange,
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0].id);

  useEffect(() => {
    if (tabList?.length) {
      setSelectedTab(tabList[0].id);
    }
  }, []);

  useEffect(() => {
    onTabChange?.(selectedTab);
  }, [selectedTab]);

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
        <ShortSessionUI summaryData={summaryData} className="!min-w-[50vw]" />
      ) : (
        <>
          <div className="w-[50vw] h-full flex flex-col">
            <div className="w-full border-b border-[#DBDBDB] mb-4">
              <Tabs
                items={tabList?.map(tab => ({ id: String(tab.id), label: tab.label })) ?? []}
                activeId={String(selectedTab)}
                onChange={newId => setSelectedTab(Number(newId))}
                className="border-none w-full normal-case text-base font-primary"
                showCount={false}
              />
            </div>
            {getTabContent()}
          </div>
          {children}
        </>
      )}
    </Drawer>
  );
};

export default SummarySidebarWrapper;
