import React, { useEffect, useState } from "react";

import { Link } from "@icons";
import { toast } from "sonner";

import { Select, SelectItem, TextArea, SkeletonText } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapCommentMutation,
  useGetRoadmapCommentsQuery,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapOwnersQuery,
  useUpdateRoadmapOpportunityMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { ROUTES } from "@constants";
import { RoadmapOpportunityStage, RoadmapTaxonomyItem } from "@types";

const PRD_MAX = 20000;
const COMMENT_MAX = 500;

const STAGES = Object.values(RoadmapOpportunityStage);
const STAGE_LABEL: Record<string, string> = {
  new: "New",
  prioritised: "Prioritised",
  under_development: "In development",
  released: "Released",
  archived: "Archived",
};

interface OpportunityDrawerProps {
  opportunityId: string;
  goals: RoadmapTaxonomyItem[];
  canVote: boolean;
  canManage: boolean;
  onClose: () => void;
}

/**
 * Detail view for one opportunity, opened by `?opportunity=<id>`.
 *
 * This REPLACES the source's /opportunity/[id] page, which was ~180 lines of duplicated
 * read-only markup with its own injected stylesheet. A deep-linkable query param buys the same
 * shareable-link capability without a second rendering of every field, and it composes with the
 * rest of the page's URL state.
 *
 * It fetches by id rather than reading the list cache, because the row may not be on the
 * current page of results — which is exactly the case a share link hits.
 *
 * EDITING is gated on `canManage`. Note that means the AUTHOR cannot fix their own typo unless
 * they also hold EDIT — faithful to the source, where RLS made UPDATE admin-only. Flagged for
 * review rather than silently changed.
 *
 * Saving is EXPLICIT. The source autosaved on a 400ms debounce whose effect depended on the
 * `opp` object identity, so every realtime reload re-armed the timer — on a busy board that can
 * loop.
 */
export const OpportunityDrawer: React.FC<OpportunityDrawerProps> = ({
  opportunityId,
  goals,
  canVote,
  canManage,
  onClose,
}) => {
  const { data: opportunity, isLoading, isError } = useGetRoadmapOpportunityQuery(opportunityId);
  const { data: owners } = useGetRoadmapOwnersQuery();
  const { data: comments } = useGetRoadmapCommentsQuery(opportunityId);
  const [updateOpportunity, { isLoading: isSaving }] = useUpdateRoadmapOpportunityMutation();
  const [createComment, { isLoading: isCommenting }] = useCreateRoadmapCommentMutation();

  const [draft, setDraft] = useState({
    description: "",
    stage: RoadmapOpportunityStage.NEW as RoadmapOpportunityStage,
    productGoal: "",
    owner: "",
    prd: "",
  });
  const [commentBody, setCommentBody] = useState("");

  useEffect(() => {
    if (!opportunity) return;
    setDraft({
      description: opportunity.description,
      stage: opportunity.stage,
      productGoal: opportunity.productGoal,
      owner: opportunity.owner ?? "",
      prd: opportunity.prd ?? "",
    });
  }, [opportunity]);

  // A deleted or unknown id should not leave an empty drawer stuck open.
  useEffect(() => {
    if (isError) {
      toast.error("That opportunity no longer exists.");
      onClose();
    }
  }, [isError, onClose]);

  const isDirty =
    !!opportunity &&
    (draft.description !== opportunity.description ||
      draft.stage !== opportunity.stage ||
      draft.productGoal !== opportunity.productGoal ||
      draft.owner !== (opportunity.owner ?? "") ||
      draft.prd !== (opportunity.prd ?? ""));

  const save = async () => {
    try {
      await updateOpportunity({
        id: opportunityId,
        body: {
          description: draft.description.trim(),
          stage: draft.stage,
          productGoal: draft.productGoal,
          owner: draft.owner || null,
          prd: draft.prd || null,
        },
      }).unwrap();
      toast.success("Saved.");
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not save.";
      toast.error(message);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}${ROUTES.PRODUCT_ROADMAP}?opportunity=${opportunityId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const addComment = async () => {
    const body = commentBody.trim();
    if (!body) return;
    try {
      await createComment({ opportunityId, body }).unwrap();
      setCommentBody("");
    } catch {
      toast.error("Could not post that comment.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      {/* `relative` so Carbon dropdown internals stay inside this scroll container. */}
      <aside
        className="bg-white relative h-full w-[38rem] max-w-full overflow-y-auto"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-border-light flex items-center justify-between border-b p-4">
          <h2 className="text-typography-primary text-lg">Opportunity</h2>
          <div className="flex gap-2">
            <Button variant={ButtonVariant.TEXT} onClick={copyLink}>
              <Link size={16} /> Copy link
            </Button>
            <Button variant={ButtonVariant.TEXT} onClick={onClose}>
              Close
            </Button>
          </div>
        </header>

        {isLoading || !opportunity ? (
          <div className="p-4">
            <SkeletonText paragraph lineCount={6} />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-6">
              <div>
                <div className="text-typography-secondary text-xs uppercase">Priority</div>
                <div className="font-mono tabular-nums text-typography-primary text-2xl">
                  {opportunity.priorityScore}
                </div>
              </div>
              <div>
                <div className="text-typography-secondary text-xs uppercase">Your coins</div>
                <div className="font-mono tabular-nums text-typography-primary text-2xl">
                  {opportunity.myCoins}
                </div>
              </div>
              <div>
                <div className="text-typography-secondary text-xs uppercase">Filed by</div>
                <div className="text-typography-primary text-sm">
                  {opportunity.creator?.name || opportunity.creator?.email || "Unknown user"}
                </div>
              </div>
            </div>

            <TextArea
              id="drawer-description"
              labelText="Description"
              rows={4}
              value={draft.description}
              readOnly={!canManage}
              maxLength={1000}
              onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))}
            />

            <div className="flex gap-3">
              <Select
                id="drawer-stage"
                labelText="Stage"
                value={draft.stage}
                disabled={!canManage}
                onChange={event =>
                  setDraft(prev => ({
                    ...prev,
                    stage: event.target.value as RoadmapOpportunityStage,
                  }))
                }
              >
                {STAGES.map(stage => (
                  <SelectItem key={stage} value={stage} text={STAGE_LABEL[stage]} />
                ))}
              </Select>

              <Select
                id="drawer-goal"
                labelText="Product goal"
                value={draft.productGoal}
                disabled={!canManage}
                onChange={event => setDraft(prev => ({ ...prev, productGoal: event.target.value }))}
              >
                {goals.map(goal => (
                  <SelectItem key={goal.id} value={goal.name} text={goal.name} />
                ))}
              </Select>

              <Select
                id="drawer-owner"
                labelText="Owner"
                value={draft.owner}
                disabled={!canManage}
                onChange={event => setDraft(prev => ({ ...prev, owner: event.target.value }))}
              >
                <SelectItem value="" text="Unassigned" />
                {(owners ?? []).map(owner => (
                  <SelectItem key={owner.id} value={owner.name} text={owner.name} />
                ))}
              </Select>
            </div>

            {/* PRD stays PLAIN TEXT / markdown, not TipTap HTML. The AI flows generate this kind
                of field as plain text, so HTML would force a lossy markdown↔HTML round trip on
                the most-used path — and markdown→HTML later needs no data migration, whereas the
                reverse is lossy. */}
            <TextArea
              id="drawer-prd"
              labelText="PRD (markdown)"
              rows={8}
              value={draft.prd}
              readOnly={!canManage}
              maxLength={PRD_MAX}
              placeholder={canManage ? "Optional long-form detail." : ""}
              onChange={event => setDraft(prev => ({ ...prev, prd: event.target.value }))}
              className="font-mono"
            />

            {canManage && (
              <div className="flex justify-end">
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={save}
                  disabled={!isDirty || isSaving}
                >
                  {isSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}

            <section className="border-border-light border-t pt-4">
              <h3 className="text-typography-primary mb-2 text-sm">
                Comments ({comments?.length ?? 0})
              </h3>
              <ul className="mb-3 flex flex-col gap-3">
                {(comments ?? []).map(comment => (
                  <li key={comment.id} className="text-sm">
                    <div className="text-typography-primary whitespace-pre-wrap">
                      {comment.body}
                    </div>
                    <div className="text-typography-secondary font-mono text-xs">
                      {new Date(comment.createdAt).toISOString().slice(0, 16).replace("T", " ")}
                    </div>
                  </li>
                ))}
              </ul>

              {canVote && (
                <div className="flex flex-col gap-2">
                  <TextArea
                    id="drawer-comment"
                    labelText="Add a comment"
                    rows={2}
                    value={commentBody}
                    maxLength={COMMENT_MAX}
                    maxCount={COMMENT_MAX}
                    enableCounter
                    onChange={event => setCommentBody(event.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      variant={ButtonVariant.SECONDARY}
                      onClick={addComment}
                      disabled={!commentBody.trim() || isCommenting}
                    >
                      {isCommenting ? "Posting…" : "Post comment"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
};
