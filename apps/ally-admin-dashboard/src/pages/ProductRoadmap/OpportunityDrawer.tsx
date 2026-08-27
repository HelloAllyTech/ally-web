import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Link, TooltipIcon } from "@icons";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Select, SelectItem, TextArea, SkeletonText, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapCommentMutation,
  useGetRoadmapCommentsQuery,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapEligibleOwnersQuery,
  useGetBugFindingByReportedBugQuery,
  useDeleteRoadmapOpportunityMutation,
  useUpdateRoadmapOpportunityMutation,
  useOpenRoadmapBuilderSessionMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { FeatureToggleKey, ROUTES } from "@constants";
import { useUser } from "@hooks";
import {
  RoadmapBuilderSessionHandle,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapTaxonomyItem,
} from "@types";
import { hasFeature } from "@utils";

import { monthKeyOf, monthLabel, shiftMonthKey } from "./utils/monthBoard";
import { STAGE_LABEL } from "./utils/stages";

const PRD_MAX = 20000;
const COMMENT_MAX = 500;

const STAGES = Object.values(RoadmapOpportunityStage);

/**
 * Months offered in the planned-month picker: two back through twelve forward.
 *
 * Wider than the board's default window on purpose — the board is for seeing a plan, this is for
 * making one, and being unable to park something in "next year" from the drawer would send people
 * back to dragging across a window they have to step twice to reach.
 */
const PLANNED_MONTHS_BACK = 2;
const PLANNED_MONTHS_FORWARD = 12;

interface OpportunityDrawerProps {
  opportunityId: string;
  /**
   * Hands the opened Builder session up to the page, which owns the drawer that renders it.
   *
   * Owned there rather than here so the agent drawer is a sibling of this one, not a child: the
   * opportunity drawer closes on backdrop click and on save, and a Builder conversation must not
   * be torn down by either.
   */
  onOpenBuilderSession: (handle: RoadmapBuilderSessionHandle) => void;
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
  onOpenBuilderSession,
  goals,
  canVote,
  canManage,
  onClose,
}) => {
  const navigate = useNavigate();
  const { data: opportunity, isLoading, isError } = useGetRoadmapOpportunityQuery(opportunityId);
  const { data: eligibleOwners } = useGetRoadmapEligibleOwnersQuery();
  const { data: comments } = useGetRoadmapCommentsQuery(opportunityId);
  const [updateOpportunity, { isLoading: isSaving }] = useUpdateRoadmapOpportunityMutation();
  const [createComment, { isLoading: isCommenting }] = useCreateRoadmapCommentMutation();
  const [deleteOpportunity, { isLoading: isDeleting }] = useDeleteRoadmapOpportunityMutation();

  const [draft, setDraft] = useState({
    description: "",
    stage: RoadmapOpportunityStage.NEW as RoadmapOpportunityStage,
    productGoal: "",
    /** "" means unassigned. Holds an Ally user id as a string, since <Select> values are strings. */
    ownerUserId: "",
    prd: "",
    claudePrompt: "",
    /** 'YYYY-MM', or "" for Unscheduled. */
    plannedMonth: "",
  });
  const [commentBody, setCommentBody] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [openBuilderSession, { isLoading: isOpeningBuilder }] =
    useOpenRoadmapBuilderSessionMutation();

  useEffect(() => {
    if (!opportunity) return;
    setDraft({
      description: opportunity.description,
      stage: opportunity.stage,
      productGoal: opportunity.productGoal,
      ownerUserId: opportunity.ownerUserId ? String(opportunity.ownerUserId) : "",
      prd: opportunity.prd ?? "",
      claudePrompt: opportunity.claudePrompt ?? "",
      plannedMonth: opportunity.plannedMonth ?? "",
    });
  }, [opportunity]);

  // A deleted or unknown id should not leave an empty drawer stuck open.
  useEffect(() => {
    if (isError) {
      toast.error("That opportunity no longer exists.");
      onClose();
    }
  }, [isError, onClose]);

  /**
   * Bugs left the roadmap; their links did not.
   *
   * `?opportunity=<id>` links to bugs are in bookmarks, notifications and Slack
   * scrollback. The board no longer lists bugs, but the row is still there and
   * `findOneWithScore` is deliberately NOT filtered server-side precisely so this
   * drawer can recognise one and forward it rather than answer "no longer exists"
   * about a bug that is very much still open.
   *
   * Forwards to the bug's own drawer where a finding exists, and to the bugs
   * table itself where none does — a bug filed before that table existed, or
   * one whose inbox write failed. Landing somewhere true beats landing nowhere.
   *
   * WHICH bugs table depends on the reader. The Bug Hunter tab is the better
   * destination because it is the one that can act, but it is nav-gated on the
   * `bug_hunter` toggle — so for a roadmap viewer without it, forwarding there
   * would replace a stuck drawer with a page they cannot open, which is not an
   * improvement. They go to the roadmap's own read-only Bugs tab instead, which
   * hosts the same drawer under the same `?bug=` param.
   */
  const isBug = opportunity?.type === RoadmapOpportunityType.BUG;
  const { data: bugRef, isFetching: isResolvingBug } = useGetBugFindingByReportedBugQuery(
    opportunityId,
    { skip: !isBug },
  );

  const { features } = useUser();
  const canReachBugHunter = hasFeature(features, FeatureToggleKey.BUG_HUNTER);

  useEffect(() => {
    if (!isBug || isResolvingBug || !bugRef) return;
    const base = canReachBugHunter ? ROUTES.BUG_HUNTER : `${ROUTES.PRODUCT_ROADMAP}?tab=bugs`;
    navigate(
      bugRef.findingId ? `${base}${canReachBugHunter ? "?" : "&"}bug=${bugRef.findingId}` : base,
      { replace: true },
    );
  }, [isBug, isResolvingBug, bugRef, navigate, canReachBugHunter]);

  /**
   * The month options. Computed once per mount rather than per render — a memo keyed on nothing
   * still rebuilds every render, and the list only changes when the calendar month does.
   */
  const plannedMonthOptions = useMemo(() => {
    const current = monthKeyOf(new Date());
    return Array.from(
      { length: PLANNED_MONTHS_BACK + PLANNED_MONTHS_FORWARD + 1 },
      (_unused, index) => shiftMonthKey(current, index - PLANNED_MONTHS_BACK),
    );
  }, []);

  const isDirty =
    !!opportunity &&
    (draft.description !== opportunity.description ||
      draft.stage !== opportunity.stage ||
      draft.productGoal !== opportunity.productGoal ||
      draft.ownerUserId !== (opportunity.ownerUserId ? String(opportunity.ownerUserId) : "") ||
      draft.prd !== (opportunity.prd ?? "") ||
      draft.claudePrompt !== (opportunity.claudePrompt ?? "") ||
      draft.plannedMonth !== (opportunity.plannedMonth ?? ""));

  /**
   * Soft-delete. The backend also returns every contributor's votes to them, soft-deletes the
   * comments, and removes the vector so duplicate detection stops proposing it — so this is not
   * only a visibility change and the confirmation says the part people care about.
   */
  const remove = async () => {
    try {
      await deleteOpportunity(opportunityId).unwrap();
      toast.success("Deleted. Votes returned to whoever cast them.");
      onClose();
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ??
        "Could not delete that opportunity.";
      toast.error(message);
    }
  };

  /**
   * Open (or resume) the agent for this opportunity.
   *
   * Deliberately does NOT save the drawer's unsaved edits first. The brief is built server-side
   * from the STORED description and PRD, so what the agent receives is what the roadmap actually
   * says — and a button that silently commits someone's half-typed edits as a side effect of
   * opening a panel is the kind of thing nobody expects twice. The hint below the button says
   * where the text comes from.
   */
  const handleOpenBuilder = useCallback(async () => {
    try {
      const handle = await openBuilderSession({ opportunityId }).unwrap();
      onOpenBuilderSession(handle);
    } catch (error) {
      // 403 here is its own thing: the caller manages the roadmap but has no Builder access,
      // which is a grant someone has to make, not a retry.
      const status = (error as { status?: number })?.status;
      toast.error(
        status === 403
          ? "Builder is not enabled for your account. Ask a super admin for Builder access."
          : "Could not open the Builder agent. Try again.",
      );
    }
  }, [onOpenBuilderSession, openBuilderSession, opportunityId]);

  const save = async () => {
    try {
      await updateOpportunity({
        id: opportunityId,
        body: {
          description: draft.description.trim(),
          stage: draft.stage,
          productGoal: draft.productGoal,
          // null un-assigns. The legacy free-text `owner` is no longer writable — an owner must be
          // a super-admin user, and the backend answers 422 for anyone else.
          ownerUserId: draft.ownerUserId ? Number(draft.ownerUserId) : null,
          prd: draft.prd || null,
          claudePrompt: draft.claudePrompt || null,
          // "" is the Unscheduled option, which must send null — sending "" would fail the
          // month-key @Matches with a 400 instead of clearing the plan.
          plannedMonth: draft.plannedMonth || null,
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
          {/* The code sits with the title rather than down among the stats: it is what this
              drawer IS, and it is the thing someone reads out or pastes into the search box.
              Rendered from `opportunity`, not from `draft` — it is server-generated and not
              editable, so it must not follow unsaved edits. */}
          <h2 className="text-typography-primary flex items-baseline gap-2 text-lg">
            Opportunity
            {!!opportunity?.code && (
              <span className="text-typography-secondary text-sm tabular-nums">
                {opportunity.code}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <Button variant={ButtonVariant.TEXT} onClick={copyLink}>
              <Link size={16} /> Copy link
            </Button>
            <Button variant={ButtonVariant.TEXT} onClick={onClose}>
              Close
            </Button>
          </div>
        </header>

        {/* A bug is on its way to Bug Hunter — never show it the roadmap editor,
            not even for the frame between the type arriving and the redirect
            firing. Stage and owner controls on a bug would write to a row no
            board reads, and "Delete" would destroy the record of somebody's
            report. */}
        {isLoading || !opportunity || isBug ? (
          <div className="p-4">
            {isBug ? (
              <p className="text-typography-secondary text-sm">
                Bugs live in Bug Hunter now. Taking you there…
              </p>
            ) : (
              <SkeletonText paragraph lineCount={6} />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-6">
              <div>
                {/* Renamed with the table's columns — the same number called two things on
                    two screens is the confusion the rename set out to remove. */}
                <div className="text-typography-secondary text-xs uppercase">Total votes</div>
                <div className="font-mono tabular-nums text-typography-primary text-2xl">
                  {opportunity.priorityScore}
                </div>
              </div>
              <div>
                <div className="text-typography-secondary text-xs uppercase">Your votes</div>
                <div className="font-mono tabular-nums text-typography-primary text-2xl">
                  {opportunity.myVotes}
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

              {/* Planned month, so something can be scheduled without opening the board and
                  dragging. Locked once shipped: the lane is then the month it actually shipped in,
                  which the backend enforces with a 422 — disabling the control is how that rule
                  becomes visible instead of arriving as a failed save. */}
              <div>
                <div className="flex items-center gap-1">
                  <Select
                    id="drawer-planned-month"
                    labelText="Planned month"
                    value={draft.plannedMonth}
                    disabled={!canManage || opportunity.monthPinned}
                    onChange={event =>
                      setDraft(prev => ({ ...prev, plannedMonth: event.target.value }))
                    }
                  >
                    <SelectItem value="" text="Unscheduled" />
                    {plannedMonthOptions.map(month => (
                      <SelectItem key={month} value={month} text={monthLabel(month)} />
                    ))}
                  </Select>
                  <Tooltip
                    label="Which month you intend to ship this in. Once the stage is Released the card moves to the month it actually shipped, and this stops being editable — so a slipped plan stays visible instead of being overwritten."
                    align="bottom"
                  >
                    <button type="button" className="inline-flex cursor-pointer items-center">
                      <TooltipIcon />
                    </button>
                  </Tooltip>
                </div>
                {opportunity.monthPinned && (
                  <p className="text-typography-secondary mt-1 text-xs">
                    Shipped in {monthLabel(opportunity.effectiveMonth)}
                    {opportunity.plannedMonth &&
                      opportunity.plannedMonth !== opportunity.effectiveMonth &&
                      ` · was planned for ${monthLabel(opportunity.plannedMonth)}`}
                  </p>
                )}
              </div>

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

              {/* Options are Ally SUPER_ADMIN / SUPER_DUPER_ADMIN users, not a hand-maintained list
                  of names. Losing super-admin therefore removes someone from this picker with no
                  separate cleanup step. */}
              <Select
                id="drawer-owner"
                labelText="Owner"
                value={draft.ownerUserId}
                disabled={!canManage}
                onChange={event => setDraft(prev => ({ ...prev, ownerUserId: event.target.value }))}
              >
                <SelectItem value="" text="Unassigned" />
                {(eligibleOwners ?? []).map(owner => (
                  <SelectItem
                    key={owner.id}
                    value={String(owner.id)}
                    text={owner.name || owner.email}
                  />
                ))}
              </Select>
              {/* A migrated row's owner is a plain string with no account behind it. Say so, rather
                  than showing "Unassigned" over a name the board is still displaying and filtering
                  on — that reads as data loss. */}
              {!opportunity.ownerUserId && opportunity.owner && (
                <p className="text-typography-secondary text-xs">
                  Currently <strong>{opportunity.owner}</strong>, migrated from the old roadmap and
                  not yet linked to an Ally account. Pick a super-admin above to link it.
                </p>
              )}
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

            {/*
              REPLACED the "Claude Code prompt" textarea and its Generate action.
              That flow produced a block of text a manager copied into a terminal themselves —
              the roadmap's involvement ended at the clipboard, and nothing tied the build that
              followed back to the opportunity that asked for it. This hands the same two inputs
              (description + PRD) straight to the Builder agent as its opening turn.

              The stored `claudePrompt` column is left in place, unused: it is empty on every
              existing row, but that is worth confirming on production before anyone drops it.
            */}
            {canManage && (
              <div className="flex flex-col gap-1">
                <div>
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={handleOpenBuilder}
                    // The description IS the brief, so there is nothing to open with until it
                    // has one. Unsaved edits are deliberately not required first — see below.
                    disabled={!draft.description.trim() || isOpeningBuilder}
                  >
                    {isOpeningBuilder
                      ? "Opening…"
                      : opportunity?.builderSessionId
                        ? "Resume in Builder Agent"
                        : "Open in Builder Agent"}
                  </Button>
                </div>
                <p className="text-typography-secondary text-xs">
                  {opportunity?.builderSessionId
                    ? "Reopens the existing interview — the brief is already in it."
                    : "Starts a PRD interview seeded with this description and PRD."}
                </p>
              </div>
            )}

            {canManage && (
              <div className="flex items-center justify-between gap-2">
                {/* Delete sits opposite Save, not beside it: they are not peers, and an irreversible
                    action adjacent to the button people click reflexively is how accidents happen.
                    Two-step rather than a modal — one primary action per view. */}
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-typography-primary text-sm">
                      Delete this? Votes go back to whoever cast them.
                    </span>
                    <Button variant={ButtonVariant.PRIMARY} onClick={remove} disabled={isDeleting}>
                      {isDeleting ? "Deleting…" : "Delete"}
                    </Button>
                    <Button
                      variant={ButtonVariant.SECONDARY}
                      onClick={() => setIsConfirmingDelete(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant={ButtonVariant.TEXT} onClick={() => setIsConfirmingDelete(true)}>
                    Delete opportunity
                  </Button>
                )}
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
