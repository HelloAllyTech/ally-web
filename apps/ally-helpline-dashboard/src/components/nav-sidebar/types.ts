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
  /**
   * Absolute URL for a tab that leaves the app. When set, the tab renders as an
   * anchor opening in a new tab instead of a div that routes in-app.
   */
  href?: string;
}
