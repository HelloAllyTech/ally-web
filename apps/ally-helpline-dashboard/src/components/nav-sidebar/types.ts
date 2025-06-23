import { TabId } from "@/constants/tabs";

export interface NavSideBarProps {
    activeTab: TabId;
    onTabChange: (tab: string) => void;
    isOpen: boolean;
    onClose: () => void;
  }