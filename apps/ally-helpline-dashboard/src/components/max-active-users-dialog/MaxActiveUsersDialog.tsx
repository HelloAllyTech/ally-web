import { useState, useEffect } from "react";

import { Dialog } from "@mui/material";

import { MaxActiveUsers } from "@assets";
import { Button } from "@components";

import { MaxActiveUsersDialogProps } from "./types";

const MaxActiveUsersDialog = ({ open, onClose, onRetry }: MaxActiveUsersDialogProps) => {
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

  // Auto retry timer
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

  // Manual retry timer
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "8px",
        },
      }}
    >
      <div className="flex flex-col gap-[14px] p-8 items-center justify-center w-[400px]">
        <MaxActiveUsers />
        <div className="font-medium text-typography-900 font-primary text-2xl text-center">
          We're at capacity right now
        </div>
        <div className="font-primary text-typography-800 text-base font-normal text-center">
          We're currently handling the maximum number of active users. Please wait a moment and try
          again access usually frees up shortly.
        </div>
        <Button
          variant="primary"
          className="w-[180px]"
          onClick={handleRetryButtonClick}
          disabled={isRetryButtonClicked}
        >
          Retry
        </Button>

        <div className="font-primary text-typography-600 text-sm font-normal text-center">
          {isRetryButtonClicked
            ? `You can retry in ${manualRetryRemainingTime}s`
            : `We'll automatically retry in ${autoRetryRemainingTime}s`}
        </div>
      </div>
    </Dialog>
  );
};

export default MaxActiveUsersDialog;
