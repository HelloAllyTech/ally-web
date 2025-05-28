import { Dispatch, SetStateAction } from "react";

import { CallLog } from "@/types/calls";

export interface TagDisplay {
  label: string;
  colors: {
    bg: string;
    text: string;
  };
}

export interface SummarySideBarProps {
  callSummary: CallLog;
  setCallSummary: Dispatch<SetStateAction<CallLog>>;
}
