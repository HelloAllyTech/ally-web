import { FC } from "react";

import { useDeleteCallLogMutation } from "@api";
import { ConfirmationDialog } from "@components";

import { DeleteCallLogDialogDataProps } from "./types";

const DeleteCallLogConfirmationDialog: FC<DeleteCallLogDialogDataProps> = ({
  chatId,
  closeDialog,
}) => {
  const [deleteCallLog] = useDeleteCallLogMutation();

  const onDeleteConfirm = async () => {
    if (!chatId) return;
    await deleteCallLog(chatId);
    closeDialog(true);
  };

  return (
    <ConfirmationDialog
      isOpen={!!chatId}
      onClose={() => closeDialog(false)}
      onButtonClick={onDeleteConfirm}
      title={{ normal: "Delete", italic: "Session log?" }}
      content="Do you really want to delete this record? This process cannot be undone."
      buttonText="Delete"
      buttonVariant="destructive"
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={() => closeDialog(false)}
    />
  );
};

export default DeleteCallLogConfirmationDialog;
