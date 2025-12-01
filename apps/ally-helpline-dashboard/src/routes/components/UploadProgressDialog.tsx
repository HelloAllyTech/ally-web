import { FC, useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { useSelector } from "react-redux";

import { useCancelAudioUploadMutation } from "@api";
import { AudioFile, Close, CrossRedBackground, TickGreenBackground } from "@assets";
import { Button, ButtonVariant, ConfirmationDialog } from "@components";
import { clearAudioUploads, updateAudioUploadStatus } from "@reducer";
import { RootState, store } from "@store";
import { UploadStatus } from "@types";
import { getKeyFromIndex } from "@utils";

import { ProgressCircleProps, UploadProgressHeaderProps } from "./types";
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
  const uploads = useSelector((s: RootState) => s.calls.audioUpload);

  const [expanded, setExpanded] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);

  const [cancelAudioUpload] = useCancelAudioUploadMutation();

  const sorted = useMemo(() => {
    // show completed uploads first, then failed, then cancelled, then in progress
    const priority = u => {
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
    cancelAudioUpload({ chatId });
    store.dispatch(updateAudioUploadStatus({ chatId, status: UploadStatus.CANCELLED }));
  };

  const onCancelAllUploads = () => {
    uploads.forEach(u => {
      if (u.status === UploadStatus.IN_PROGRESS) {
        onUploadCancel(u.chatId);
      }
    });
    setIsCancelDialogOpen(false);
  };

  const onClose = () => {
    if (uploads.some(u => u.status === UploadStatus.IN_PROGRESS)) {
      setIsCancelDialogOpen(true);
    } else {
      store.dispatch(clearAudioUploads());
    }
  };

  const getActionIcon = (status: UploadStatus, progress: number, chatId: number) => {
    if (status === UploadStatus.CANCELLED)
      return (
        <span className="whitespace-nowrap text-xs text-typography-400">Upload cancelled</span>
      );
    if (status === UploadStatus.COMPLETED) return <TickGreenBackground />;
    if (status === UploadStatus.FAILED) return <XCircle className="w-4 h-4 text-destructive-500" />;
    return (
      <>
        <ProgressCircle progress={progress} />
        <CrossRedBackground
          className="hidden group-hover:block cursor-pointer"
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
                  <AudioFile />
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
      <ConfirmationDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        title={{ normal: "Cancel", italic: "upload" }}
        content="Your upload is not complete. Would you like to cancel the upload?"
        buttonText="Cancel Upload"
        buttonVariant={ButtonVariant.SECONDARY}
        onButtonClick={onCancelAllUploads}
        secondaryButtonText="Continue Upload"
        secondaryButtonVariant={ButtonVariant.PRIMARY}
        onSecondaryButtonClick={() => setIsCancelDialogOpen(false)}
      />
    </div>
  );
};

export default UploadProgressDialog;
