import { TabId } from "@constants";

export interface NavSideBarProps {
  activeTab: TabId;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}
