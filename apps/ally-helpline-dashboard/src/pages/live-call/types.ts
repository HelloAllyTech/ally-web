interface FormattedMessage {
  content: string;
  isOutgoing: boolean;
  timestamp: string;
  id: number;
  senderId: number;
  createdAt: string;
}

interface SummaryInfo {
  summary: string;
}

interface CopilotMessage {
  content: string;
  isUser: boolean;
  timestamp: string;
}

interface LiveCallProps {
  handleLogout: () => void;
}

export type { FormattedMessage, SummaryInfo, CopilotMessage, LiveCallProps };
