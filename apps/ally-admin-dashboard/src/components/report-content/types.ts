import { ReportData } from "@types";

interface ReportContentProps {
  reportData: ReportData;
  activeTab: "report" | "transcription";
  onTabChange: (tab: "report" | "transcription") => void;
  showTabs?: boolean;
}

export default ReportContentProps;
