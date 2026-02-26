import { ReportData, TranscriptMessage } from "@types";

interface ReportContentProps {
  reportData: ReportData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  showTabs?: boolean;
  isTranscriptLoading?: boolean;
  transcriptData?: TranscriptMessage[];
}

export default ReportContentProps;
