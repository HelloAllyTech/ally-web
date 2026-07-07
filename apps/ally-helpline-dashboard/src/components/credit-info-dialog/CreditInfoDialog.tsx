import { FC, useEffect } from "react";

import { ComposedModal, ModalBody } from "@ally-ui-mono/ui-shared";
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
    <ComposedModal open={open} onClose={onClose} size="sm">
      <ModalBody className="p-0">
        <div className="bg-white h-fit w-[400px] flex flex-col gap-6 rounded-[8px] items-center justify-center pb-10">
          <CloseIcon onClick={onClose} className="cursor-pointer self-end" />
          <div className="font-medium text-typography-800 text-2xl font-secondary">{title}</div>
          <NoCreditLeft />
          <div className="w-[300px] flex  justify-center text-center font-primary text-xl">
            {description}
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};

export default CreditInfoDialog;
