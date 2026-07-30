import React, { useState } from "react";

import { toast } from "sonner";

import { ComposedModal, ModalBody, TextArea } from "@ally-ui-mono/ui-shared";
import { useMergeRoadmapOpportunitiesMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunity } from "@types";

const DESCRIPTION_MAX = 1000;

interface MergeOpportunitiesModalProps {
  /** The rows selected on the board — at least two. */
  selected: RoadmapOpportunity[];
  onClose: () => void;
  onMerged: () => void;
}

/**
 * Fold several opportunities into one.
 *
 * Coins roll up per (user, period): if two people each voted on two of the duplicates, their
 * monthly totals are preserved exactly rather than double-counted or dropped. Comments move to
 * the survivor, and the sources are SOFT-deleted so any release notes that snapshotted their ids
 * still resolve.
 *
 * The primary defaults to the highest-scoring selection, since that is almost always the one
 * people have been voting on and the one whose link has been shared.
 */
export const MergeOpportunitiesModal: React.FC<MergeOpportunitiesModalProps> = ({
  selected,
  onClose,
  onMerged,
}) => {
  const ranked = [...selected].sort((a, b) => b.priorityScore - a.priorityScore);
  const [primaryId, setPrimaryId] = useState(ranked[0]?.id ?? "");
  const [description, setDescription] = useState(ranked[0]?.description ?? "");

  const [merge, { isLoading }] = useMergeRoadmapOpportunitiesMutation();

  const primary = ranked.find(o => o.id === primaryId);
  const sources = ranked.filter(o => o.id !== primaryId);
  const combinedScore = ranked.reduce((sum, o) => sum + o.priorityScore, 0);

  const choosePrimary = (id: string) => {
    setPrimaryId(id);
    // Follow the chosen primary's wording unless the user has already edited it away from the
    // previous primary's text.
    const next = ranked.find(o => o.id === id);
    if (next && description === primary?.description) setDescription(next.description);
  };

  const submit = async () => {
    try {
      await merge({
        primaryId,
        sourceIds: sources.map(o => o.id),
        ...(description.trim() && description.trim() !== primary?.description
          ? { description: description.trim() }
          : {}),
      }).unwrap();
      toast.success(`Merged ${sources.length + 1} opportunities.`);
      onMerged();
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not merge these.";
      toast.error(message);
    }
  };

  const validationError =
    selected.length < 2
      ? "Select at least two opportunities to merge."
      : !primaryId
        ? "Choose which opportunity survives."
        : description.trim().length === 0
          ? "The surviving opportunity needs a description."
          : description.length > DESCRIPTION_MAX
            ? `Descriptions are limited to ${DESCRIPTION_MAX} characters.`
            : null;

  return (
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-typography-primary text-xl">Merge opportunities</h2>
            <p className="text-typography-secondary mt-1 text-sm">
              Coins roll up per person per month, so nobody&apos;s monthly spend changes. Comments
              move to the survivor and the others are archived — links to them keep working.
            </p>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-typography-primary text-sm">Which one survives?</h3>
            <ul className="border-border-light relative max-h-56 overflow-y-auto border">
              {ranked.map(opportunity => (
                <li key={opportunity.id} className="border-border-light border-b last:border-b-0">
                  <label className="hover:bg-background-secondary flex cursor-pointer items-start gap-3 p-2 text-sm">
                    <input
                      type="radio"
                      name="merge-primary"
                      checked={opportunity.id === primaryId}
                      onChange={() => choosePrimary(opportunity.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="text-typography-primary">{opportunity.description}</span>
                      <span className="text-typography-secondary block text-xs">
                        <span className="font-mono">{opportunity.priorityScore} coins</span> ·{" "}
                        {opportunity.productGoal} · {opportunity.stage}
                        {opportunity.commentCount > 0
                          ? ` · ${opportunity.commentCount} comments`
                          : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-typography-secondary text-xs">
              After merging, the survivor carries the combined{" "}
              <span className="font-mono">{combinedScore}</span> coins.
            </p>
          </section>

          <TextArea
            id="merge-description"
            labelText="Description of the surviving opportunity"
            rows={3}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={event => setDescription(event.target.value)}
          />

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
              {isLoading ? "Merging…" : `Merge ${sources.length + 1} into 1`}
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
