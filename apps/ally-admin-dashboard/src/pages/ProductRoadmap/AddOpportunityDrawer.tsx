import React, { useEffect, useMemo, useRef, useState } from "react";

import { Close, FailIcon, Minus, Tick, TooltipIcon } from "@icons";
import { toast } from "sonner";

import { CarbonDropdown, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCheckRoadmapReadinessMutation,
  useCreateRoadmapOpportunityMutation,
  useGetRoadmapEligibleOwnersQuery,
  useGetRoadmapReadinessCriteriaQuery,
  useRoadmapAiDuplicatesMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import {
  RoadmapDuplicateMatch,
  RoadmapOpportunityEffort,
  RoadmapOpportunityType,
  RoadmapReadinessResult,
  RoadmapTaxonomyItem,
} from "@types";

import { EFFORT_LABEL } from "./utils/stages";

const DESCRIPTION_MAX = 1000;
/** Smallest-first — EFFORT_LABEL's key order is the scale's order. Same as OpportunityDrawer. */
const EFFORTS = Object.values(RoadmapOpportunityEffort);
const DUPLICATE_DEBOUNCE_MS = 700;

interface AddOpportunityDrawerProps {
  goals: RoadmapTaxonomyItem[];
  /**
   * EDIT_PRODUCT_ROADMAP plus the manage toggle — the same value the board and the edit drawer
   * gate on. Here it gates ONE control, the owner picker; everything else in this drawer is
   * open to any filer, because filing itself sits on the vote tier.
   */
  canManage: boolean;
  onClose: () => void;
  /** "Upvote this instead" — closes and opens the existing opportunity's drawer. */
  onOpenExisting: (id: string) => void;
}

/**
 * File a new opportunity — an IDEA, only. Bugs are reported from the page header's "Report a
 * bug" button and are triaged in Bug Hunter; see ReportBugModal for why the two are separate
 * buttons rather than one form with a Type dropdown. Nothing in here mentions bugs: the field
 * asks for an opportunity, and the header button you pressed already picked the branch.
 *
 * A right-hand drawer rather than a centred modal, matching MergeDrawer and OpportunityDrawer:
 * the board stays visible down the left while you write, which is the thing you are checking
 * yourself against — and the duplicate panel that appears mid-form can grow downwards without
 * a dialog resizing around its own centre. Dismissal is the header's Close (or the scrim),
 * the same as the other two, so there is no second Cancel button in the body.
 *
 * ## Filing is gated on a readiness check
 *
 * "File opportunity" stays disabled until every item on the checklist is green. The checklist
 * comes from the server (`ai/readiness/criteria`) rather than from a constant here, and
 * "Check readiness" grades the current text against it.
 *
 * THE VERDICTS ARE BOUND TO THE INPUTS THEY JUDGED (`checkedAgainst`: the trimmed description
 * and the product goal). Change either and every row reverts to pending and the gate closes
 * again. Without that the check is theatre: pass a throwaway sentence, replace it with
 * anything, file. The description is compared trimmed, so trailing whitespace alone does not
 * force a re-run.
 *
 * ## Effort is filled by the same call, and is the one thing you may change without re-running
 *
 * The check also proposes a size, because it has already read the draft closely enough to size
 * it. That field is a proposal: correcting it does NOT reopen the gate, and this is the only
 * exemption. It has to be — a re-run recomputes the size, so if a human correction forced one,
 * the re-run would overwrite the correction and a human could never override the model at all.
 * Everything the model READ closes the gate when it changes; the field it WROTE does not.
 *
 * The duplicate check is the other AI assist and has no button: it runs while you type and
 * degrades silently — it answers `{matches: []}` when ally-ai is unreachable, so a dead vector
 * service can never block someone filing an idea. The readiness check deliberately does NOT
 * degrade that way. It is a gate, so an unavailable grader means "not yet", not "waved
 * through" — the same fail-closed rule the backend applies per item.
 *
 * The two buttons that used to sit under the goal picker are both deprecated. "Review"
 * critiqued the draft into an issue/tip list; "Improve wording" rewrote it in place. Each put
 * a round trip between writing and filing, on a form whose whole job is to capture a thought
 * before it is lost — and a rewrite in particular replaced the filer's own words, which are
 * what the people voting on this later read. The `ai/review` and `ai/enhance` endpoints are
 * still served and marked deprecated; nothing calls either.
 */
export const AddOpportunityDrawer: React.FC<AddOpportunityDrawerProps> = ({
  goals,
  canManage,
  onClose,
  onOpenExisting,
}) => {
  const [description, setDescription] = useState("");
  const [productGoal, setProductGoal] = useState(goals[0]?.name ?? "");
  const [duplicates, setDuplicates] = useState<RoadmapDuplicateMatch[]>([]);
  const [verdicts, setVerdicts] = useState<Record<string, RoadmapReadinessResult>>({});
  /** Empty until a check proposes one, or a human picks one. "" is "Not sized". */
  const [effort, setEffort] = useState<string>("");
  const [effortReason, setEffortReason] = useState("");
  /** "" is Unassigned, which is where every filing starts and a perfectly good end state. */
  const [ownerUserId, setOwnerUserId] = useState<string>("");
  /** The inputs `verdicts` describes. Null until the check has run once. */
  const [checkedAgainst, setCheckedAgainst] = useState<{
    description: string;
    productGoal: string;
  } | null>(null);

  /** Same shape OpportunityDrawer builds for its own goal picker. */
  const goalItems = useMemo(
    () => goals.map(goal => ({ value: goal.name, label: goal.name })),
    [goals],
  );

  /** "Not sized" first and always available: it is where a row starts and a legal end state. */
  const effortItems = useMemo(
    () => [
      { value: "", label: "Not sized" },
      ...EFFORTS.map(size => ({ value: size as string, label: EFFORT_LABEL[size] })),
    ],
    [],
  );

  /**
   * Skipped entirely for a filer who cannot manage the board: the picker is hidden from them,
   * so fetching the list would be a request whose only possible use is a control they will
   * never see.
   */
  const { data: eligibleOwners } = useGetRoadmapEligibleOwnersQuery(undefined, {
    skip: !canManage,
  });

  /** Same shape and same "Unassigned" first entry as OpportunityDrawer's picker. */
  const ownerItems = useMemo(
    () => [
      { value: "", label: "Unassigned" },
      ...(eligibleOwners ?? []).map(owner => ({
        value: String(owner.id),
        label: owner.name || owner.email,
      })),
    ],
    [eligibleOwners],
  );

  const { data: criteriaData, isLoading: isLoadingCriteria } =
    useGetRoadmapReadinessCriteriaQuery();
  const criteria = criteriaData?.criteria ?? [];

  const [createOpportunity, { isLoading: isSaving }] = useCreateRoadmapOpportunityMutation();
  const [checkReadiness, { isLoading: isChecking }] = useCheckRoadmapReadinessMutation();
  const [checkDuplicates, { isLoading: isCheckingDuplicates }] = useRoadmapAiDuplicatesMutation();

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

  const runCheck = async () => {
    const trimmed = description.trim();
    try {
      const result = await checkReadiness({
        description: trimmed,
        productGoal: productGoal || undefined,
      }).unwrap();
      setVerdicts(Object.fromEntries((result.results ?? []).map(r => [r.id, r])));
      // Overwrites any earlier human correction, deliberately: this is a fresh reading of a
      // draft that has changed since, so the previous size described different text.
      setEffort(result.effort ?? "");
      setEffortReason(result.effort ? (result.effortReason ?? "") : "");
      setCheckedAgainst({ description: trimmed, productGoal });
      if ((result.results ?? []).every(r => r.passed)) {
        toast.success("Ready to file.");
      }
    } catch {
      // Fail closed: drop any previous verdicts rather than leave green ticks standing next to
      // a check that did not actually run. The size goes with them — it described the same
      // reading.
      setVerdicts({});
      setEffort("");
      setEffortReason("");
      setCheckedAgainst(null);
      toast.error("Could not run the readiness check right now.");
    }
  };

  const save = async () => {
    try {
      await createOpportunity({
        description: description.trim(),
        // Not a state value any more: this drawer files ideas, full stop. Still sent
        // explicitly rather than left to a server default, so the row's type is decided
        // here where the decision is visible rather than in a DTO fallback.
        type: RoadmapOpportunityType.IDEA,
        productGoal,
        // Whatever is in the field at the moment of filing: the check's proposal, or the
        // human's correction of it. "" means Not sized, which the API takes as null.
        effort: (effort || null) as RoadmapOpportunityEffort | null,
        // Omitted rather than sent as null by a filer who cannot manage: the field is not
        // theirs to send at all, and an explicit null from them would be a 403 waiting to
        // happen the day the backend stops treating null as "nothing to assign".
        ...(canManage ? { ownerUserId: ownerUserId ? Number(ownerUserId) : null } : {}),
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

  /** Verdicts describe `checkedAgainst`; any edit since then makes them stale, not merely old. */
  const isStale =
    checkedAgainst !== null &&
    (checkedAgainst.description !== description.trim() ||
      checkedAgainst.productGoal !== productGoal);
  const hasChecked = checkedAgainst !== null && !isStale;
  const allGreen = criteria.length > 0 && criteria.every(c => verdicts[c.id]?.passed);

  const canSave =
    description.trim().length > 0 &&
    description.length <= DESCRIPTION_MAX &&
    !!productGoal &&
    hasChecked &&
    allGreen &&
    !isSaving;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New opportunity"
    >
      {/* `relative` so CarbonDropdown's absolutely-positioned menu stays inside this
          scroll container instead of escaping it. */}
      <aside
        className="bg-white relative flex h-full w-[34rem] max-w-full flex-col overflow-hidden"
        onClick={event => event.stopPropagation()}
      >
        <header className="border-border-light flex items-center justify-between border-b p-4">
          <h2 className="text-typography-primary text-lg">New opportunity</h2>
          {/* Same glyph button as OpportunityDrawer's header, rather than a text button: a
              drawer's dismiss is the one control that needs no label, and a word-sized
              "Close" in TEXT blue read as the second-loudest thing in the panel. */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="text-typography-700 hover:text-typography-900 inline-flex cursor-pointer items-center rounded-full p-1 transition-colors"
          >
            <Close size={16} />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {/* `hideLabel`, not a removed label: the drawer is titled "New opportunity" and the
              placeholder already asks the question, so a visible "What is the opportunity?"
              was the third time in 100px of panel. It stays in the DOM because it is the
              field's accessible name — a placeholder is not one, and it vanishes on the first
              keystroke, which would leave a screen reader on an unnamed textarea.

              The wording is opportunity-only, here and in the placeholder. It used to ask for
              "the problem or idea", which invited a bug report — the one thing this drawer
              must not collect, since bugs belong in Bug Hunter. The signpost paragraph that
              used to say so is gone too: the page header's two buttons make that choice, and
              a standing disclaimer taxed everyone filing an idea to redirect the few who
              opened the wrong one. */}
          {/* `justify-end` on Carbon's label row: it is `space-between` for label-then-counter,
              and a visually-hidden label is `position:absolute`, so the counter falls out of
              the flow's right-hand slot and lands at the left margin on its own.

              The `\_\_` is not a typo. Tailwind turns a bare `_` inside an arbitrary variant
              into a space, so `...text-area__label-wrapper` compiles to the selector
              `.cds--text-area label-wrapper` — which matches nothing, silently. */}
          <div className="[&_.cds--text-area\_\_label-wrapper]:justify-end">
            <TextArea
              id="roadmap-description"
              labelText="What is the opportunity?"
              hideLabel
              rows={5}
              value={description}
              maxCount={DESCRIPTION_MAX}
              enableCounter
              maxLength={DESCRIPTION_MAX}
              onChange={event => setDescription(event.target.value)}
              placeholder="Describe the opportunity — who it is for, and what it would change for them."
            />
          </div>

          {/* The Type dropdown that used to sit here (Idea / Bug) is gone. Everything this
              drawer does — a product goal, the duplicate check against other opportunities,
              and the voting the filed row lands in — applies to an idea and to nothing
              else, and a bug picked from that dropdown quietly left the board entirely for
              Bug Hunter. "Report a bug" in the page header is the whole other branch, so the
              choice is made by which button you press rather than by a field you might not
              notice you had changed. */}
          {/* CarbonDropdown, not Carbon's Select: Select renders a real <select>, so the list
              that opens is the OS menu — different type, different metrics, no keyboard model
              of ours — while the field it drops out of is Carbon. This is the same control
              OpportunityDrawer uses for the same field, so the goal is picked the same way
              whether you are filing an opportunity or editing one. */}
          <CarbonDropdown
            id="roadmap-goal"
            titleText="Product goal"
            label="Choose a goal"
            items={goalItems}
            itemToString={item => item?.label ?? ""}
            selectedItem={goalItems.find(item => item.value === productGoal) ?? null}
            onChange={({ selectedItem }) => {
              if (!selectedItem) return;
              setProductGoal(selectedItem.value);
            }}
          />

          {/* All that is left of the row that held the two AI buttons. It stays a status line
              rather than becoming a spinner or a blocking state: the check is best-effort and
              filing never waits on it. */}
          {isCheckingDuplicates && (
            <span className="text-typography-secondary text-xs">checking for duplicates…</span>
          )}

          {/* Effort, filled by the readiness check and editable here.

              Sized at filing time rather than left for triage: the person writing the draft has
              the most context about what it implies, and an unsized row is one a reader cannot
              weigh "most wanted" against "what it costs" — votes say what people want and
              nothing about the price.

              Editing this does NOT reopen the gate; see the note at the top of this file for
              why it cannot without making human override impossible. */}
          <div>
            <CarbonDropdown
              id="roadmap-effort"
              titleText="Effort"
              label="Not sized"
              items={effortItems}
              itemToString={item => item?.label ?? ""}
              selectedItem={effortItems.find(item => item.value === effort) ?? effortItems[0]}
              onChange={({ selectedItem }) => {
                if (!selectedItem) return;
                setEffort(selectedItem.value);
                // The reason described the model's size, not this one. Drop it rather than
                // leave a rationale sitting under a size a human just overrode.
                setEffortReason("");
              }}
            />
            {!!effortReason && hasChecked && (
              <p className="text-typography-secondary mt-1 text-xs">{effortReason}</p>
            )}
            {!hasChecked && !effort && (
              <p className="text-typography-secondary mt-1 text-xs">
                The readiness check proposes a size. You can change it.
              </p>
            )}
          </div>

          {/* Owner, for a filer who can also manage the board.

              Hidden rather than disabled for everyone else. A greyed-out picker on the ONE form
              most people reach — filing sits on the vote tier, managing does not — advertises a
              control they can never use, on the screen where they have least context for why.
              The drawer they would see it in again (OpportunityDrawer) does disable it instead,
              because there the row already HAS an owner worth reading.

              NOT part of the readiness gate, and deliberately below the checklist's inputs: an
              unowned opportunity is a perfectly good thing to file — that is what triage is for
              — and gating a captured thought on knowing who will pick it up is exactly the
              round trip this drawer exists to avoid. It is here at all because the person who
              already knows the answer at filing time should not have to reopen the row to say
              so. */}
          {canManage && (
            <div>
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <CarbonDropdown
                    id="roadmap-owner"
                    titleText="Owner"
                    label="Unassigned"
                    items={ownerItems}
                    itemToString={item => item?.label ?? ""}
                    selectedItem={
                      ownerItems.find(item => item.value === ownerUserId) ?? ownerItems[0]
                    }
                    onChange={({ selectedItem }) => {
                      if (!selectedItem) return;
                      setOwnerUserId(selectedItem.value);
                    }}
                  />
                </div>
                <Tooltip
                  label="Who will take this forward, if you already know. Only Ally platform admins can own an opportunity, and leaving it Unassigned is normal — an owner can be set or changed any time from the opportunity itself."
                  align="bottom"
                >
                  <button type="button" className="inline-flex cursor-pointer items-center">
                    <TooltipIcon />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* The checklist. Rendered from the server's criteria, one BLOCK per item rather than
              a bordered list: the state of each criterion is carried by the block itself —
              white while unassessed, green when it passes, red when it fails — so the panel
              reads at a glance without a container drawing a box around the whole thing.

              Colour is never the only signal. Each block keeps its glyph (dash / tick / cross)
              and its text, because a red-green pair is exactly the distinction a colour-blind
              reader cannot make, and this one gates the primary action.

              A red block shows the grader's reason — the only thing that tells the writer what
              to change — and an unassessed block shows the criterion's hint instead, so the
              list is useful to write against before the check has ever run. */}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-typography-primary text-sm">Readiness</h3>
              {isStale && (
                <span className="text-typography-secondary text-xs">
                  edited since the last check
                </span>
              )}
            </div>

            {isLoadingCriteria && (
              <p className="text-typography-secondary text-sm">Loading the checklist…</p>
            )}

            {!isLoadingCriteria && criteria.length === 0 && (
              <p className="text-typography-secondary text-sm">
                The checklist could not be loaded, so filing stays disabled. Close and reopen this
                drawer to try again.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {criteria.map(criterion => {
                const verdict = hasChecked ? verdicts[criterion.id] : undefined;
                // Carbon's notification shape: a tinted field with a heavier left edge in the
                // status colour. Unassessed stays white so "not looked at yet" never reads as
                // a soft pass.
                const tone = !verdict
                  ? "bg-white border-l-secondary-200"
                  : verdict.passed
                    ? "bg-success-50 border-l-success-400"
                    : "bg-destructive-50 border-l-destructive-500";

                return (
                  <li
                    key={criterion.id}
                    className={`border-border-light flex items-start gap-2 border border-l-4 p-3 ${tone}`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {!verdict && <Minus size={16} className="text-secondary-300" />}
                      {verdict?.passed && <Tick size={16} className="text-success-500" />}
                      {verdict && !verdict.passed && (
                        <FailIcon size={16} className="text-destructive-500" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-typography-primary text-sm">{criterion.label}</div>
                      <div className="text-typography-secondary text-xs">
                        {verdict ? verdict.reason : criterion.hint}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

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
        </div>

        {/* Pinned to the bottom edge rather than trailing the fields: the duplicate panel
            appears mid-form and pushed the action down the panel — and with a short draft it
            sat halfway up an otherwise empty drawer. The body scrolls under it, so filing is
            always one reachable click away.

            No Cancel beside it: the header's ✕ and the scrim already dismiss this. */}
        <footer className="border-border-light flex items-center justify-end gap-2 border-t p-4">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={runCheck}
            disabled={!description.trim() || isChecking || criteria.length === 0}
          >
            {isChecking ? "Checking…" : "Check readiness"}
          </Button>
          <Button variant={ButtonVariant.PRIMARY} onClick={save} disabled={!canSave}>
            {isSaving ? "Filing…" : "File opportunity"}
          </Button>
        </footer>
      </aside>
    </div>
  );
};
