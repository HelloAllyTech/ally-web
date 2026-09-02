import { FC, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  // `?? -1` is load-bearing, not defensive noise: a roleplay can legitimately
  // have every post-session tab switched off, which is the wholesale opt-out
  // its author configured. `tabList?.[0].id` threw on that empty list.
  const [selectedTab, setSelectedTab] = useState<number>(tabList?.[0]?.id ?? -1);

  // Debrief is the default landing tab while the real scenario metadata is
  // still loading, but a roleplay can switch it off — in which case fall
  // through to whichever tab is actually first once tabList resolves.
  useEffect(() => {
    if (!tabList?.length) return;
    if (!tabList.some(tab => tab.id === selectedTab)) {
      setSelectedTab(tabList[0].id);
    }
  }, [tabList, selectedTab]);

  useEffect(() => {
    onTabChange?.(selectedTab);
  }, [selectedTab]);

  const getTabContent = () => tabList.find(tab => tab.id === selectedTab)?.content;

  return (
    <Drawer
      open={true}
      onClose={onSidebarClose}
      className="font-primary"
      drawerClassName="h-dvh"
      bodyClassName="h-[calc(100%-64px)]"
      title={title}
      headerButtons={extraHeaderList?.length > 0 ? extraHeaderList : []}
    >
      {isShortSession ? (
        <ShortSessionUI summaryData={summaryData} className="!min-w-[50vw]" />
      ) : (
        <>
          <div className="flex h-full min-h-0 w-[50vw] flex-col">
            {/* One tab is not a choice — the strip would only repeat the
                heading the tab's own content already renders. */}
            {(tabList?.length ?? 0) > 1 && (
              <div className="mb-4 w-full shrink-0 border-b border-[#DBDBDB]">
                <Tabs
                  items={tabList?.map(tab => ({ id: String(tab.id), label: tab.label })) ?? []}
                  activeId={String(selectedTab)}
                  onChange={newId => setSelectedTab(Number(newId))}
                  className="border-none w-full normal-case text-base font-primary"
                  showCount={false}
                />
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {tabList?.length ? (
                getTabContent()
              ) : (
                // Nothing configured to show. Say so rather than leaving a
                // blank panel that reads as a failure to load.
                <p className="p-4 font-primary text-base text-typography-700">
                  {t("postSim.feedback.noData")}
                </p>
              )}
            </div>
          </div>
          {children}
        </>
      )}
    </Drawer>
  );
};

export default SummarySidebarWrapper;
