import React, { useMemo, useState } from "react";

import { Search } from "@icons";
import { toast } from "sonner";

import { NumberInput, TextArea } from "@ally-ui-mono/ui-shared";
import { useGetRoadmapOpportunitiesQuery, useSplitRoadmapOpportunityMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunity } from "@types";

import { largestRemainderPreview } from "./utils/split";
import { isReshapeableStage, reshapeBlockedReason } from "./utils/stages";

const DESCRIPTION_MAX = 1000;
/** Enough to find something by code or a distinctive phrase without paging. Matches merge. */
const RESULT_LIMIT = 20;

interface DraftPart {
  /** Present on exactly one part — the original, which is KEPT and reworded. */
  id?: string;
  description: string;
  weight: number;
}

interface SplitOpportunitiesPanelProps {
  /** Opens the surviving original's own drawer once the split lands. */
  onSplit: (originalId: string) => void;
}

/**
 * Split one opportunity into parts, redistributing every contributor's votes by weight.
 *
 * ## Search-and-pick, because the row action is gone
 *
 * This used to be a modal opened from a Split button in the opportunities table, so it arrived
 * already knowing its subject. That column is removed — splitting is an admin job, and it now
 * lives beside merge in RoadmapSettingsDrawer rather than as a permanent column on a table people
 * read every day. So the panel asks WHICH opportunity first, the same way merge does, which also
 * means it works from any layout rather than only from the table.
 *
 * ## Exactly one part carries the original id
 *
 * That part is kept and reworded rather than recreated, so its comments, its history and any
 * `?opportunity=<id>` link people have shared all survive — the backend enforces this and rejects
 * a payload where zero or two parts claim it.
 *
 * The preview under the weights runs the SAME largest-remainder (Hamilton) arithmetic the backend
 * uses, so an admin can see exactly how this opportunity's current score will divide before
 * committing. Votes are conserved exactly: the parts always sum to the original.
 */
export const SplitOpportunitiesPanel: React.FC<SplitOpportunitiesPanelProps> = ({ onSplit }) => {
  const [target, setTarget] = useState<RoadmapOpportunity | null>(null);

  return target ? (
    // KEYED BY ID so picking a different opportunity remounts the form. The draft parts are
    // seeded from the subject in a useState initialiser, which would otherwise keep the first
    // opportunity's description and weights after a change of subject.
    <SplitForm
      key={target.id}
      opportunity={target}
      onSplit={onSplit}
      onBack={() => setTarget(null)}
    />
  ) : (
    <SplitTargetPicker onPick={setTarget} />
  );
};

/** Find the one opportunity to split. */
const SplitTargetPicker: React.FC<{ onPick: (opportunity: RoadmapOpportunity) => void }> = ({
  onPick,
}) => {
  const [search, setSearch] = useState("");
  const trimmed = search.trim();

  const { data, isFetching } = useGetRoadmapOpportunitiesQuery(
    { search: trimmed, limit: RESULT_LIMIT, offset: 0, sortBy: "priority", order: "DESC" },
    // No query until something is typed — same reasoning as merge: an unfiltered list of 400 is
    // not a search result, and showing one invites splitting whatever happens to be at the top.
    { skip: trimmed.length < 2 },
  );

  const results = data?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-typography-secondary text-sm">
        Split one opportunity into parts. Everyone&apos;s votes are redistributed across the parts
        by weight, and the parts always add up to the original.
      </p>

      <label className="text-typography-secondary flex items-center gap-2 text-sm">
        <Search size={16} />
        <input
          autoFocus
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search by description or code"
          aria-label="Search opportunities to split"
          className="border-border-light w-full border px-2 py-1.5 text-base outline-none"
        />
      </label>

      {trimmed.length >= 2 && (
        <ul className="border-border-light max-h-80 divide-y overflow-y-auto border">
          {isFetching && results.length === 0 && (
            <li className="text-typography-secondary p-2 text-sm">Searching…</li>
          )}
          {!isFetching && results.length === 0 && (
            <li className="text-typography-secondary p-2 text-sm">Nothing matches “{trimmed}”.</li>
          )}
          {results.map(opportunity => {
            const canReshape = isReshapeableStage(opportunity.stage);
            return (
              <li key={opportunity.id}>
                {/* DISABLED WITH THE REASON ON IT, not filtered out of the results — the same
                    call the removed table column made. A released opportunity that simply never
                    appears in the search leaves the admin wondering whether they mistyped. */}
                <button
                  type="button"
                  disabled={!canReshape}
                  title={canReshape ? undefined : reshapeBlockedReason(opportunity.stage)}
                  onClick={() => onPick(opportunity)}
                  className={`w-full p-2 text-left ${
                    canReshape ? "hover:bg-background-secondary" : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <span className="text-typography-secondary text-xs tabular-nums">
                    {opportunity.code} · {opportunity.priorityScore} votes
                    {canReshape ? "" : " · cannot be split"}
                  </span>
                  <span className="text-typography-primary line-clamp-2 block text-sm">
                    {opportunity.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

/** The weights-and-descriptions form, once a subject is chosen. */
const SplitForm: React.FC<{
  opportunity: RoadmapOpportunity;
  onSplit: (originalId: string) => void;
  onBack: () => void;
}> = ({ opportunity, onSplit, onBack }) => {
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
      onSplit(opportunity.id);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not split this.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Which opportunity is being split, and the way back — the panel no longer arrives with a
          subject, so naming it is the difference between this form and a blank one. */}
      <div className="border-border-light flex items-start justify-between gap-2 border p-2">
        <div className="min-w-0">
          <span className="text-typography-secondary text-xs tabular-nums">
            {opportunity.code} · {opportunity.priorityScore} votes
          </span>
          <span className="text-typography-primary line-clamp-2 block text-sm">
            {opportunity.description}
          </span>
        </div>
        <Button variant={ButtonVariant.TEXT} onClick={onBack}>
          Change
        </Button>
      </div>

      <p className="text-typography-secondary text-sm">
        Everyone&apos;s votes are redistributed across the parts by weight. Nothing is lost: the
        parts always add up to the original {opportunity.priorityScore}.
      </p>

      <ul className="flex flex-col gap-3">
        {parts.map((part, index) => (
          <li key={part.id ?? `new-${index}`} className="border-border-light border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-typography-secondary text-xs uppercase tracking-wide">
                {part.id ? "Original — keeps its comments and shared links" : `Part ${index + 1}`}
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

      {/* No Cancel beside it — the drawer's Close is the one way out, so this row holds only the
          action. */}
      <div className="flex justify-end">
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={submit}
          disabled={!!validationError || isLoading}
        >
          {isLoading ? "Splitting…" : `Split into ${parts.length}`}
        </Button>
      </div>
    </div>
  );
};
