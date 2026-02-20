import { FC, useEffect, useMemo, useState, useCallback } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { useCancelReportGenerationMutation } from "@api";
import { ArrowDown, Cancel, Close, TickGreenBackground, Document, FailIcon } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ReportGenerationStatus } from "@constants/reportGeneration";
import { cancelUpload, selectUploads, addUpload } from "@reducer/reportUploadReducer";

import { ProgressCircleProps, UploadProgressHeaderProps } from "./types";
import { getUploadHeader } from "./utils";

const UploadProgressDialogHeader: FC<UploadProgressHeaderProps> = ({
  uploads,
  expanded,
  onClose,
  onToggle,
}) => (
  <div className="flex items-center justify-between mx-4 py-2 border-b border-[#EFEFEF]">
    <span className="text-base font-medium text-[#1A1A1A]">{getUploadHeader(uploads)}</span>
    <div className="flex items-center gap-2 text-typography-800">
      <Button
        onClick={onToggle}
        variant={ButtonVariant.ICON}
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        <ArrowDown className={expanded ? "rotate-180" : ""} />
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
  const dispatch = useDispatch();
  const uploads = useSelector(selectUploads);
  const [expanded, setExpanded] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [cancelReportGenerationMutation] = useCancelReportGenerationMutation();

  const sorted = useMemo(() => {
    return [...uploads].reverse();
  }, [uploads]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    if (
      uploads.some(
        u =>
          u.status === ReportGenerationStatus.IN_PROGRESS ||
          u.status === ReportGenerationStatus.STARTED,
      )
    ) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [uploads]);

  useEffect(() => {
    // Show dialog when new uploads are added
    if (uploads.length > 0) {
      setIsVisible(true);
    }
  }, [uploads.length]);

  const shouldScroll = uploads.length > 2;

  const onUploadCancel = useCallback(
    async (reportId: string) => {
      const upload = uploads.find(u => u.reportId === reportId);
      if (!upload) return;

      if (reportId) {
        try {
          await cancelReportGenerationMutation({ reportId }).unwrap();
          dispatch(
            addUpload({
              fileName: upload.fileName,
              status: ReportGenerationStatus.CANCELLED,
              progress: 0,
              reportId,
              scenarioId: upload.scenarioId,
            }),
          );
        } catch (error: any) {
          const errorMessage =
            error?.data?.message || error?.message || "Failed to cancel report generation";
          toast.error(errorMessage);
          dispatch(cancelUpload(reportId));
        }
      } else {
        dispatch(cancelUpload(reportId));
      }
    },
    [uploads, cancelReportGenerationMutation, dispatch],
  );

  const onClose = () => {
    setIsVisible(false);
  };

  const getActionIcon = (status: ReportGenerationStatus, progress: number, reportId: string) => {
    if (status === ReportGenerationStatus.CANCELLED)
      return <span className="whitespace-nowrap text-xs text-typography-400">Cancelled</span>;
    if (status === ReportGenerationStatus.COMPLETED)
      return (
        <div className="w-4 h-4">
          <TickGreenBackground />
        </div>
      );
    if (status === ReportGenerationStatus.FAILED)
      return (
        <div className="w-4 h-4">
          <FailIcon />
        </div>
      );
    return (
      <>
        <ProgressCircle progress={progress} />
        <Cancel
          className="hidden group-hover:block cursor-pointer w-4 h-4"
          onClick={() => onUploadCancel(reportId)}
        />
      </>
    );
  };

  if (uploads.length === 0 || !isVisible) return null;

  return (
    <div className="fixed bottom-4 right-6 z-40 font-primary">
      <div className="w-[360px] bg-white shadow-[0_2px_10px_rgba(0,0,0,0.15)] rounded-t-[8px] border border-[#E5E7EB] overflow-hidden">
        <UploadProgressDialogHeader
          uploads={uploads}
          expanded={expanded}
          onClose={onClose}
          onToggle={() => setExpanded(p => !p)}
        />

        {expanded ? (
          <div className={`px-4 py-2 ${shouldScroll ? "max-h-[140px] overflow-y-auto" : ""}`}>
            {sorted.map(({ reportId, fileName, status, progress }) => (
              <div key={reportId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 text-sm text-typography-900">
                  <Document className="w-4 h-4" />
                  <span>{fileName}</span>
                </div>
                <div className="group flex items-center gap-2 w-5 h-5 justify-end">
                  {getActionIcon(status, progress, reportId)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UploadProgressDialog;
