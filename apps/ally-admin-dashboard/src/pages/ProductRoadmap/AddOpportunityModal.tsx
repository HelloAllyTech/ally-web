import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Select, SelectItem, TextArea } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapOpportunityMutation,
  useRoadmapAiDuplicatesMutation,
  useRoadmapAiEnhanceMutation,
  useRoadmapAiReviewMutation,
} from "@api";
import { Button, PopupWrapper } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapDuplicateMatch, RoadmapOpportunityType, RoadmapTaxonomyItem } from "@types";

const DESCRIPTION_MAX = 1000;
const DUPLICATE_DEBOUNCE_MS = 700;

interface AddOpportunityModalProps {
  goals: RoadmapTaxonomyItem[];
  onClose: () => void;
  /** "Allocate coins to this instead" — closes and opens the existing opportunity's drawer. */
  onOpenExisting: (id: string) => void;
}

/**
 * File a new opportunity, with the three AI assists from the source: a duplicate check while
 * you type, a review pass, and a rewrite.
 *
 * All three degrade silently. Duplicate detection in particular answers `{matches: []}` when
 * ally-ai is unreachable, so a dead vector service can never block someone filing an idea.
 */
export const AddOpportunityModal: React.FC<AddOpportunityModalProps> = ({
  goals,
  onClose,
  onOpenExisting,
}) => {
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RoadmapOpportunityType>(RoadmapOpportunityType.IDEA);
  const [productGoal, setProductGoal] = useState(goals[0]?.name ?? "");
  const [duplicates, setDuplicates] = useState<RoadmapDuplicateMatch[]>([]);
  const [suggestions, setSuggestions] = useState<{ issue: string; tip: string }[]>([]);

  const [createOpportunity, { isLoading: isSaving }] = useCreateRoadmapOpportunityMutation();
  const [checkDuplicates, { isLoading: isCheckingDuplicates }] = useRoadmapAiDuplicatesMutation();
  const [review, { isLoading: isReviewing }] = useRoadmapAiReviewMutation();
  const [enhance, { isLoading: isEnhancing }] = useRoadmapAiEnhanceMutation();

  /**
   * Request-id guard against a stale duplicate response overwriting a newer one. The source
   * used the same counter (dupRequestIdRef) — without it, typing fast makes an older, slower
   * response win and the panel shows duplicates for text the user has already replaced.
   */
  const requestId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const trimmed = description.trim();
    if (trimmed.length < 15) {
      setDuplicates([]);
      return undefined;
    }
    debounce.current = setTimeout(async () => {
      const id = ++requestId.current;
      try {
        const result = await checkDuplicates({
          description: trimmed,
          productGoal: productGoal || undefined,
        }).unwrap();
        if (id === requestId.current) setDuplicates(result.matches ?? []);
      } catch {
        // Best-effort by contract: a failed duplicate check must not interrupt filing.
        if (id === requestId.current) setDuplicates([]);
      }
    }, DUPLICATE_DEBOUNCE_MS);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [description, productGoal, checkDuplicates]);

  const runReview = async () => {
    try {
      const result = await review({ description: description.trim() }).unwrap();
      setSuggestions(result.suggestions ?? []);
      if ((result.suggestions ?? []).length === 0) {
        toast.success("Nothing to flag — this reads well.");
      }
    } catch {
      toast.error("Could not run the review right now.");
    }
  };

  const runEnhance = async () => {
    try {
      const result = await enhance({ description: description.trim() }).unwrap();
      if (result.enhanced && result.enhanced !== description) {
        setDescription(result.enhanced);
        toast.success("Rewritten — edit freely before saving.");
      }
    } catch {
      toast.error("Could not rewrite this right now.");
    }
  };

  const save = async () => {
    try {
      await createOpportunity({
        description: description.trim(),
        type,
        productGoal,
      }).unwrap();
      toast.success("Opportunity filed.");
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not file this opportunity.";
      toast.error(message);
    }
  };

  const canSave =
    description.trim().length > 0 &&
    description.length <= DESCRIPTION_MAX &&
    !!productGoal &&
    !isSaving;

  return (
    <PopupWrapper isOpen onClose={onClose}>
      <div className="flex w-[42rem] max-w-full flex-col gap-4 p-6">
        <h2 className="text-typography-primary text-xl">New opportunity</h2>

        <TextArea
          id="roadmap-description"
          labelText="What is the problem or idea?"
          rows={5}
          value={description}
          maxCount={DESCRIPTION_MAX}
          enableCounter
          maxLength={DESCRIPTION_MAX}
          onChange={event => setDescription(event.target.value)}
          placeholder="Describe the problem, who hits it, and what it costs them."
        />

        <div className="flex gap-3">
          <Select
            id="roadmap-type"
            labelText="Type"
            value={type}
            onChange={event => setType(event.target.value as RoadmapOpportunityType)}
          >
            <SelectItem value={RoadmapOpportunityType.IDEA} text="Idea" />
            <SelectItem value={RoadmapOpportunityType.BUG} text="Bug" />
          </Select>

          <Select
            id="roadmap-goal"
            labelText="Product goal"
            value={productGoal}
            onChange={event => setProductGoal(event.target.value)}
          >
            {goals.map(goal => (
              <SelectItem key={goal.id} value={goal.name} text={goal.name} />
            ))}
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={runReview}
            disabled={!description.trim() || isReviewing}
          >
            {isReviewing ? "Reviewing…" : "Review"}
          </Button>
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={runEnhance}
            disabled={!description.trim() || isEnhancing}
          >
            {isEnhancing ? "Rewriting…" : "Improve wording"}
          </Button>
          {isCheckingDuplicates && (
            <span className="text-typography-secondary self-center text-xs">
              checking for duplicates…
            </span>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="border border-border-light p-3">
            <div className="text-typography-primary mb-2 text-sm">Suggestions</div>
            <ul className="flex flex-col gap-2">
              {suggestions.map(suggestion => (
                <li key={suggestion.issue} className="text-sm">
                  <span className="text-typography-primary">{suggestion.issue}</span>
                  <span className="text-typography-secondary"> — {suggestion.tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="border border-primary-500 p-3">
            <div className="text-typography-primary mb-2 text-sm">This may already exist</div>
            <ul className="flex flex-col gap-2">
              {duplicates.map(match => (
                <li key={match.id} className="text-sm">
                  <div className="text-typography-primary">{match.description}</div>
                  <div className="text-typography-secondary text-xs">{match.reason}</div>
                  <Button variant={ButtonVariant.TEXT} onClick={() => onOpenExisting(match.id)}>
                    Allocate coins to this instead →
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
            Cancel
          </Button>
          <Button variant={ButtonVariant.PRIMARY} onClick={save} disabled={!canSave}>
            {isSaving ? "Filing…" : "File opportunity"}
          </Button>
        </div>
      </div>
    </PopupWrapper>
  );
};
