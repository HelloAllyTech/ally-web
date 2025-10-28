import { FC, useEffect } from "react";

import { Dialog } from "@mui/material";

import { CloseIcon, NoCreditLeft } from "@assets";

import { CreditInfoProps } from "./types";

const CreditInfoDialog: FC<CreditInfoProps> = ({
  open,
  onClose,
  title,
  description,
  autoCloseDuration,
}) => {
  useEffect(() => {
    if (open && autoCloseDuration) {
      const timer = setTimeout(() => onClose(), autoCloseDuration);
      return () => clearTimeout(timer);
    }
    return () => {};
  }, [open, autoCloseDuration, onClose]);

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
      <div className="bg-white h-fit w-[400px] flex flex-col gap-6 rounded-[8px] items-center justify-center pb-10">
        <CloseIcon onClick={onClose} className="cursor-pointer self-end" />
        <div className="font-medium text-[#47464F] text-[24px] font-['Replay_Pro']">{title}</div>
        <NoCreditLeft />
        <div className="w-[300px] flex  justify-center text-center font-['IBM_Plex_Serif'] text-[20px]">
          {description}
        </div>
      </div>
    </Dialog>
  );
};

export default CreditInfoDialog;
