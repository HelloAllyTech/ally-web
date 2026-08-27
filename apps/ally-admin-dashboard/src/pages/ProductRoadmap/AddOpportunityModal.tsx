import React, { useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import { Select, SelectItem, TextArea, ComposedModal, ModalBody } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapOpportunityMutation,
  useRoadmapAiDuplicatesMutation,
  useRoadmapAiEnhanceMutation,
  useRoadmapAiReviewMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapDuplicateMatch, RoadmapOpportunityType, RoadmapTaxonomyItem } from "@types";

const DESCRIPTION_MAX = 1000;
const DUPLICATE_DEBOUNCE_MS = 700;

interface AddOpportunityModalProps {
  goals: RoadmapTaxonomyItem[];
  onClose: () => void;
  /** "Upvote this instead" — closes and opens the existing opportunity's drawer. */
  onOpenExisting: (id: string) => void;
}

/**
 * File a new opportunity — an IDEA, only. Bugs are reported from the page header's "Report a
 * bug" button and are triaged in Bug Hunter; see ReportBugModal for why the two are separate
 * buttons rather than one modal with a Type dropdown.
 *
 * Carries the three AI assists from the source: a duplicate check while you type, a review
 * pass, and a rewrite. All three degrade silently. Duplicate detection in particular answers
 * `{matches: []}` when ally-ai is unreachable, so a dead vector service can never block
 * someone filing an idea.
 */
export const AddOpportunityModal: React.FC<AddOpportunityModalProps> = ({
  goals,
  onClose,
  onOpenExisting,
}) => {
  const [description, setDescription] = useState("");
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
        // Not a state value any more: this modal files ideas, full stop. Still sent
        // explicitly rather than left to a server default, so the row's type is decided
        // here where the decision is visible rather than in a DTO fallback.
        type: RoadmapOpportunityType.IDEA,
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
    <ComposedModal open onClose={onClose} size="lg">
      <ModalBody>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-typography-primary text-xl">New opportunity</h2>
            {/* Signposts the branch this modal no longer offers. Whoever opened it to file a
                bug used to find that option in a Type dropdown right here, and removing the
                dropdown without saying where bugs went would leave them re-describing one as
                an "idea" — which is exactly the row Bug Hunter would then never see. */}
            <p className="text-typography-secondary mt-1 text-sm">
              Ideas and problems worth prioritising. Something broken? Close this and use Report a
              bug — those go to Bug Hunter.
            </p>
          </div>

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

          {/* The Type dropdown that used to sit here (Idea / Bug) is gone. Everything this
              modal does — a product goal, the duplicate check against other opportunities,
              and the voting the filed row lands in — applies to an idea and to nothing
              else, and a bug picked from that dropdown quietly left the board entirely for
              Bug Hunter. "Report a bug" in the page header is the whole other branch, so the
              choice is made by which button you press rather than by a field you might not
              notice you had changed. */}
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
                      Upvote this instead →
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
      </ModalBody>
    </ComposedModal>
  );
};
