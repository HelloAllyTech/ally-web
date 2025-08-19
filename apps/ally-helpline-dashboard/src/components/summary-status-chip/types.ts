import { ChatSummaryStatus } from "@types";

export interface SummaryStatusProps {
  status: ChatSummaryStatus;
  className?: string;
}

export interface StatusConfig {
  label: string;
  dotColor: string;
  backgroundColor: string;
}
