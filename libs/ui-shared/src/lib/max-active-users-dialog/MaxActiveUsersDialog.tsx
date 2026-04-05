"use client";

import { useState, useEffect, FC } from "react";

import { MaxActiveUsersDialogProps } from "./types";
import { MaxActiveUsers } from "../../assets";

const MaxActiveUsersDialog: FC<MaxActiveUsersDialogProps> = ({
  open,
  onClose,
  onRetry,
  translations,
}) => {
  const [manualRetryRemainingTime, setManualRetryRemainingTime] = useState<number>(30);
  const [autoRetryRemainingTime, setAutoRetryRemainingTime] = useState<number>(30);
  const [isRetryButtonClicked, setIsRetryButtonClicked] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setAutoRetryRemainingTime(30);
      setManualRetryRemainingTime(30);
      setIsRetryButtonClicked(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || isRetryButtonClicked) {
      return undefined;
    }

    const interval = setInterval(() => {
      setAutoRetryRemainingTime(prev => {
        if (prev <= 1) {
          onRetry();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, isRetryButtonClicked, onRetry]);

  useEffect(() => {
    if (!isRetryButtonClicked || manualRetryRemainingTime <= 0) {
      if (manualRetryRemainingTime <= 0 && isRetryButtonClicked) {
        setIsRetryButtonClicked(false);
      }
      return undefined;
    }

    const interval = setInterval(() => {
      setManualRetryRemainingTime(prev => {
        if (prev <= 1) {
          setIsRetryButtonClicked(false);
          setAutoRetryRemainingTime(30);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRetryButtonClicked, manualRetryRemainingTime]);

  const handleRetryButtonClick = () => {
    setIsRetryButtonClicked(true);
    setManualRetryRemainingTime(30);
    onRetry();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col gap-[14px] p-8 items-center justify-center w-[400px]">
          <MaxActiveUsers />
          <div className="font-medium text-typography-900 font-primary text-2xl text-center">
            {translations.title}
          </div>
          <div className="font-primary text-typography-800 text-base font-normal text-center">
            {translations.description}
          </div>
          <button
            type="button"
            onClick={handleRetryButtonClick}
            disabled={isRetryButtonClicked}
            className="w-[180px] h-10 flex items-center justify-center gap-2 py-2 px-4 whitespace-nowrap text-sm font-medium rounded-[100px] 
              transition-transform duration-150 ease-out hover:-translate-y-[1px] disabled:hover:translate-y-0
              disabled:cursor-default disabled:opacity-50 text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary/50 font-tertiary"
          >
            {translations.retry}
          </button>

          <div className="font-primary text-typography-600 text-sm font-normal text-center">
            {isRetryButtonClicked
              ? translations.manualRetry.replace("{seconds}", String(manualRetryRemainingTime))
              : translations.autoRetry.replace("{seconds}", String(autoRetryRemainingTime))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaxActiveUsersDialog;
