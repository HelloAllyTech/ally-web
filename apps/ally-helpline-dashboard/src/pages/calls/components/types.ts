import { Dispatch, SetStateAction } from "react";

import { CallLog, ChatSummaryStatus } from "@types";

export interface StartSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SummarySideBarProps {
  callSummary: CallLog;
  refetchCallLogs: (status?: ChatSummaryStatus) => void;
  sessionType: SessionType;
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

export enum SessionType {
  CALL = "call",
  SIMULATION = "simulation",
}

export interface LogsTableProps {
  refreshKey?: number;
  sessionType: SessionType;
}

export interface SummaryHeaderProps {
  summaryName: string;
  setSummaryName: (summaryName: string) => void;
  chatId: number;
}
