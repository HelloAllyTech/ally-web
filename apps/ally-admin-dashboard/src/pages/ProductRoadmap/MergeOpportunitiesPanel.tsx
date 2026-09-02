import React, { useMemo, useState } from "react";

import { Add, Close, Search } from "@icons";
import { toast } from "sonner";

import { TextArea } from "@ally-ui-mono/ui-shared";
import { useGetRoadmapOpportunitiesQuery, useMergeRoadmapOpportunitiesMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapOpportunity } from "@types";

const DESCRIPTION_MAX = 1000;
/** Enough to find something by code or a distinctive phrase without paging. */
const RESULT_LIMIT = 20;

/** The default primary: whichever pick people have actually voted on and shared the most. */
const highestScoring = (list: RoadmapOpportunity[]) =>
  list.reduce((best, o) => (o.priorityScore > best.priorityScore ? o : best), list[0]);

interface MergeOpportunitiesPanelProps {
  /** Opens the merged opportunity's own drawer, where every remaining setting already lives. */
  onMerged: (primaryId: string) => void;
}

/**
 * Fold several opportunities into one — search, pick, merge.
 *
 * ## Why this replaced multi-select
 *
 * Merging used to mean ticking checkboxes in the table. That only ever worked for duplicates
 * that happened to be on the same page of 50, sorted the same way — and duplicates are precisely
 * the rows you have not found yet. Searching for each one in turn has no such limit, and it works
 * from any layout rather than only from the table.
 *
 * ## What merging actually does
 *
 * Votes roll up per (user, period): if two people each voted on two duplicates, their monthly
 * totals are preserved exactly rather than double-counted or dropped. Comments move to the
 * survivor. The sources are SOFT-deleted, so anything holding their ids still resolves.
 *
 * ## The primary is a real choice, not a detail
 *
 * The survivor keeps its OPP code, its comments and its shareable link, and every source loses
 * theirs. So the primary is selectable rather than implied, and defaults to the highest-scoring
 * pick — almost always the one people have been voting on and the one whose link has been shared.
 *
 * ## Settings live in the opportunity's own drawer
 *
 * This form asks for the merged DESCRIPTION only, then hands off to `onMerged`, which opens the
 * merged opportunity. Stage, product goal, owner, planned month and PRD are all editable there
 * already; rebuilding them here would be a second copy of that editor, free to drift.
 *
 * ## Chrome belongs to the drawer
 *
 * This was its own right-hand drawer, opened from a merge glyph in the header. It is now a panel
 * inside RoadmapSettingsDrawer, so the overlay, the width, the heading and the Close button live
 * there — one dismiss behaviour for all three panels rather than three that can drift. Hence no
 * `onClose`: the only thing this panel closes itself for is a completed merge, which `onMerged`
 * already covers.
 */
export const MergeOpportunitiesPanel: React.FC<MergeOpportunitiesPanelProps> = ({ onMerged }) => {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<RoadmapOpportunity[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  /** Once the manager picks a radio button by hand, stop overriding their choice on later adds. */
  const [primaryManuallySet, setPrimaryManuallySet] = useState(false);
  /** Null until the user edits it, so the prefill can follow a changed primary. */
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(true);

  const [merge, { isLoading }] = useMergeRoadmapOpportunitiesMutation();

  const trimmed = search.trim();
  const { data, isFetching } = useGetRoadmapOpportunitiesQuery(
    { search: trimmed, limit: RESULT_LIMIT, offset: 0, sortBy: "priority", order: "DESC" },
    // No query until something is typed: an unfiltered list of 400 is not a search result, and
    // showing one invites picking whatever happens to be at the top.
    { skip: trimmed.length < 2 },
  );

  const pickedIds = useMemo(() => new Set(picked.map(o => o.id)), [picked]);
  const results = (data?.items ?? []).filter(o => !pickedIds.has(o.id));

  const primary = picked.find(o => o.id === primaryId) ?? picked[0] ?? null;
  const description = descriptionOverride ?? primary?.description ?? "";
  const combinedScore = picked.reduce((sum, o) => sum + o.priorityScore, 0);
  const canMerge = picked.length >= 2 && !!primary && !!description.trim();

  const add = (opportunity: RoadmapOpportunity) => {
    setPicked(current => {
      const next = [...current, opportunity];
      // Re-evaluate the highest-scoring pick on every add, unless the manager already made a
      // deliberate choice via the radio button.
      if (!primaryManuallySet) setPrimaryId(highestScoring(next).id);
      return next;
    });
    setSearch("");
    setIsSearchOpen(false);
  };

  const remove = (id: string) => {
    const next = picked.filter(o => o.id !== id);
    setPicked(next);
    if (primaryId === id) {
      // The manual choice is gone with it; fall back to the highest-scoring survivor.
      setPrimaryManuallySet(false);
      setPrimaryId(next.length > 0 ? highestScoring(next).id : null);
      // Drop a prefilled description that came from the primary being removed; a hand-edited one
      // is the user's and stays.
      setDescriptionOverride(current => current);
    }
  };

  const submit = async () => {
    if (!canMerge || !primary) return;
    try {
      await merge({
        primaryId: primary.id,
        sourceIds: picked.filter(o => o.id !== primary.id).map(o => o.id),
        description: description.trim(),
      }).unwrap();
      toast.success(`Merged ${picked.length} opportunities into ${primary.code}.`);
      onMerged(primary.id);
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not merge those.";
      toast.error(message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-typography-secondary text-sm">
        Fold duplicate opportunities into one. Votes roll up per person per month, and the survivor
        you pick keeps its code, its comments and its shared links.
      </p>

      {/* Picked list first: it is the thing being built, and putting the search above it would
          push it further down the panel with every addition. */}
      {picked.length > 0 && (
        <ol className="flex flex-col gap-2">
          {picked.map(opportunity => {
            const isPrimary = primary?.id === opportunity.id;
            return (
              <li
                key={opportunity.id}
                className={`border-border-light flex items-start gap-2 border p-2 ${
                  isPrimary ? "border-primary-500" : ""
                }`}
              >
                <input
                  type="radio"
                  name="merge-primary"
                  checked={isPrimary}
                  onChange={() => {
                    setPrimaryId(opportunity.id);
                    setPrimaryManuallySet(true);
                    // Re-prefill from the new primary unless the text was hand-edited.
                    setDescriptionOverride(current => current);
                  }}
                  aria-label={`Keep ${opportunity.code} as the surviving opportunity`}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-typography-secondary flex items-center gap-2 text-xs tabular-nums">
                    <span>{opportunity.code}</span>
                    <span>{opportunity.priorityScore} votes</span>
                    {isPrimary && <span className="text-primary-500">keeps code & comments</span>}
                  </div>
                  <p className="text-typography-primary line-clamp-2 text-sm">
                    {opportunity.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(opportunity.id)}
                  aria-label={`Remove ${opportunity.code} from this merge`}
                  className="text-typography-secondary hover:text-typography-primary shrink-0"
                >
                  <Close size={16} />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {isSearchOpen ? (
        <div className="flex flex-col gap-2">
          <label className="text-typography-secondary flex items-center gap-2 text-sm">
            <Search size={16} />
            <input
              autoFocus
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search by description or code"
              aria-label="Search opportunities to merge"
              className="border-border-light w-full border px-2 py-1.5 text-base outline-none"
            />
          </label>

          {trimmed.length >= 2 && (
            <ul className="border-border-light max-h-64 divide-y overflow-y-auto border">
              {isFetching && results.length === 0 && (
                <li className="text-typography-secondary p-2 text-sm">Searching…</li>
              )}
              {!isFetching && results.length === 0 && (
                <li className="text-typography-secondary p-2 text-sm">
                  Nothing matches “{trimmed}”.
                </li>
              )}
              {results.map(opportunity => (
                <li key={opportunity.id}>
                  <button
                    type="button"
                    onClick={() => add(opportunity)}
                    className="hover:bg-background-secondary w-full p-2 text-left"
                  >
                    <span className="text-typography-secondary text-xs tabular-nums">
                      {opportunity.code} · {opportunity.priorityScore} votes
                    </span>
                    <span className="text-typography-primary line-clamp-2 block text-sm">
                      {opportunity.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          <Button variant={ButtonVariant.SECONDARY} onClick={() => setIsSearchOpen(true)}>
            <Add size={16} /> Add another
          </Button>
        </div>
      )}

      {picked.length >= 2 && (
        <>
          {/* Prefilled from the primary rather than blank: the survivor's wording is usually
                  the one to keep, and retyping it is the common case made expensive. */}
          <TextArea
            id="merge-description"
            labelText="Description of the merged opportunity"
            rows={4}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={event => setDescriptionOverride(event.target.value)}
          />

          <p className="text-typography-secondary text-sm">
            {picked.length} opportunities → 1. Votes roll up per person per month, so the merged
            opportunity ends on <span className="tabular-nums">{combinedScore}</span> votes.
            Comments move across; the others are removed from the board.
          </p>
        </>
      )}

      <div className="flex items-center gap-2">
        <Button variant={ButtonVariant.PRIMARY} disabled={!canMerge || isLoading} onClick={submit}>
          {isLoading ? "Merging…" : `Merge ${picked.length || ""}`.trim()}
        </Button>
        {picked.length < 2 && (
          <span className="text-typography-secondary text-sm">Pick at least two to merge.</span>
        )}
      </div>
    </div>
  );
};
