import React, { useState } from "react";

import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { SkillExperimentDetail, SkillExperimentVariant } from "@types";

import { ExperimentStatusBadge } from "./ExperimentStatusBadge";

type Action = "start" | "stop" | "resume" | "apply";

interface ExperimentStatusCardProps {
  detail: SkillExperimentDetail;
  canEdit: boolean;
  /** Why the experiment can't be turned on yet (no rubric, unsaved edits); undefined when it can. */
  startBlockedReason?: string;
  busy: boolean;
  onAction: (action: Action) => void;
}

const formatUsd = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD" });

/**
 * The top of the drawer: what is serving right now, in one sentence, and the
 * one or two things an admin can do about it. Turning on, turning off and
 * applying all reach live traffic, so each asks first.
 */
export const ExperimentStatusCard: React.FC<ExperimentStatusCardProps> = ({
  detail,
  canEdit,
  startBlockedReason,
  busy,
  onAction,
}) => {
  const copy = en.skillExperiments.drawer;
  const [confirming, setConfirming] = useState<Action | null>(null);
  const { experiment, variants, spend } = detail;
  const status = experiment?.status ?? "off";
  const byId = new Map(variants.map(v => [v.id, v]));
  const champion: SkillExperimentVariant | undefined = experiment?.championVariantId
    ? byId.get(experiment.championVariantId)
    : undefined;
  const challenger = experiment?.challengerVariantId
    ? byId.get(experiment.challengerVariantId)
    : undefined;

  const body = (() => {
    if (!experiment || status === "off") return copy.offBody;
    if (status === "baseline") {
      return copy.baselineBody(champion?.judgedCount ?? 0, experiment.minSamplesPerVariant);
    }
    if (status === "paused" && experiment.pausedReason) {
      return en.skillExperiments.pausedReason[experiment.pausedReason];
    }
    if (challenger && champion) {
      return copy.testingBody(
        challenger.label,
        experiment.challengerTrafficPercent,
        champion.label,
      );
    }
    return copy.draftingBody(champion?.label ?? "Original");
  })();

  const confirmCopy: Record<Action, { title: string; body: string; label: string } | null> = {
    start: { title: copy.confirmTurnOnTitle, body: copy.confirmTurnOnBody, label: copy.turnOn },
    stop: { title: copy.confirmTurnOffTitle, body: copy.confirmTurnOffBody, label: copy.turnOff },
    apply: champion
      ? {
          title: copy.confirmApplyTitle(champion.label),
          body: copy.confirmApplyBody,
          label: copy.apply(champion.label),
        }
      : null,
    resume: null,
  };

  const request = (action: Action) => {
    if (confirmCopy[action]) setConfirming(action);
    else onAction(action);
  };

  const live = status !== "off";
  const canApply = live && status !== "baseline" && !!champion && !champion.isOriginal;
  const pending = confirming ? confirmCopy[confirming] : null;

  return (
    <section
      className="flex flex-col gap-3 rounded-md border border-border-light bg-neutral-50 p-4"
      aria-label={en.skillExperiments.columns.status}
    >
      <div className="flex items-center gap-2">
        <ExperimentStatusBadge status={status} />
        {experiment && champion && champion.meanScore !== null && live && (
          <span className="text-sm text-typography-700">
            {champion.label} {champion.meanScore.toFixed(1)} / {experiment.targetScore}
          </span>
        )}
      </div>
      <p className="text-sm text-typography-800">{body}</p>
      {detail.connected && (
        <p className="text-xs text-typography-500">
          {copy.outputsNote(detail.connected.outputDescription)}
        </p>
      )}

      {experiment && live && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-typography-600">
          {experiment.pendingCount > 0 && <li>{copy.waiting(experiment.pendingCount)}</li>}
          {spend && spend.calls > 0 && (
            <li>
              {copy.spend(formatUsd(spend.costUsd), spend.calls)}
              {spend.unpriced ? ` (${copy.spendUnpriced})` : ""}
            </li>
          )}
        </ul>
      )}
      {experiment?.lastError && live && (
        <p className="text-xs text-destructive-700" role="status">
          {copy.lastError} {experiment.lastError}
        </p>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          {!live && (
            <Button
              variant={ButtonVariant.PRIMARY}
              disabled={busy || !!startBlockedReason}
              title={startBlockedReason}
              onClick={() => request("start")}
            >
              {copy.turnOn}
            </Button>
          )}
          {status === "paused" && champion && (
            <Button
              variant={ButtonVariant.PRIMARY}
              disabled={busy || !canApply}
              title={!canApply ? copy.applyDisabled : undefined}
              onClick={() => request("apply")}
            >
              {copy.apply(champion.label)}
            </Button>
          )}
          {status === "paused" && (
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={busy}
              onClick={() => request("resume")}
            >
              {copy.resume}
            </Button>
          )}
          {status === "testing" && canApply && champion && (
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={busy}
              onClick={() => request("apply")}
            >
              {copy.apply(champion.label)}
            </Button>
          )}
          {live && (
            <Button
              variant={ButtonVariant.SECONDARY}
              disabled={busy}
              onClick={() => request("stop")}
            >
              {copy.turnOff}
            </Button>
          )}
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={!!pending}
        onClose={() => setConfirming(null)}
        title={pending?.title ?? ""}
        description={pending?.body ?? ""}
        primaryButton={{
          label: pending?.label ?? "",
          onClick: () => {
            const action = confirming;
            setConfirming(null);
            if (action) onAction(action);
          },
        }}
        secondaryButton={{ label: copy.cancel, onClick: () => setConfirming(null) }}
      />
    </section>
  );
};
