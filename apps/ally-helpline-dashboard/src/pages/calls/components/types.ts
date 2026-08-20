import { Dispatch, ReactNode, SetStateAction } from "react";

import { Dayjs } from "dayjs";

import {
  CallLog,
  ChatSummaryStatus,
  SessionType,
  SimulationSummary,
  TranscriptFocusRequest,
} from "@types";

import { SessionUserGroup } from "../constants";

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
  startSeconds?: number;
}

export interface LogsTableProps {
  refreshKey?: number;
  sessionType: SessionType;
  className?: string;
}

export interface ArchivesLogsTableProps {
  sessionType: SessionType;
  className?: string;
  refreshKey?: number;
  sessionUserGroup: SessionUserGroup;
}

export interface SummaryHeaderProps {
  summaryName: string;
  setSummaryName: (summaryName: string) => void;
  chatId: number;
  canEditSummary?: boolean;
  counsellorId: number;
}

export interface CallSummaryProps {
  selectedTab: number;
}

export interface CallTranscriptTabProps {
  callSummary: CallLog;
}

export interface SummarySidebarWrapperProps {
  isShortSession?: boolean;
  summaryData?: SimulationSummary;
  onSidebarClose?: () => void;
  extraHeaderList?: {
    alt: string;
    icon: ReactNode;
    onClick: () => void;
    show?: boolean;
    text?: string;
  }[];
  tabList: {
    id: number;
    label: string;
    content: ReactNode;
  }[];
  title: ReactNode;
  children?: ReactNode;
  onTabChange?: (nextTabId: number) => void;
}

export interface SimulationSummarySidebarProps {
  summaryId: string;
  closeSummarySidebar: () => void;
  canShowFeedback?: boolean;
  councellorName?: string;
}

export interface CallSummarySidebarProps {
  callSummary: CallLog;
  refetchCallLogs: (status?: ChatSummaryStatus) => void;
  sessionType: SessionType;
  setCallSummary: Dispatch<SetStateAction<CallLog>>;
  canEditSummary?: boolean;
  canShowFeedback?: boolean;
  showArchiveButton?: boolean;
  /**
   * Called after custom-field values are saved, so the parent table can patch
   * the edited row's denormalized values locally without waiting for a refetch.
   */
  onCustomFieldValuesSaved?: (
    chatId: number,
    values: { fieldDefinitionId: string; value?: string | null }[],
  ) => void;
}

export interface TranscriptTabProps {
  transcriptList: {
    speaker: string;
    content: string;
    startSeconds?: number;
  }[];
  handleLoadMore: () => void;
  isLoading: boolean;
  hasMore?: boolean;
  mode?: string;
}

export interface SimulationTranscriptTabProps {
  sessionId: string;
  className?: string;
  councellorName?: string;
  agentName?: string;
  /** Language the session was actually conducted in, resolved from the session's
   * `metadata.languageId`. Falls back to "en" when unresolved (e.g. legacy sessions). */
  originalLanguageCode?: string;
  /**
   * A moment to scroll to and highlight once the transcript has loaded —
   * raised by the "See this moment" chips in Ally's debrief note. If the id
   * isn't in the transcript, the tab says so rather than sitting at the top
   * pretending the jump worked.
   */
  focusMessage?: TranscriptFocusRequest | null;
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
