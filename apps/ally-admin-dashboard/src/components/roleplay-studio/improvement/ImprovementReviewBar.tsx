import React, { useState } from "react";

import { toast } from "sonner";

import { useAcceptImprovementRunMutation, useDiscardImprovementRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";

interface ImprovementReviewBarProps {
  runId: string;
  /** Draft concurrency token observed at review time (spec.updatedAt). */
  draftUpdatedAt?: string | null;
  onResolved?: () => void;
}

/**
 * Accept / Discard for a run awaiting review. Accept sends the optimistic
 * concurrency token first; a 409 (draft changed during the loop) surfaces an
 * explicit overwrite confirmation and retries without the token.
 */
export const ImprovementReviewBar: React.FC<ImprovementReviewBarProps> = ({
  runId,
  draftUpdatedAt,
  onResolved,
}) => {
  const strings = en.roleplayStudio.improvement;
  const [acceptRun, { isLoading: isAccepting }] = useAcceptImprovementRunMutation();
  const [discardRun, { isLoading: isDiscarding }] = useDiscardImprovementRunMutation();
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const handleAccept = async (force: boolean) => {
    try {
      await acceptRun({
        runId,
        ...(force || !draftUpdatedAt ? {} : { expectedDraftUpdatedAt: draftUpdatedAt }),
      }).unwrap();
      toast.success(strings.accepted);
      setConfirmOverwrite(false);
      onResolved?.();
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status === 409 && !force) {
        setConfirmOverwrite(true);
        return;
      }
      toast.error(strings.acceptFailed);
    }
  };

  const handleDiscard = async () => {
    try {
      await discardRun(runId).unwrap();
      toast.success(strings.discarded);
      onResolved?.();
    } catch {
      toast.error(strings.discardFailed);
    }
  };

  return (
    <div className="rounded-lg border border-border-light bg-white p-4">
      {confirmOverwrite ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-typography-900">{strings.acceptConflictTitle}</p>
            <p className="mt-0.5 text-xs text-typography-700">
              {strings.acceptConflictDescription}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              className="h-[32px] px-3 text-sm"
              onClick={() => setConfirmOverwrite(false)}
            >
              {strings.discard}
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              className="h-[32px] px-3 text-sm"
              onClick={() => handleAccept(true)}
              disabled={isAccepting}
            >
              {strings.acceptConfirm}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={ButtonVariant.SECONDARY}
            className="h-[34px] px-4 text-sm"
            onClick={handleDiscard}
            disabled={isDiscarding || isAccepting}
          >
            {strings.discard}
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            className="h-[34px] px-4 text-sm"
            onClick={() => handleAccept(false)}
            disabled={isAccepting || isDiscarding}
          >
            {isAccepting ? strings.accepting : strings.accept}
          </Button>
        </div>
      )}
    </div>
  );
};
