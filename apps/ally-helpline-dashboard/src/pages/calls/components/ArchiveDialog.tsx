import { FC } from "react";

import { ConfirmationDialog } from "@src/components";

interface ArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isArchived: boolean;
  onUnarchiveConfirm: () => void;
  onArchiveConfirm: () => void;
}

const ArchiveDialog: FC<ArchiveDialogProps> = ({
  isOpen,
  onClose,
  isArchived,
  onUnarchiveConfirm,
  onArchiveConfirm,
}) => {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      title={{
        normal: isArchived ? "Confirm" : "Archive this",
        italic: isArchived ? "Unarchive?" : "Session?",
      }}
      content={
        isArchived
          ? "Are you sure you want to unarchive this session ?"
          : "Are you sure you want to archive this session ? This will hide it from session logs but you can restore it later"
      }
      buttonText={isArchived ? "Unarchive" : "Archive"}
      buttonVariant={isArchived ? "primary" : "destructive"}
      onButtonClick={isArchived ? onUnarchiveConfirm : onArchiveConfirm}
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={onClose}
    />
  );
};

export default ArchiveDialog;
