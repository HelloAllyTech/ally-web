import { FC } from "react";

import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      title={{
        normal: isArchived ? t("calls.dialog.archive.confirm") : t("calls.dialog.archive.title"),
        italic: isArchived
          ? t("calls.dialog.archive.unarchiveItalic")
          : t("calls.dialog.archive.sessionItalic"),
      }}
      content={
        isArchived
          ? t("calls.dialog.archive.unarchiveContent")
          : t("calls.dialog.archive.archiveContent")
      }
      buttonText={
        isArchived ? t("calls.dialog.archive.unarchive") : t("calls.dialog.archive.archive")
      }
      buttonVariant={isArchived ? "primary" : "destructive"}
      onButtonClick={isArchived ? onUnarchiveConfirm : onArchiveConfirm}
      secondaryButtonText={t("common.cancel")}
      onSecondaryButtonClick={onClose}
    />
  );
};

export default ArchiveDialog;
