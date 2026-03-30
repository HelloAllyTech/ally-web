import { FC } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useDeleteCallLogMutation } from "@api";
import { ConfirmationDialog } from "@components";

import { DeleteCallLogDialogDataProps } from "./types";

const DeleteCallLogConfirmationDialog: FC<DeleteCallLogDialogDataProps> = ({
  chatId,
  closeDialog,
}) => {
  const { t } = useTranslation();
  const [deleteCallLog] = useDeleteCallLogMutation();

  const onDeleteConfirm = async () => {
    if (!chatId) return;
    try {
      await deleteCallLog(chatId).unwrap();
      closeDialog(true);
    } catch (error) {
      const errorMessage = `Failed to delete call log. ${error?.data?.message ?? ""}`;
      toast.error(errorMessage);
      closeDialog(false);
    }
  };

  return (
    <ConfirmationDialog
      isOpen={!!chatId}
      onClose={() => closeDialog(false)}
      onButtonClick={onDeleteConfirm}
      title={{
        normal: t("calls.dialog.delete.titleNormal"),
        italic: t("calls.dialog.delete.titleItalic"),
      }}
      content={t("calls.dialog.delete.content")}
      buttonText={t("calls.dialog.delete.primary")}
      buttonVariant="destructive"
      secondaryButtonText={t("calls.dialog.delete.secondary")}
      onSecondaryButtonClick={() => closeDialog(false)}
    />
  );
};

export default DeleteCallLogConfirmationDialog;
