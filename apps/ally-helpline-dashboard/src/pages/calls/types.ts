import { Dispatch, SetStateAction } from "react";

import { CallLog } from "@types";

export interface TagDisplay {
  label: string;
  colors: {
    bg: string;
    text: string;
  };
}

export interface SummarySideBarProps {
  callSummary: CallLog;
  refetchCallLogs: () => void;
  setCallSummary: Dispatch<SetStateAction<CallLog>>;
}

export interface DeleteDialogData {
  open: boolean;
  chatId: number | null;
}

export interface Transcript {
  content?: string | number;
  senderId?: string | number;
}
