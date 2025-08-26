import { ErrorIcon } from "@assets";
import { ChatSummaryStatus } from "@types";

import { StatusConfig } from "./types";

export const getStatusConfig = (status: ChatSummaryStatus): StatusConfig => {
  switch (status) {
    case ChatSummaryStatus.PENDING:
    case ChatSummaryStatus.IN_PROGRESS:
      return {
        label: "Processing",
        outerDivClassName: "bg-[#F8E6BA]", // Light yellow
        dotClassName: "bg-[#FFAD0D]", // Yellow
      };
    case ChatSummaryStatus.SUCCESS:
      return {
        label: "Generated",
        dotClassName: "bg-[#47B881]", // Green
        outerDivClassName: "bg-[#DCEBDD]", // Light green
      };
    case ChatSummaryStatus.FAILED:
      return {
        label: "Error",
        dotClassName: "bg-[#E5675A]", // Red
        outerDivClassName: "bg-[#FBDED9]", // Light red
      };
    case ChatSummaryStatus.NO_AUDIO:
      return {
        label: "No audio detected",
        icon: ErrorIcon,
      };
    default:
      return {
        label: "Unknown",
        dotClassName: "bg-[#6B7280]", // Gray
        outerDivClassName: "bg-[#F3F4F6]", // Light gray
      };
  }
};
