import React, { useState } from "react";

import { toast } from "sonner";

import { ComposedModal, ModalBody, SkeletonText, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useAssessMissingRoadmapGoalImpactMutation,
  useCreateRoadmapStrategyGoalMutation,
  useDeleteRoadmapStrategyGoalMutation,
  useGetRoadmapRankWeightsQuery,
  useGetRoadmapStrategyGoalsQuery,
  useRenameRoadmapStrategyGoalMutation,
  useUpdateRoadmapRankWeightsMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapRankWeights, RoadmapStrategyGoal } from "@types";

interface StrategyRankingManagerProps {
  onClose: () => void;
}

/**
 * The four factors, in the order they appear in the weights editor.
 *
 * `hint` is written to say what RAISING the weight does, because that is the question somebody
 * dragging a number is actually asking. Effort's hint names the trade explicitly: it is the one
 * factor where a high weight has a well-known failure mode.
 */
const FACTORS: {
  key: keyof RoadmapRankWeights;
  label: string;
  hint: string;
}[] = [
  {
    key: "votesWeight",
    label: "Vote count",
    hint: "Total votes spent on it. Raise to follow overall conviction.",
  },
  {
    key: "votersWeight",
    label: "Admins backing it",
    hint: "How many distinct admins voted. Raise to favour broad agreement over one strong opinion.",
  },
  {
    key: "effortWeight",
    label: "Effort (smaller ranks higher)",
    hint: "Inverse: S scores highest, XXL lowest, unsized sits in the middle. Raise for a cheap-first board — at a high weight, trivial work outranks hard work people care more about.",
  },
  {
    key: "goalImpactWeight",
    label: "Strategy goal coverage",
    hint: "Share of strategy goals it advances, assessed by AI. Raise to follow the strategy over the vote.",
  },
];

/**
 * Product strategy goals and the composite rank, in one settings modal.
 *
 * WHY THE TWO LIVE TOGETHER: they are the two halves of one question — what the board ranks by.
 * Splitting them would put the weight for "strategy goal coverage" in a different dialog from
 * the goals that define it.
 *
 * THE ASYMMETRY IS THE THING THIS SCREEN HAS TO COMMUNICATE, and it is why the two sections do
 * not look alike:
 *
 *   - Editing a WEIGHT is free and instant. It re-sorts and nothing else — no AI calls, no
 *     stored score to rebuild. So the weights save on blur with no confirmation.
 *   - Adding a GOAL changes the denominator every opportunity's coverage divides by, which
 *     silently lowers every score until the assessment catches up. So goals carry an explicit
 *     "not yet assessed" count and a bulk action, rather than pretending the change was free.
 *
 * NOT confusable with Product goals (the other settings modal): that one is the one-per-
 * opportunity filing CATEGORY. These are the outcomes the board is RANKED against, and an
 * opportunity may advance several or none.
 */
export const StrategyRankingManager: React.FC<StrategyRankingManagerProps> = ({ onClose }) => {
  const { data, isLoading } = useGetRoadmapStrategyGoalsQuery();
  const { data: weights, isLoading: isWeightsLoading } = useGetRoadmapRankWeightsQuery();

  const [createGoal, { isLoading: isCreating }] = useCreateRoadmapStrategyGoalMutation();
  const [renameGoal] = useRenameRoadmapStrategyGoalMutation();
  const [deleteGoal] = useDeleteRoadmapStrategyGoalMutation();
  const [updateWeights] = useUpdateRoadmapRankWeightsMutation();
  const [assessMissing, { isLoading: isAssessing }] = useAssessMissingRoadmapGoalImpactMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  /** Two-step delete, so the count of discarded assessments is read before acting. */
  const [confirmingDelete, setConfirmingDelete] = useState<RoadmapStrategyGoal | null>(null);
  /**
   * What the admin has typed into a weight box since it last committed. Needed because the
   * box is controlled: without it, rejecting an out-of-range value would have nothing to show
   * back except the last-saved number, silently erasing what was just typed.
   */
  const [weightDrafts, setWeightDrafts] = useState<
    Partial<Record<keyof RoadmapRankWeights, string>>
  >({});
  /** Keys currently showing the invalid state, so the box and its error text stay in sync. */
  const [invalidWeightKeys, setInvalidWeightKeys] = useState<
    Partial<Record<keyof RoadmapRankWeights, boolean>>
  >({});

  const goals = data?.goals ?? [];
  const needingAssessment = data?.needingAssessment ?? 0;

  const errorMessage = (error: unknown, fallback: string) =>
    (error as { data?: { message?: string } })?.data?.message ?? fallback;

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const result = await createGoal({ name }).unwrap();
      setNewName("");
      // Say the cost out loud. Adding a goal makes every existing opportunity score lower until
      // it is assessed against the new goal, and a silent re-rank looks like the board changed
      // its mind rather than like it is missing data.
      toast.success(
        result.unassessed > 0
          ? `Added "${name}". ${result.unassessed} opportunities need assessing against it — until then they rank lower.`
          : `Added "${name}".`,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not add that goal."));
    }
  };

  const commitRename = async (goal: RoadmapStrategyGoal) => {
    const name = editingName.trim();
    setEditingId(null);
    if (!name || name === goal.name) return;
    try {
      await renameGoal({ id: goal.id, name }).unwrap();
      // Worth stating: unlike adding, a rename costs nothing and changes no score.
      toast.success(`Renamed to "${name}". Existing assessments carried over.`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not rename that goal."));
    }
  };

  const remove = async (goal: RoadmapStrategyGoal) => {
    setConfirmingDelete(null);
    try {
      const result = await deleteGoal(goal.id).unwrap();
      toast.success(
        `Deleted "${goal.name}" and ${result.discardedVerdicts} assessment${
          result.discardedVerdicts === 1 ? "" : "s"
        }.`,
      );
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete that goal."));
    }
  };

  const runAssessment = async () => {
    try {
      const result = await assessMissing().unwrap();
      // The run is bounded, so `remaining` is the honest part of this message — a bulk action
      // that reported only what it did would read as "finished" on a board it barely started.
      toast.success(
        result.remaining > 0
          ? `Assessed ${result.assessed}. ${result.remaining} still to go — run it again.`
          : `Assessed ${result.assessed}. Everything is up to date.`,
      );
      if (result.failed > 0) {
        toast.error(`${result.failed} could not be assessed and will rank with no coverage.`);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not run the assessment."));
    }
  };

  /**
   * Saved on blur rather than behind a Save button: the change is free and immediately visible
   * in the board behind the modal, so a confirmation step would only add latency to something
   * an admin is going to nudge several times in a row.
   */
  const commitWeight = async (key: keyof RoadmapRankWeights, raw: string) => {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0 || value > 10) {
      setInvalidWeightKeys(prev => ({ ...prev, [key]: true }));
      return;
    }
    setInvalidWeightKeys(prev => ({ ...prev, [key]: false }));
    setWeightDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (weights && weights[key] === value) return;
    try {
      await updateWeights({ [key]: value }).unwrap();
    } catch (error) {
      toast.error(errorMessage(error, "Could not update the weighting."));
    }
  };

  const weightTotal = weights
    ? weights.votesWeight + weights.votersWeight + weights.effortWeight + weights.goalImpactWeight
    : 0;

  return (
    <ComposedModal open onClose={onClose} size="md">
      <ModalBody>
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-typography-primary text-xl">Strategy &amp; ranking</h2>
            <p className="text-typography-secondary mt-1 text-sm">
              The outcomes the board is ranked against, and how much each factor counts. These are
              not the same as product goals, which are the category an opportunity is filed under.
            </p>
          </div>

          {/* ── strategy goals ─────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-typography-primary text-base">Product strategy goals</h3>
              <p className="text-typography-secondary mt-1 text-sm">
                AI judges each opportunity against every goal. Its coverage — the share of goals it
                advances — is one of the four ranking factors.
              </p>
            </div>

            <div className="flex items-end gap-2">
              <div className="grow">
                <TextInput
                  id="new-strategy-goal"
                  labelText="Add a goal"
                  placeholder="e.g. Cut time-to-first-value"
                  value={newName}
                  onChange={event => setNewName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") add();
                  }}
                />
              </div>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={add}
                disabled={!newName.trim() || isCreating}
              >
                Add
              </Button>
            </div>

            {isLoading ? (
              <SkeletonText paragraph lineCount={3} />
            ) : goals.length === 0 ? (
              // The empty state has to say what it COSTS to stay empty, or the coverage column on
              // every card reads as a bug rather than as an unanswered question.
              <p className="text-typography-secondary text-sm">
                No strategy goals yet. Until you add some, ranking uses votes, admins backing, and
                effort only.
              </p>
            ) : (
              <ul className="flex flex-col">
                {goals.map(goal => {
                  const isEditing = editingId === goal.id;

                  return (
                    <li
                      key={goal.id}
                      className="border-border-light flex items-center gap-2 border-b py-2"
                    >
                      {isEditing ? (
                        <>
                          <div className="grow">
                            <TextInput
                              id={`strategy-goal-${goal.id}`}
                              labelText="Goal name"
                              hideLabel
                              value={editingName}
                              autoFocus
                              onChange={event => setEditingName(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === "Enter") commitRename(goal);
                                if (event.key === "Escape") setEditingId(null);
                              }}
                            />
                          </div>
                          <Button
                            variant={ButtonVariant.PRIMARY}
                            onClick={() => commitRename(goal)}
                          >
                            Save
                          </Button>
                          <Button
                            variant={ButtonVariant.SECONDARY}
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-typography-primary grow">{goal.name}</span>
                          {/* Only shown when non-zero: "0 unassessed" is noise on a healthy row,
                              and the point of this number is to be noticed when it is not zero. */}
                          {goal.unassessed > 0 && (
                            <span className="text-typography-secondary shrink-0 text-xs">
                              {goal.unassessed} unassessed
                            </span>
                          )}
                          <Button
                            variant={ButtonVariant.TEXT}
                            onClick={() => {
                              setEditingId(goal.id);
                              setEditingName(goal.name);
                            }}
                          >
                            Rename
                          </Button>
                          <Button
                            variant={ButtonVariant.TEXT}
                            onClick={() => setConfirmingDelete(goal)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* The catch-up action, shown only when there is something to catch up on. */}
            {needingAssessment > 0 && (
              <div className="border-border-light flex items-center gap-3 border p-3">
                <p className="text-typography-secondary grow text-sm">
                  {needingAssessment} opportunit{needingAssessment === 1 ? "y is" : "ies are"} not
                  assessed against every goal, so{" "}
                  {needingAssessment === 1 ? "it ranks" : "they rank"} lower than they may deserve.
                </p>
                <Button
                  variant={ButtonVariant.SECONDARY}
                  onClick={runAssessment}
                  disabled={isAssessing}
                >
                  {isAssessing ? "Assessing…" : "Assess now"}
                </Button>
              </div>
            )}

            {/* States the consequence with the real number instead of asking "are you sure?" —
                the assessments cost money to produce and cannot be recovered. */}
            {confirmingDelete && (
              <div className="border-destructive-500 flex flex-col gap-2 border p-3">
                <p className="text-typography-primary text-sm">
                  Delete &quot;{confirmingDelete.name}&quot;? Every opportunity&apos;s coverage will
                  be recalculated without it, and its stored assessments are discarded.
                </p>
                <div className="flex gap-2">
                  <Button variant={ButtonVariant.PRIMARY} onClick={() => remove(confirmingDelete)}>
                    Delete
                  </Button>
                  <Button
                    variant={ButtonVariant.SECONDARY}
                    onClick={() => setConfirmingDelete(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* ── weights ────────────────────────────────────────────────────── */}
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="text-typography-primary text-base">Ranking weights</h3>
              <p className="text-typography-secondary mt-1 text-sm">
                Relative, not percentages — 3/3/1/3 means votes, admins backing and strategy each
                count three times as much as effort. Changing these re-sorts the board immediately
                and never re-runs the AI.
              </p>
            </div>

            {isWeightsLoading || !weights ? (
              <SkeletonText paragraph lineCount={4} />
            ) : (
              <ul className="flex flex-col gap-3">
                {FACTORS.map(factor => {
                  const value = weights[factor.key];
                  // The share each factor actually contributes, which is the number an admin is
                  // really setting — "3" means nothing without the other three.
                  const share = weightTotal > 0 ? Math.round((value / weightTotal) * 100) : 0;

                  return (
                    <li key={factor.key} className="flex items-start gap-3">
                      <div className="grow">
                        <p className="text-typography-primary text-sm">{factor.label}</p>
                        <p className="text-typography-secondary mt-0.5 text-xs">{factor.hint}</p>
                      </div>
                      <div className="w-20 shrink-0">
                        <TextInput
                          id={`weight-${factor.key}`}
                          labelText={factor.label}
                          hideLabel
                          type="number"
                          min={0}
                          max={10}
                          value={weightDrafts[factor.key] ?? String(value)}
                          invalid={!!invalidWeightKeys[factor.key]}
                          invalidText="Enter a whole number between 0 and 10."
                          onChange={event =>
                            setWeightDrafts(prev => ({ ...prev, [factor.key]: event.target.value }))
                          }
                          onBlur={event => commitWeight(factor.key, event.target.value)}
                        />
                      </div>
                      <span className="text-typography-secondary w-10 shrink-0 pt-2 text-right text-xs">
                        {share}%
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="flex justify-end">
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </ModalBody>
    </ComposedModal>
  );
};
