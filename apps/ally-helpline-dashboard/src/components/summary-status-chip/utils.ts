import { ChatSummaryStatus } from "@types";

import { StatusConfig } from "./types";

export const getStatusConfig = (status: ChatSummaryStatus): StatusConfig => {
  switch (status) {
    case ChatSummaryStatus.PENDING:
    case ChatSummaryStatus.IN_PROGRESS:
      return {
        label: "Processing",
        dotColor: "#FFAD0D", // Yellow
        backgroundColor: "#F8E6BA", // Light yellow
      };
    case ChatSummaryStatus.SUCCESS:
      return {
        label: "Generated",
        dotColor: "#47B881", // Green
        backgroundColor: "#DCEBDD", // Light green
      };
    case ChatSummaryStatus.FAILED:
      return {
        label: "Error",
        dotColor: "#E5675A", // Red
        backgroundColor: "#FBDED9", // Light red
      };
    default:
      return {
        label: "Unknown",
        dotColor: "#6B7280", // Gray
        backgroundColor: "#F3F4F6", // Light gray
      };
  }
};
