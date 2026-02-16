import { ReportData } from "@types";

interface ReportContentProps {
  reportData: ReportData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
}

export default ReportContentProps;
