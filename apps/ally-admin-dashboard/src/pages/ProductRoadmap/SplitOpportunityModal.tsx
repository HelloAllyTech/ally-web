import React, { useMemo, useState } from "react";

import { toast } from "sonner";

import { ComposedModal, ModalBody, NumberInput, TextArea } from "@ally-ui-mono/ui-shared";
import { useSplitRoadmapOpportunityMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunity } from "@types";

import { largestRemainderPreview } from "./utils/split";

const DESCRIPTION_MAX = 1000;

interface SplitOpportunityModalProps {
  opportunity: RoadmapOpportunity;
  onClose: () => void;
}

interface DraftPart {
  /** Present on exactly one part — the original, which is KEPT and reworded. */
  id?: string;
  description: string;
  weight: number;
}

/**
 * Split one opportunity into parts, redistributing every contributor's votes by weight.
 *
 * Exactly one part carries the original id. That part is kept and reworded rather than
 * recreated, so its comments, its history and any `?opportunity=<id>` link people have shared all
 * survive — the backend enforces this and rejects a payload where zero or two parts claim it.
 *
 * The preview under the weights runs the SAME largest-remainder (Hamilton) arithmetic the backend
 * uses, so an admin can see exactly how this opportunity's current score will divide before
 * committing. Votes are conserved exactly: the parts always sum to the original.
 */
export const SplitOpportunityModal: React.FC<SplitOpportunityModalProps> = ({
  opportunity,
  onClose,
}) => {
  const [parts, setParts] = useState<DraftPart[]>(() => [
    { id: opportunity.id, description: opportunity.description, weight: 50 },
    { description: "", weight: 50 },
  ]);

  const [split, { isLoading }] = useSplitRoadmapOpportunityMutation();

  const weights = parts.map(p => p.weight);
  const weightTotal = weights.reduce((a, b) => a + b, 0);

  /** How the CURRENT total score would divide. Illustrative — the backend splits per
   *  (user, period) row, so real per-part totals are the sum of many small splits. */
  const preview = useMemo(
    () => largestRemainderPreview(opportunity.priorityScore, weights),
    [opportunity.priorityScore, weights],
  );

  const updatePart = (index: number, patch: Partial<DraftPart>) =>
    setParts(prev => prev.map((part, i) => (i === index ? { ...part, ...patch } : part)));

  const addPart = () => setParts(prev => [...prev, { description: "", weight: 0 }]);

  const removePart = (index: number) =>
    // The original is never removable — dropping it would leave no part carrying the id.
    setParts(prev => (prev[index]?.id ? prev : prev.filter((_, i) => i !== index)));

  const validationError = (() => {
    if (parts.length < 2) return "A split needs at least 2 parts.";
    if (parts.some(p => !p.description.trim())) return "Every part needs a description.";
    if (parts.some(p => p.description.length > DESCRIPTION_MAX))
      return `Descriptions are limited to ${DESCRIPTION_MAX} characters.`;
    if (weights.some(w => !Number.isFinite(w) || w < 0)) return "Weights must be 0 or more.";
    if (weightTotal <= 0) return "Weights must sum to more than 0.";
    return null;
  })();

  const submit = async () => {
    try {
      const result = await split({
        id: opportunity.id,
        parts: parts.map(part => ({
          ...(part.id ? { id: part.id } : {}),
          description: part.description.trim(),
          weight: part.weight,
        })),
      }).unwrap();
      toast.success(`Split into ${result.partIds.length} opportunities.`);
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not split this.";
      toast.error(message);
    }
  };

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-typography-primary text-xl">Split opportunity</h2>
            <p className="text-typography-secondary mt-1 text-sm">
              Everyone&apos;s votes are redistributed across the parts by weight. Nothing is lost:
              the parts always add up to the original {opportunity.priorityScore}.
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {parts.map((part, index) => (
              <li key={part.id ?? `new-${index}`} className="border-border-light border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-typography-secondary text-xs uppercase tracking-wide">
                    {part.id
                      ? "Original — keeps its comments and shared links"
                      : `Part ${index + 1}`}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-typography-secondary font-mono text-xs">
                      ≈ {preview[index] ?? 0} votes
                    </span>
                    {!part.id && (
                      <Button variant={ButtonVariant.TEXT} onClick={() => removePart(index)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <TextArea
                  id={`split-part-${index}`}
                  labelText="Description"
                  rows={2}
                  value={part.description}
                  maxLength={DESCRIPTION_MAX}
                  onChange={event => updatePart(index, { description: event.target.value })}
                />

                <div className="mt-2 w-40">
                  <NumberInput
                    id={`split-weight-${index}`}
                    label="Weight"
                    min={0}
                    value={part.weight}
                    onChange={(_event, state) =>
                      updatePart(index, { weight: Number(state?.value ?? 0) })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between">
            <Button variant={ButtonVariant.SECONDARY} onClick={addPart}>
              Add a part
            </Button>
            <span className="text-typography-secondary text-xs">Weights total {weightTotal}</span>
          </div>

          {validationError && <p className="text-destructive-500 text-sm">{validationError}</p>}

          <div className="flex justify-end gap-2">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={submit}
              disabled={!!validationError || isLoading}
            >
              {isLoading ? "Splitting…" : `Split into ${parts.length}`}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
