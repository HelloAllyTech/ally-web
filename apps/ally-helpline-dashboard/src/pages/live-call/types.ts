interface FormattedMessage {
  content: string;
  isOutgoing: boolean;
  timestamp: string;
  message_id: number;
  sender_id: number;
  created_at: string;
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
