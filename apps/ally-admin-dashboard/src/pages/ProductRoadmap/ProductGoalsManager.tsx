import React, { useState } from "react";

import { toast } from "sonner";

import { SkeletonText, TextInput } from "@ally-ui-mono/ui-shared";
import {
  useCreateRoadmapProductGoalMutation,
  useDeleteRoadmapProductGoalMutation,
  useGetRoadmapProductGoalUsageQuery,
  useRenameRoadmapProductGoalMutation,
} from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { RoadmapTaxonomyItem } from "@types";

interface ProductGoalsManagerProps {
  goals: RoadmapTaxonomyItem[];
  isLoading?: boolean;
}

/**
 * Add, rename and remove product goals. Super-duper-admin only (the route's EDIT permission).
 *
 * WHY THIS EXISTS AT ALL: ~54% of migrated goal values are fiction. The standalone app's June
 * classify-backfill wrote its FALLBACK value ("Foundation & Experiments", confidence 0) for all 241
 * rows it touched after every LLM call failed, and logged "Done. 241 classified." Curating that is
 * the first real job on this board, and until now it could only be done with curl.
 *
 * RENAME IS THE SAFE OPERATION AND DELETE IS NOT, which is the opposite of the usual intuition here:
 * `roadmap_opportunities.productGoal` is a text FK by NAME with ON UPDATE CASCADE, so a rename
 * propagates to every opportunity automatically — and saved views, which store goal NAMES, keep
 * working. A delete un-assigns instead, so the usage count is shown before confirming and the
 * confirmation says what will happen to those rows.
 *
 * A PANEL, NOT A MODAL. This owned a ComposedModal and a "Done" button until the three admin jobs
 * moved behind one gear; RoadmapSettingsDrawer supplies the heading, the width and the single
 * Close, so there is nothing here to dismiss. The "Product goals" tab label is the heading now,
 * which is why the h2 that used to sit above this copy is gone rather than repeated.
 */
export const ProductGoalsManager: React.FC<ProductGoalsManagerProps> = ({ goals, isLoading }) => {
  const { data: usage, isLoading: isUsageLoading } = useGetRoadmapProductGoalUsageQuery();
  const [createGoal, { isLoading: isCreating }] = useCreateRoadmapProductGoalMutation();
  const [renameGoal] = useRenameRoadmapProductGoalMutation();
  const [deleteGoal] = useDeleteRoadmapProductGoalMutation();

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  /** Two-step delete. Holds the goal awaiting confirmation, so the count is read before acting. */
  const [confirmingDelete, setConfirmingDelete] = useState<RoadmapTaxonomyItem | null>(null);

  const errorMessage = (error: unknown, fallback: string) =>
    (error as { data?: { message?: string } })?.data?.message ?? fallback;

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createGoal({ name }).unwrap();
      setNewName("");
      toast.success(`Added "${name}".`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not add that goal."));
    }
  };

  const commitRename = async (goal: RoadmapTaxonomyItem) => {
    const name = editingName.trim();
    setEditingId(null);
    if (!name || name === goal.name) return;
    try {
      await renameGoal({ id: goal.id, name }).unwrap();
      // Worth saying out loud: the cascade is the reason renaming is preferable to delete-and-add.
      toast.success(`Renamed to "${name}" everywhere it was used.`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not rename that goal."));
    }
  };

  const remove = async (goal: RoadmapTaxonomyItem) => {
    setConfirmingDelete(null);
    try {
      await deleteGoal(goal.id).unwrap();
      toast.success(`Deleted "${goal.name}".`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete that goal."));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-typography-secondary text-sm">
        Renaming a goal updates every opportunity using it, and keeps saved views working. Deleting
        one leaves those opportunities with no goal.
      </p>

      <div className="flex items-end gap-2">
        <div className="grow">
          <TextInput
            id="new-product-goal"
            labelText="Add a goal"
            placeholder="e.g. Scribe accuracy"
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
        <SkeletonText paragraph lineCount={4} />
      ) : goals.length === 0 ? (
        <p className="text-typography-secondary text-sm">
          No goals yet. Add one above before filing opportunities against it.
        </p>
      ) : (
        <ul className="flex flex-col">
          {goals.map(goal => {
            const inUse = usage?.[goal.name] ?? 0;
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
                        id={`goal-${goal.id}`}
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
                    <Button variant={ButtonVariant.PRIMARY} onClick={() => commitRename(goal)}>
                      Save
                    </Button>
                    <Button variant={ButtonVariant.SECONDARY} onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-typography-primary grow">{goal.name}</span>
                    <span className="text-typography-secondary shrink-0 text-xs">
                      {isUsageLoading ? "…" : `${inUse} opportunit${inUse === 1 ? "y" : "ies"}`}
                    </span>
                    <Button
                      variant={ButtonVariant.TEXT}
                      onClick={() => {
                        setEditingId(goal.id);
                        setEditingName(goal.name);
                      }}
                    >
                      Rename
                    </Button>
                    <Button variant={ButtonVariant.TEXT} onClick={() => setConfirmingDelete(goal)}>
                      Delete
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation states the consequence with the real number rather than asking "are you
          sure?" — deleting a goal that 276 opportunities use is a very different action from
          deleting an unused one. */}
      {confirmingDelete && (
        <div className="border-destructive-500 flex flex-col gap-2 border p-3">
          <p className="text-typography-primary text-sm">
            Delete <strong>{confirmingDelete.name}</strong>?{" "}
            {(usage?.[confirmingDelete.name] ?? 0) > 0
              ? `${usage?.[confirmingDelete.name]} opportunities will be left with no product goal.`
              : "No opportunities are using it."}
          </p>
          <div className="flex gap-2">
            <Button variant={ButtonVariant.PRIMARY} onClick={() => remove(confirmingDelete)}>
              Delete it
            </Button>
            <Button variant={ButtonVariant.SECONDARY} onClick={() => setConfirmingDelete(null)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
