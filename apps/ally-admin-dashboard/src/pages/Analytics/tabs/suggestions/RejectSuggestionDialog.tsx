import React, { useState } from "react";

import { toast } from "sonner";

import { ComposedModal, InlineNotification, ModalBody, TextArea } from "@ally-ui-mono/ui-shared";
import { useRejectAnalyticsSuggestionMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { AnalyticsSuggestion } from "@types";

const REASON_MAX = 1000;

interface RejectSuggestionDialogProps {
  suggestion: AnalyticsSuggestion;
  onClose: () => void;
  onRejected: () => void;
}

/**
 * Say no, and optionally say why.
 *
 * The reason is optional but it is the reason this is a dialog at all: it is fed
 * into later runs as a standing decision, so a recorded "no" stops the idea coming
 * back and an unrecorded one does not. The helper text says exactly that, because
 * a reader who thinks the box is bookkeeping will skip it.
 *
 * Rejecting is not destructive — the suggestion is kept, with its decision — so
 * there is no second confirmation on top of this one.
 */
export const RejectSuggestionDialog: React.FC<RejectSuggestionDialogProps> = ({
  suggestion,
  onClose,
  onRejected,
}) => {
  const strings = en.analyticsSuggestions;
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [reject, { isLoading }] = useRejectAnalyticsSuggestionMutation();

  const submit = async () => {
    setError(null);
    const trimmed = reason.trim();
    try {
      await reject({
        id: suggestion.id,
        body: trimmed ? { reason: trimmed } : {},
      }).unwrap();
      toast.success(strings.rejected);
      onRejected();
      onClose();
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      const message =
        (caught as { data?: { message?: string } })?.data?.message ?? strings.rejectFailed;
      // Already decided elsewhere: the refetch shows the truth, so close rather
      // than inviting a second attempt.
      if (status === 409) {
        toast.error(message);
        onRejected();
        onClose();
        return;
      }
      setError(message);
    }
  };

  return (
    <ComposedModal open onClose={onClose} size="sm">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-typography-primary text-xl">{strings.rejectTitle}</h2>
          <p className="text-typography-700 text-sm">{suggestion.title}</p>

          <TextArea
            id="reject-suggestion-reason"
            labelText={strings.reasonLabel}
            helperText={strings.reasonHelper}
            rows={3}
            value={reason}
            maxLength={REASON_MAX}
            onChange={event => setReason(event.target.value)}
            placeholder={strings.reasonPlaceholder}
          />

          {error && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title=""
              subtitle={error}
              className="max-w-full"
            />
          )}

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose} disabled={isLoading}>
              {strings.cancel}
            </Button>
            <Button variant={ButtonVariant.PRIMARY} onClick={submit} disabled={isLoading}>
              {strings.rejectSubmit}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
