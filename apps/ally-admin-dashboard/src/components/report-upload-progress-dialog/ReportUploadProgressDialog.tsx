import { FC, useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronUp, XCircle, CheckCircle2 } from "lucide-react";

import { Close, CloseRed } from "@assets";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { getKeyFromIndex } from "@utils";

import { AudioUpload, ProgressCircleProps, UploadProgressHeaderProps, UploadStatus } from "./types";
import { getUploadHeader } from "./utils";

const UploadProgressDialogHeader: FC<UploadProgressHeaderProps> = ({
  uploads,
  expanded,
  onClose,
  onToggle,
}) => (
  <div className="flex items-center justify-between mx-4 py-2 border-b border-[#EFEFEF]">
    <span className="text-sm font-medium text-typography-900">{getUploadHeader(uploads)}</span>
    <div className="flex items-center gap-2 text-typography-800">
      <Button
        onClick={onToggle}
        variant={ButtonVariant.ICON}
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        {expanded ? <ChevronDown /> : <ChevronUp />}
      </Button>
      <Button onClick={onClose} variant={ButtonVariant.ICON} aria-label="Clear all">
        <Close />
      </Button>
    </div>
  </div>
);

const ProgressCircle: FC<ProgressCircleProps> = ({ progress }) => {
  const size = 20;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  const offset = circumference * (1 - pct / 100);

  return (
    <span className="group-hover:hidden">
      <svg className="w-5 h-5" aria-label={`Progress ${pct}%`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1976D2"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </g>
      </svg>
    </span>
  );
};

const UploadProgressDialog: FC = () => {
  // Using local state instead of Redux since admin dashboard doesn't have calls state
  const [uploads, setUploads] = useState<AudioUpload[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);

  const sorted = useMemo(() => {
    // show completed uploads first, then failed, then cancelled, then in progress
    const priority = (u: AudioUpload) => {
      if (u.status === UploadStatus.COMPLETED) return 0;
      if (u.status === UploadStatus.FAILED) return 1;
      if (u.status === UploadStatus.CANCELLED) return 2;
      return 3;
    };
    return [...uploads].sort((a, b) => priority(a) - priority(b));
  }, [uploads]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show browser's default confirmation dialog
      // Note: Browser may remember user's choice after first interaction
      event.preventDefault();
      event.returnValue = "";
    };

    if (uploads.some(u => u.status === UploadStatus.IN_PROGRESS)) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploads]);

  const shouldScroll = uploads.length > 2;

  const onUploadCancel = (chatId: number) => {
    setUploads(prev =>
      prev.map(upload =>
        upload.chatId === chatId ? { ...upload, status: UploadStatus.CANCELLED } : upload,
      ),
    );
  };

  const onCancelAllUploads = () => {
    setUploads(prev =>
      prev.map(upload =>
        upload.status === UploadStatus.IN_PROGRESS
          ? { ...upload, status: UploadStatus.CANCELLED }
          : upload,
      ),
    );
    setIsCancelDialogOpen(false);
  };

  const onClose = () => {
    if (uploads.some(u => u.status === UploadStatus.IN_PROGRESS)) {
      setIsCancelDialogOpen(true);
    } else {
      setUploads([]);
    }
  };

  const getActionIcon = (status: UploadStatus, progress: number, chatId: number) => {
    if (status === UploadStatus.CANCELLED)
      return (
        <span className="whitespace-nowrap text-xs text-typography-400">Upload cancelled</span>
      );
    if (status === UploadStatus.COMPLETED)
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === UploadStatus.FAILED) return <XCircle className="w-4 h-4 text-destructive-500" />;
    return (
      <>
        <ProgressCircle progress={progress} />
        <CloseRed
          className="hidden group-hover:block cursor-pointer w-4 h-4"
          onClick={() => onUploadCancel(chatId)}
        />
      </>
    );
  };

  if (uploads.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-6 z-40 font-primary">
      <div className="w-[360px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] rounded-t-[8px] border border-[#E5E7EB] overflow-hidden">
        <UploadProgressDialogHeader
          uploads={uploads}
          expanded={expanded}
          onClose={onClose}
          onToggle={() => setExpanded(p => !p)}
        />

        {expanded ? (
          <div className={`px-4 py-2 ${shouldScroll ? "max-h-[140px] overflow-y-auto" : ""}`}>
            {sorted.map(({ chatId, fileName, status, progress }) => (
              <div
                key={getKeyFromIndex(chatId, "upload")}
                className="flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2 text-sm text-typography-900">
                  <svg
                    className="w-4 h-4 text-typography-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <span>{fileName}</span>
                </div>
                <div className="group flex items-center gap-2 w-5 h-5 justify-end">
                  {getActionIcon(status, progress, chatId)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      <ActionConfirmationPopup
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        title="Cancel"
        titleItalic="upload"
        description="Your upload is not complete. Would you like to cancel the upload?"
        primaryButton={{
          label: "Continue Upload",
          onClick: () => setIsCancelDialogOpen(false),
          variant: ButtonVariant.PRIMARY,
        }}
        secondaryButton={{
          label: "Cancel Upload",
          onClick: onCancelAllUploads,
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};

export default UploadProgressDialog;
