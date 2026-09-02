import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BuilderAgentIcon, Close, Link, TooltipIcon, TrashCan } from "@icons";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { CarbonDropdown, TextArea, SkeletonText, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapCommentMutation,
  useGetRoadmapCommentsQuery,
  useGetRoadmapOpportunityQuery,
  useGetRoadmapEligibleOwnersQuery,
  useGetBugFindingByReportedBugQuery,
  useDeleteRoadmapOpportunityMutation,
  useUpdateRoadmapOpportunityMutation,
  useOpenRoadmapBuilderSessionMutation,
  useGetRoadmapGoalImpactQuery,
  useReassessRoadmapGoalImpactMutation,
} from "@api";
import { ActionConfirmationPopup, Button } from "@components";
import { ButtonVariant } from "@components/types";
import { FeatureToggleKey, ROUTES } from "@constants";
import { useUser } from "@hooks";
import {
  RoadmapBuilderSessionHandle,
  RoadmapOpportunityEffort,
  RoadmapOpportunityStage,
  RoadmapOpportunityType,
  RoadmapReferenceImage,
  RoadmapTaxonomyItem,
} from "@types";
import { hasFeature } from "@utils";

import { RankBreakdownPanel } from "./RankBreakdown";
import { ReferenceImagesField } from "./ReferenceImagesField";
import { monthKeyOf, monthLabel, shiftMonthKey } from "./utils/monthBoard";
import { sameReferenceImages } from "./utils/referenceImages";
import { EFFORT_LABEL, STAGE_LABEL } from "./utils/stages";

const PRD_MAX = 20000;

/**
 * How long editing must pause before the drawer saves.
 *
 * Long enough that typing a sentence is one request, short enough that it lands before someone
 * changes a select and looks away. The close handler flushes anything still pending, so this is
 * a batching window and not a window in which work can be lost.
 */
const AUTOSAVE_DEBOUNCE_MS = 800;
const COMMENT_MAX = 500;

const STAGES = Object.values(RoadmapOpportunityStage);
/** Smallest-first — EFFORT_LABEL's key order is the scale's order. See the note there. */
const EFFORTS = Object.values(RoadmapOpportunityEffort);

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
    /** "" means unassigned. Holds an Ally user id as a string, matching the dropdown's values. */
    ownerUserId: "",
    prd: "",
    claudePrompt: "",
    /** 'YYYY-MM', or "" for Unscheduled. */
    plannedMonth: "",
    /** A shirt size, or "" for unsized — the same ""-means-null shape plannedMonth uses. */
    effort: "",
    /**
     * Attached images. Part of the DRAFT rather than written straight through, so they ride the
     * same debounce, the same dirty check and the same "Unsaved changes" line as every other
     * field — an attachment that saved by its own path would be the one edit the status line
     * lied about.
     */
    referenceImages: [] as RoadmapReferenceImage[],
  });
  const [commentBody, setCommentBody] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  /** Set when a save is rejected, cleared on the next edit. See the autosave effect. */
  const [saveFailed, setSaveFailed] = useState(false);
  /**
   * Whether this drawer has written anything yet.
   *
   * Without it the status line reads "Saved" the moment the drawer opens — a clean draft is
   * indistinguishable from a saved one by `isDirty` alone, and claiming a save that never
   * happened is worse than saying nothing.
   */
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  const [openBuilderSession, { isLoading: isOpeningBuilder }] =
    useOpenRoadmapBuilderSessionMutation();

  /**
   * Hydrate the draft ONCE PER OPPORTUNITY, keyed on its id — not on every change to the
   * `opportunity` object.
   *
   * This became load-bearing when saving became automatic. A successful autosave updates the RTK
   * cache, which hands back a new `opportunity`, which would re-run this and overwrite `draft`
   * with the server's copy — including the keystrokes typed while the request was in flight. The
   * same reasoning VoteButton's re-sync effect uses: never clobber a local edit that has not
   * settled.
   *
   * The cost is that a realtime patch from another editor no longer appears in an open drawer.
   * That is the correct side to err on: the person with the drawer open and their cursor in the
   * box is the one whose text must survive.
   */
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!opportunity) return;
    if (hydratedFor.current === opportunity.id) return;
    hydratedFor.current = opportunity.id;
    setDraft({
      description: opportunity.description,
      stage: opportunity.stage,
      productGoal: opportunity.productGoal,
      ownerUserId: opportunity.ownerUserId ? String(opportunity.ownerUserId) : "",
      prd: opportunity.prd ?? "",
      claudePrompt: opportunity.claudePrompt ?? "",
      plannedMonth: opportunity.plannedMonth ?? "",
      effort: opportunity.effort ?? "",
      // `?? []` for a row read from a cache written before the field existed.
      referenceImages: opportunity.referenceImages ?? [],
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

  /**
   * The per-goal verdicts behind the rank breakdown. Skipped for a bug — bugs are not on the
   * board, so they have no rank to explain — and until the opportunity itself has loaded.
   */
  const { data: goalImpact, isLoading: isGoalImpactLoading } = useGetRoadmapGoalImpactQuery(
    opportunityId,
    { skip: !opportunity || isBug },
  );
  const [reassessGoalImpact, { isLoading: isReassessing }] = useReassessRoadmapGoalImpactMutation();

  /**
   * Re-run the assessment against the CURRENT description. This is the only correction path for
   * a verdict somebody disagrees with — the verdicts are deliberately not editable, so the way
   * to change one is to change the case the model is reading.
   */
  const handleReassess = useCallback(async () => {
    try {
      await reassessGoalImpact(opportunityId).unwrap();
      toast.success("Reassessed against the current strategy.");
    } catch (error) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ??
          "Could not reassess this opportunity.",
      );
    }
  }, [opportunityId, reassessGoalImpact]);
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
      draft.plannedMonth !== (opportunity.plannedMonth ?? "") ||
      draft.effort !== (opportunity.effort ?? "") ||
      // By VALUE, not identity. Every keystroke in a caption rebuilds the array, so an identity
      // check would leave this drawer permanently dirty and re-arm the autosave every 800ms for
      // as long as it stayed open — see sameReferenceImages.
      !sameReferenceImages(draft.referenceImages, opportunity.referenceImages ?? []));

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

  const save = useCallback(async () => {
    try {
      await updateOpportunity({
        id: opportunityId,
        body: {
          description: draft.description.trim(),
          stage: draft.stage,
          productGoal: draft.productGoal,
          // null un-assigns. The legacy free-text `owner` is no longer writable — an owner must be
          // one of the named accounts the picker lists, and the backend answers 422 for anyone
          // else it has not already got on the row.
          ownerUserId: draft.ownerUserId ? Number(draft.ownerUserId) : null,
          prd: draft.prd || null,
          claudePrompt: draft.claudePrompt || null,
          // "" is the Unscheduled option, which must send null — sending "" would fail the
          // month-key @Matches with a 400 instead of clearing the plan.
          plannedMonth: draft.plannedMonth || null,
          // "" is the Not-sized option and must send null, the same way plannedMonth's
          // Unscheduled does — the column is nullable and "" would fail the enum check.
          effort: (draft.effort || null) as RoadmapOpportunityEffort | null,
          // The full resulting list, which is what the API takes — `[]` clears them.
          referenceImages: draft.referenceImages,
        },
      }).unwrap();
      setHasSavedOnce(true);
      // No success toast. It fired on every manual save, which was once per visit; on a debounce
      // it would fire on every pause in typing. The status line below the fields carries it
      // instead, where it is glanceable and does not stack up.
    } catch (error) {
      const message =
        (error as { data?: { message?: string } })?.data?.message ?? "Could not save.";
      toast.error(message);
      setSaveFailed(true);
    }
  }, [draft, opportunityId, updateOpportunity]);

  /**
   * Any edit clears the failure flag, so the retry is the user's next keystroke rather than a
   * button they have to go and find.
   *
   * Watching `draft` rather than wiring this into six onChange handlers: a failed save does not
   * touch `draft`, so this cannot re-clear the flag it just set and re-arm the loop the flag
   * exists to stop.
   */
  useEffect(() => {
    setSaveFailed(false);
  }, [draft]);

  /**
   * AUTOSAVE. The drawer commits its own edits, so there is no Save button.
   *
   * Debounced, so a sentence being typed is one request rather than one per keystroke, and the
   * cleanup clears the pending timer on every change — the request only goes out once editing
   * pauses.
   *
   * `saveFailed` STOPS THE LOOP. Without it a rejected save leaves the draft dirty, which
   * re-arms this effect, which fails again — a toast every 800ms forever. The flag clears on the
   * next edit, so correcting whatever the server objected to retries; sitting still does not.
   */
  useEffect(() => {
    if (!canManage || !opportunity || isBug || !isDirty || saveFailed) return undefined;
    const timer = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [canManage, opportunity, isBug, isDirty, saveFailed, save]);

  /*
   * Option lists for the five dropdowns, all as { value, label }.
   *
   * Carbon's Dropdown is object-driven — `selectedItem` must be one of the `items`, not a bare
   * string — so each field needs its list built once and the current value looked up in it. The
   * "" sentinels are real entries for the same reason: "Unscheduled", "Not sized" and
   * "Unassigned" are selectable states, and a null selectedItem would render the placeholder
   * instead of the words for the state the row is actually in.
   */
  const stageItems = useMemo(
    () => STAGES.map(stage => ({ value: stage as string, label: STAGE_LABEL[stage] })),
    [],
  );
  const monthItems = useMemo(
    () => [
      { value: "", label: "Unscheduled" },
      ...plannedMonthOptions.map(month => ({ value: month, label: monthLabel(month) })),
    ],
    [plannedMonthOptions],
  );
  const goalItems = useMemo(
    () => goals.map(goal => ({ value: goal.name, label: goal.name })),
    [goals],
  );
  const effortItems = useMemo(
    () => [
      { value: "", label: "Not sized" },
      ...EFFORTS.map(effort => ({ value: effort as string, label: EFFORT_LABEL[effort] })),
    ],
    [],
  );
  const ownerItems = useMemo(() => {
    const items = [
      { value: "", label: "Unassigned" },
      ...(eligibleOwners ?? []).map(owner => ({
        value: String(owner.id),
        label: owner.name || owner.email,
      })),
    ];
    // The picker lists a short, named set of owners, so a row assigned before someone left that
    // set has an owner with no matching option — and a Dropdown with no match renders its
    // "Unassigned" placeholder, which reads as data loss over a name the board still shows.
    // Keep the current owner visible and re-selectable; the backend only re-validates a CHANGE.
    const currentOwnerId = opportunity?.ownerUserId;
    if (currentOwnerId && !items.some(item => item.value === String(currentOwnerId))) {
      items.push({
        value: String(currentOwnerId),
        label: `${opportunity?.owner ?? "Unknown user"} (current owner)`,
      });
    }
    return items;
  }, [eligibleOwners, opportunity?.ownerUserId, opportunity?.owner]);

  /**
   * The Builder trigger's one string: what it does, what it will do, or why it cannot.
   *
   * It carries the whole affordance now that the button and its help line are gone — as the
   * tooltip AND the accessible name, so hovering and screen-reading say the same thing.
   */
  const canOpenBuilder = !!draft.description.trim() && !isOpeningBuilder;
  const builderHint = isOpeningBuilder
    ? "Opening…"
    : !draft.description.trim()
      ? // The description IS the brief, so there is nothing to open with until it has one.
        "Add a description first — it becomes the agent's brief"
      : opportunity?.builderSessionId
        ? "Resume in Builder Agent — reopens the existing interview, the brief is already in it"
        : "Open in Builder Agent — starts a PRD interview seeded with this description and notes";

  /**
   * Close, flushing anything the debounce still owes.
   *
   * Without this the autosave window is a window in which work can be lost: type, click the
   * backdrop within 800ms, and the edit never left the browser. Fires the save without awaiting
   * it — the mutation is already in flight and RTK will finish it after the drawer unmounts, so
   * closing stays instant.
   *
   * `remove` deliberately does NOT go through here: it calls onClose directly, because flushing
   * a draft onto a row that is being deleted is pointless work and a race over which request
   * lands last.
   */
  const closeWithFlush = useCallback(() => {
    if (canManage && isDirty && !saveFailed) void save();
    onClose();
  }, [canManage, isDirty, saveFailed, save, onClose]);

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={closeWithFlush}>
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
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-typography-primary flex items-baseline gap-2 text-lg">
              Opportunity
              {!!opportunity?.code && (
                <span className="text-typography-secondary text-sm tabular-nums">
                  {opportunity.code}
                </span>
              )}
            </h2>
            {/*
              Votes and filer, moved up here from a row of three big-number blocks at the top of
              the body.

              They are CONTEXT, not content: none of them is editable, and none is why the drawer
              was opened — but they took a full band of the scroll area, in 24px numerals, above
              the description people actually came to read. As one quiet line under the title they
              are still the first thing on the page and cost a line instead of a section.

              "yours" rather than a second "votes": the pair reads as one fact with a part of it
              attributed, which is what it is, and the table's own columns already say Total votes
              / Your votes for anyone matching the two screens up.
            */}
            {!!opportunity && !isBug && (
              <p className="text-typography-700 truncate text-xs">
                <span className="tabular-nums">{opportunity.priorityScore}</span> total votes ·{" "}
                <span className="tabular-nums">{opportunity.myVotes}</span> yours · Filed by{" "}
                {opportunity.creator?.name || opportunity.creator?.email || "Unknown user"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/*
              Delete, as an icon, up here with the other two drawer-level actions.

              It used to sit in the footer opposite "Save changes" — a full-width text button
              named "Delete opportunity" given the same visual weight as the thing people press on
              every visit. Up here it is one glyph among Copy link and Close: reachable, but not
              competing with Save.

              THE GATE IS EXPLICIT NOW, and that is the part worth checking on any future edit.
              In the footer this button lived inside the `!isBug` branch below, so a bug could
              never reach it — the comment on that branch is about exactly this, that "Delete"
              on a bug would destroy the record of somebody's report. The header renders whatever
              the load state, so the three conditions the old position gave for free are spelled
              out here instead.
            */}
            {/*
              Open/Resume the Builder agent. Was a labelled SECONDARY button with a line of help
              under it, sitting between Notes and the save status — a lot of weight for something
              used once in an opportunity's life, and it pushed the comments below the fold.

              FIRST in the set, and the only constructive action here, so it is not adjacent to
              Close (pressed reflexively) with Delete between them.

              aria-disabled + a guarded onClick, NOT the `disabled` attribute. A disabled element
              emits no pointer events, so its tooltip never opens — and the tooltip is now the
              only place the label, the explanation, and the REASON it is unavailable are written.
              Disabling it properly would hide exactly the text someone needs when they cannot
              press it.
            */}
            {canManage && !!opportunity && !isBug && (
              <Tooltip label={builderHint} align="bottom">
                <button
                  type="button"
                  aria-label={builderHint}
                  aria-disabled={!canOpenBuilder}
                  onClick={() => {
                    if (canOpenBuilder) void handleOpenBuilder();
                  }}
                  className={`inline-flex items-center rounded-full p-1 transition-colors ${
                    canOpenBuilder
                      ? "text-typography-700 hover:text-primary-500 cursor-pointer"
                      : "text-typography-400 cursor-not-allowed"
                  }`}
                >
                  <BuilderAgentIcon size={16} />
                </button>
              </Tooltip>
            )}
            {canManage && !!opportunity && !isBug && (
              <Tooltip label="Delete opportunity" align="bottom">
                <button
                  type="button"
                  aria-label="Delete opportunity"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="text-typography-700 hover:text-destructive-500 inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
                >
                  <TrashCan size={16} />
                </button>
              </Tooltip>
            )}
            {/* Copy link and Close as icons too, so the three actions read as one set rather
                than a glyph followed by two text buttons. Each keeps a tooltip AND an aria-label,
                per the tooltip convention in ally-web/CLAUDE.md — icon-only controls have no
                other name. */}
            <Tooltip label="Copy link" align="bottom">
              <button
                type="button"
                aria-label="Copy link"
                onClick={copyLink}
                className="text-typography-700 hover:text-primary-500 inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
              >
                <Link size={16} />
              </button>
            </Tooltip>
            <Tooltip label="Close" align="bottom">
              <button
                type="button"
                aria-label="Close"
                onClick={closeWithFlush}
                className="text-typography-700 hover:text-typography-900 inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
              >
                <Close size={16} />
              </button>
            </Tooltip>
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
            <TextArea
              id="drawer-description"
              labelText="Description"
              rows={4}
              value={draft.description}
              readOnly={!canManage}
              maxLength={1000}
              onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))}
            />

            {/*
              TWO COLUMNS, not four across.

              These four shared one flex row, which at the drawer's width left each about 150px
              and truncated every one of them: "Priori…", "Jan…", "Roleplay Acto…", "Admin …".
              Three of the four are the fields you open this drawer to change, and a select whose
              CURRENT VALUE is cut off cannot be read without opening it. Two columns roughly
              doubles each field and costs one row of height.

              grid rather than flex-wrap: wrapping would leave the last row's field stretched to
              full width, so the four would not line up as a block.
            */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/*
                Carbon's DROPDOWN, not its Select — and the same for the four below.

                Carbon's `Select` renders a real <select>, so it opened the OS menu: Chrome's grey
                list on one machine, a native sheet on another, and none of it matching the
                product's own type or spacing. `Dropdown` is Carbon's own listbox, which is what
                the board's group-by picker already uses, so the drawer and the toolbar now agree.

                The cost is that it is object-driven: `selectedItem` is an item from `items`, not
                a string, which is why the option lists exist above and why every onChange guards
                a null selection.
              */}
              <CarbonDropdown
                id="drawer-stage"
                titleText="Stage"
                label="Choose a stage"
                items={stageItems}
                itemToString={item => item?.label ?? ""}
                selectedItem={stageItems.find(item => item.value === draft.stage) ?? null}
                disabled={!canManage}
                onChange={({ selectedItem }) => {
                  if (!selectedItem) return;
                  setDraft(prev => ({
                    ...prev,
                    stage: selectedItem.value as RoadmapOpportunityStage,
                  }));
                }}
              />

              {/* Planned month, so something can be scheduled without opening the board and
                  dragging. Locked once shipped: the lane is then the month it actually shipped in,
                  which the backend enforces with a 422 — disabling the control is how that rule
                  becomes visible instead of arriving as a failed save. */}
              <div>
                <div className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <CarbonDropdown
                      id="drawer-planned-month"
                      titleText="Planned month"
                      label="Unscheduled"
                      items={monthItems}
                      itemToString={item => item?.label ?? ""}
                      selectedItem={
                        monthItems.find(item => item.value === draft.plannedMonth) ?? null
                      }
                      disabled={!canManage || opportunity.monthPinned}
                      onChange={({ selectedItem }) => {
                        if (!selectedItem) return;
                        setDraft(prev => ({ ...prev, plannedMonth: selectedItem.value }));
                      }}
                    />
                  </div>
                  <Tooltip
                    label="Which month you intend to ship this in. Once the stage is Released the card moves to the month it actually shipped, and this stops being editable — so a slipped plan stays visible instead of being overwritten."
                    align="bottom"
                  >
                    <button type="button" className="inline-flex cursor-pointer items-center">
                      <TooltipIcon />
                    </button>
                  </Tooltip>
                </div>
                {/*
                  RELEASED MONTH, as its own labelled value directly under the planned one — the
                  two are a pair, and the interesting case is when they differ.

                  This was a grey footnote reading "Shipped in Jul 2026 · was planned for Jan
                  2026", which stated the plan twice: once in the (disabled) select above and
                  again inside the sentence. Now the select holds the plan and this holds the
                  fact, so "planned Jan, shipped Jul" is read by looking down rather than by
                  parsing a clause. The `· was planned for` half is gone for that reason, not
                  because the comparison stopped mattering.

                  Read-only, and rendered ONLY once shipped. Before release there is no released
                  month to show — an empty field would invite someone to try to set one, and the
                  backend derives it from `releasedAt` rather than accepting it.

                  effectiveMonth, not a month derived from releasedAt here: the server already
                  resolves "release month once shipped, else plannedMonth" and the type says
                  never to recompute it, or the board and the drawer will disagree about where a
                  slipped item lives.
                */}
                {opportunity.monthPinned && (
                  <div className="mt-2">
                    <div className="text-typography-700 text-xs">Released month</div>
                    <div className="text-typography-primary text-sm">
                      {monthLabel(opportunity.effectiveMonth)}
                    </div>
                  </div>
                )}
              </div>

              <CarbonDropdown
                id="drawer-goal"
                titleText="Product goal"
                label="Choose a goal"
                items={goalItems}
                itemToString={item => item?.label ?? ""}
                selectedItem={goalItems.find(item => item.value === draft.productGoal) ?? null}
                disabled={!canManage}
                onChange={({ selectedItem }) => {
                  if (!selectedItem) return;
                  setDraft(prev => ({ ...prev, productGoal: selectedItem.value }));
                }}
              />

              {/* Options are Ally SUPER_ADMIN / SUPER_DUPER_ADMIN users, not a hand-maintained list
                  of names. Losing super-admin therefore removes someone from this picker with no
                  separate cleanup step. */}
              {/*
                Effort — a rough size, so a reader can weigh "most wanted" against "what it
                costs". Votes say what people want and nothing about the price; those are
                different questions and the second one needs this next to the first.

                "Not sized" is a real option, not a placeholder: null is a permanent legal state
                (every row predating the field is unsized), and un-sizing something that was
                sized wrong has to be reachable. It is FIRST because it is where every row starts.
              */}
              <CarbonDropdown
                id="drawer-effort"
                titleText="Effort"
                label="Not sized"
                items={effortItems}
                itemToString={item => item?.label ?? ""}
                selectedItem={effortItems.find(item => item.value === draft.effort) ?? null}
                disabled={!canManage}
                onChange={({ selectedItem }) => {
                  if (!selectedItem) return;
                  setDraft(prev => ({ ...prev, effort: selectedItem.value }));
                }}
              />

              <CarbonDropdown
                id="drawer-owner"
                titleText="Owner"
                label="Unassigned"
                items={ownerItems}
                itemToString={item => item?.label ?? ""}
                selectedItem={ownerItems.find(item => item.value === draft.ownerUserId) ?? null}
                disabled={!canManage}
                onChange={({ selectedItem }) => {
                  if (!selectedItem) return;
                  setDraft(prev => ({ ...prev, ownerUserId: selectedItem.value }));
                }}
              />
              {/* A migrated row's owner is a plain string with no account behind it. Say so, rather
                  than showing "Unassigned" over a name the board is still displaying and filtering
                  on — that reads as data loss. */}
              {!opportunity.ownerUserId && opportunity.owner && (
                <p className="text-typography-secondary text-xs">
                  Currently <strong>{opportunity.owner}</strong>, migrated from the old roadmap and
                  not yet linked to an Ally account. Pick an owner above to link it.
                </p>
              )}
            </div>

            {/*
              Why the rank breakdown sits HERE, under the fields it is computed from, rather than
              beside the vote total in the header: two of its four factors (effort, and the
              description the goal assessment reads) are edited on this screen, so the score and
              the things that move it belong in one place. The header line stays the raw vote
              count — the fact people came for — and this is the explanation.

              Bugs are excluded, like every other ranking surface: they are not on the board.
            */}
            {!isBug && (
              <div className="border-border-light flex flex-col gap-2 border-t pt-4">
                <h3 className="text-typography-primary text-sm">Why it ranks here</h3>
                <RankBreakdownPanel
                  opportunity={opportunity}
                  verdicts={goalImpact}
                  isLoadingVerdicts={isGoalImpactLoading}
                  canManage={canManage}
                  isReassessing={isReassessing}
                  onReassess={handleReassess}
                />
              </div>
            )}

            {/* Reference images.

                Between the ranking panel and Notes: they are part of what the opportunity SAYS,
                so they sit with the description's neighbours rather than under the comments where
                a reader would find them only after deciding.

                `canEdit={canManage}` matches every other field here — editing is manage-gated,
                and a viewer gets the same thumbnails with no controls rather than an empty
                section. Removing one from this list never deletes the uploaded file. */}
            <ReferenceImagesField
              images={draft.referenceImages}
              onChange={referenceImages => setDraft(prev => ({ ...prev, referenceImages }))}
              canEdit={canManage}
            />

            {/* Labelled "Notes", but the column, the constant and the agent payload are all still
                `prd` — this renames what a reader sees, not the field. The old label leaked an
                internal term and promised more ceremony than the box asks for; most of what goes
                in it is a paragraph of context, not a product requirements document.

                Stays PLAIN TEXT / markdown, not TipTap HTML. The AI flows generate this kind
                of field as plain text, so HTML would force a lossy markdown↔HTML round trip on
                the most-used path — and markdown→HTML later needs no data migration, whereas the
                reverse is lossy. */}
            <TextArea
              id="drawer-prd"
              labelText="Notes"
              rows={8}
              value={draft.prd}
              readOnly={!canManage}
              maxLength={PRD_MAX}
              placeholder={canManage ? "Optional long-form detail." : ""}
              onChange={event => setDraft(prev => ({ ...prev, prd: event.target.value }))}
              className="font-mono"
            />

            {/*
              The Builder trigger used to live here as a labelled button plus a help line. It is
              now an icon in the drawer header — see there, and see `builderHint` for the copy
              that line carried.

              The note that outlived it: this REPLACED a "Claude Code prompt" textarea and its
              Generate action, which produced a block of text a manager copied into a terminal
              themselves — the roadmap's involvement ended at the clipboard, and nothing tied the
              build that followed back to the opportunity that asked for it. The stored
              `claudePrompt` column is left in place, unused: it is empty on every existing row,
              but that is worth confirming on production before anyone drops it.
            */}

            {/*
              A STATUS LINE, not a Save button — the drawer saves itself (see the autosave
              effect). Kept in the button's old position because that is where the eye already
              goes to ask "did that stick".

              Four states, because "nothing on screen" is not an answer to that question:
              a failure has to be actionable, a pending edit has to be visibly pending, an
              in-flight write has to be distinguishable from a finished one, and a drawer that
              has saved nothing yet should say nothing at all rather than claim "Saved".

              aria-live="polite" so the transitions are announced without stealing focus from
              the field being typed into.
            */}
            {canManage && (
              <div className="flex items-center justify-end gap-2">
                <span
                  aria-live="polite"
                  className={`text-xs ${
                    saveFailed ? "text-destructive-500" : "text-typography-700"
                  }`}
                >
                  {saveFailed
                    ? "Not saved — edit again to retry"
                    : isSaving
                      ? "Saving…"
                      : isDirty
                        ? "Unsaved changes"
                        : hasSavedOnce
                          ? "Saved"
                          : ""}
                </span>
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
      {/*
        The house confirmation popup, not the two-step inline swap this used to do.
        Inline worked when the trigger was a footer button with a row to expand into; an icon in
        the header has nowhere to put "Delete this? Votes go back to whoever cast them." The
        popup also brings click-outside and focus handling with it, and matches how deleting a
        saved view already asks.

        The consequence is still named rather than left to "are you sure?": votes are returned,
        not destroyed, and that is the thing someone hesitating actually wants to know.
      */}
      <ActionConfirmationPopup
        isOpen={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title="Delete opportunity"
        titleItalic={opportunity?.code}
        description="Votes go back to whoever cast them."
        primaryButton={{
          label: isDeleting ? "Deleting…" : "Delete",
          onClick: remove,
          variant: ButtonVariant.DESTRUCTIVE,
        }}
        secondaryButton={{
          label: "Cancel",
          onClick: () => setIsConfirmingDelete(false),
          variant: ButtonVariant.SECONDARY,
        }}
      />
    </div>
  );
};
