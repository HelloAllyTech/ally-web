import { Dispatch, ReactNode, SetStateAction } from "react";

import { Dayjs } from "dayjs";

import { CallLog, ChatSummaryStatus, SessionType } from "@types";

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

export interface DeleteCallLogDialogDataProps {
  chatId?: number;
  closeDialog: (isDeletionDone?: boolean) => void;
}

export interface Transcript {
  content: string;
  speaker: string;
}

export interface LogsTableProps {
  refreshKey?: number;
  sessionType: SessionType;
  className?: string;
}

export interface SummaryHeaderProps {
  summaryName: string;
  setSummaryName: (summaryName: string) => void;
  chatId: number;
}

export interface CallSummaryProps {
  selectedTab: number;
}

export interface CallTranscriptTabProps {
  callSummary: CallLog;
}

export interface SummarySidebarWrapperProps {
  onSidebarClose?: () => void;
  extraHeaderList?: {
    alt: string;
    icon: ReactNode;
    onClick: () => void;
    show: boolean;
    text: string;
  }[];
  tabList: {
    id: number;
    label: string;
    content: ReactNode;
  }[];
  title: ReactNode;
  children?: ReactNode;
}

export interface SimulationSummarySidebarProps {
  summaryId: string;
  summaryName: string;
  closeSummarySidebar: () => void;
}

export interface CallSummarySidebarProps {
  callSummary: CallLog;
  refetchCallLogs: (status?: ChatSummaryStatus) => void;
  sessionType: SessionType;
  setCallSummary: Dispatch<SetStateAction<CallLog>>;
}

export interface TranscriptTabProps {
  transcriptList: { speaker: string; content: string }[];
  handleLoadMore: () => void;
  isLoading: boolean;
}

export interface SimulationTranscriptTabProps {
  sessionId: string;
}

export interface AudioUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface AudioUploadInterfaceProps {
  duration: number;
  files: File[];
  setDuration: (duration: number) => void;
  onDropSuccess: (files: File[]) => void;
  onDeleteClick: () => void;
}

export interface AudioUploadFormData {
  counsellorId: string;
  date: Dayjs | null;
  time: Dayjs | null;
  timeZone: string;
}
