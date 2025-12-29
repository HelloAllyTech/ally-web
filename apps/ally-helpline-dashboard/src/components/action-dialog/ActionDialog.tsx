import { FC } from "react";

import { Dialog } from "@mui/material";
import { X } from "lucide-react";

import { Button } from "@components";

import { ActionDialogProps } from "./types";

const ActionDialog: FC<ActionDialogProps> = ({
  children,
  open,
  onClose,
  primaryButton,
  secondaryButton,
  showPrimaryButton = true,
  showSecondaryButton = true,
  title,
}) => {
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
      <div className="py-4 px-6 bg-white h-fit w-[400px] flex flex-col gap-6 rounded-[8px]">
        <div className="flex justify-between items-center">
          <span className="font-medium text-typography-800">{title}</span>
          <X className="cursor-pointer" onClick={onClose} data-testid="dialog-close" />
        </div>
        {children}
        <div className="flex gap-4 items-center">
          {showSecondaryButton && (
            <Button variant="secondary" className="flex-1" onClick={secondaryButton?.onClick}>
              {secondaryButton?.label}
            </Button>
          )}
          {showPrimaryButton && (
            <Button
              variant={primaryButton?.variant}
              className="text-base flex-1"
              onClick={primaryButton?.onClick}
            >
              {primaryButton?.label}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default ActionDialog;
