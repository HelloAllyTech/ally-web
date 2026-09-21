import React from "react";

import { ActionConfirmationPopup } from "@components/action-confirmation-popup";
import { en } from "@constants";

interface ConfirmCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

/**
 * Gates "Stop this build" behind a confirmation.
 *
 * The button used to cancel on a single click — a build that has been running
 * for twenty minutes is a real cost to throw away by a misclick, and cancel
 * has no undo (see `cancelSessionConfirmBody`).
 */
export const ConfirmCancelDialog: React.FC<ConfirmCancelDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}) => {
  const strings = en.builder;

  return (
    <ActionConfirmationPopup
      isOpen={isOpen}
      onClose={onClose}
      title={strings.cancelSessionConfirm}
      description={strings.cancelSessionConfirmBody}
      primaryButton={{
        label: strings.cancelSession,
        onClick: onConfirm,
        disabled: isLoading,
      }}
      secondaryButton={{
        label: strings.prd.cancel,
        onClick: onClose,
        disabled: isLoading,
      }}
    />
  );
};
