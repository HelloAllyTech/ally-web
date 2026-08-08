import { FC, ReactNode, SVGProps } from "react";

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
   * Arbitrary node rendered at the end of the tab row (expanded) or as a
   * superscript on the icon (collapsed).
   *
   * Separate from `badgeCount` on purpose: that is typed `number` and gated on
   * `> 0`, which is right for unread counts but wrong for a state marker — a
   * zero-day streak would silently vanish rather than being a deliberate choice.
   */
  trailing?: ReactNode;
  /**
   * Absolute URL for a tab that leaves the app. When set, the tab renders as an
   * anchor opening in a new tab instead of a div that routes in-app.
   */
  href?: string;
}
