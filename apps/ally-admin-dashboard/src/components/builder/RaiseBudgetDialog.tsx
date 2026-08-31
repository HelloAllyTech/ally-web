import React, { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button, ComposedModal, ModalBody, NumberInput } from "@ally-ui-mono/ui-shared";
import { useRaiseBuilderSessionBudgetMutation } from "@api";
import { en } from "@constants";
import { BuilderBudgetState } from "@types";

interface RaiseBudgetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  /** Live spend and ceiling — `hold` set means a run is parked waiting on this. */
  budget: BuilderBudgetState;
  onRaised?: () => void;
}

/**
 * The default the field opens on: clear of what has already been spent, and a
 * round number.
 *
 * Seeded from the SPEND rather than the old ceiling because the old ceiling is
 * by definition already too low — a session at $16.77 of $15 opening on "15"
 * would hand back the figure that just stopped it. Ten dollars of headroom is
 * roughly one more coding-plus-verify round at current model prices, which is
 * the unit of work being bought.
 */
export const suggestNewCeiling = (spentUsd: number, currentUsd: number | null): number => {
  const floor = Math.max(spentUsd, currentUsd ?? 0);
  return Math.max(5, Math.ceil((floor + 10) / 5) * 5);
};

const money = (value: number | null) => (value === null ? null : `$${value.toFixed(2)}`);

/**
 * Raise a session's spend ceiling — including mid-build, which is what this
 * exists for.
 *
 * A build that hits its ceiling holds at the next phase boundary instead of
 * aborting (see `hold_or_abort_if_over_budget` in run-engine.sh), because
 * nothing it has written is pushed anywhere before the finalise phase: an
 * abort discards the whole working tree and the retry starts again from the
 * PRD. So raising the ceiling here is not "start again with more money", it is
 * "carry on" — and the copy says so, because the two are worth very different
 * amounts to the person deciding.
 */
export const RaiseBudgetDialog: React.FC<RaiseBudgetDialogProps> = ({
  isOpen,
  onClose,
  sessionId,
  budget,
  onRaised,
}) => {
  const strings = en.builder.budget.dialog;
  const isHeld = Boolean(budget.hold);

  const [raiseBudget, { isLoading }] = useRaiseBuilderSessionBudgetMutation();
  const [value, setValue] = useState("");

  // Re-seed on every open: the spend moves while the dialog is closed, and a
  // stale suggestion is exactly the figure the server will refuse.
  useEffect(() => {
    if (!isOpen) return;
    setValue(String(suggestNewCeiling(budget.spentUsd, budget.budgetUsd)));
  }, [isOpen, budget.spentUsd, budget.budgetUsd]);

  const handleSubmit = async () => {
    if (!value.trim()) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;

    try {
      const result = await raiseBudget({ id: sessionId, budgetUsd: parsed }).unwrap();
      // Two different pieces of news: a held run picking its work back up, and
      // a ceiling raised for later. Saying "carrying on" when nothing was
      // waiting would be a lie the person can't check.
      toast.success(result.released ? strings.released : strings.raised);
      onRaised?.();
      onClose();
    } catch (error) {
      // The server's refusal names the figure it wanted (above the spend), so
      // it is more useful than anything generic said here.
      const message = (error as { data?: { message?: string } })?.data?.message ?? strings.failed;
      toast.error(message);
    }
  };

  return (
    <ComposedModal open={isOpen} onClose={onClose} size="sm">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-typography-900">{strings.title}</h2>
          <p className="text-sm text-typography-600">
            {isHeld ? strings.heldIntro : strings.intro}
          </p>

          <dl className="flex gap-6 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-typography-500">
                {strings.spentLabel}
              </dt>
              <dd className="font-medium text-typography-900">
                {money(budget.spentUsd) ?? "$0.00"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-typography-500">
                {strings.currentLabel}
              </dt>
              <dd className="font-medium text-typography-900">
                {money(budget.budgetUsd) ?? strings.currentNone}
              </dd>
            </div>
          </dl>

          <div>
            <NumberInput
              id="builder-raise-budget"
              label={strings.newLabel}
              hideSteppers
              min={0}
              value={value}
              onChange={(_event: unknown, state: { value: number | string } | undefined) =>
                setValue(state?.value === undefined ? "" : String(state.value))
              }
            />
            <p className="mt-1 text-xs text-typography-500">{strings.newHint}</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button kind="tertiary" onClick={onClose}>
              {en.builder.prd.cancel}
            </Button>
            <Button kind="primary" disabled={isLoading} onClick={() => void handleSubmit()}>
              {isHeld ? strings.submitHeld : strings.submit}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
