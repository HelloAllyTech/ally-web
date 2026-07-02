import { FC, SVGProps } from "react";

import { TabId } from "@constants";

export interface NavSideBarProps {
  activeTab: TabId;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface TabProps {
  id: TabId;
  Icon: FC<SVGProps<SVGSVGElement>>;
  title: string;
  tKey?: string;
  tagKey?: string;
  activeTab: TabId;
  onClick: () => void;
  isExpanded: boolean;
  badgeCount?: number;
}
