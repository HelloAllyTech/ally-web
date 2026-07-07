import { FC } from "react";

import { ComposedModal, ModalBody, ModalFooter, ModalHeader } from "@ally-ui-mono/ui-shared";
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
    <ComposedModal open={open} onClose={onClose} size="sm" className="font-primary">
      <ModalHeader title={title} closeModal={onClose} />
      <ModalBody>{children}</ModalBody>
      <ModalFooter>
        <div className="flex gap-4 items-center w-full">
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
      </ModalFooter>
    </ComposedModal>
  );
};

export default ActionDialog;
