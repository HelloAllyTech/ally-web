import { FC, useState } from "react";

import { toast } from "sonner";

import { AutoExpandableTextarea } from "@ally-ui-mono/ui-shared";
import {
  useCreateOptimisationGoalMutation,
  useDeleteOptimisationGoalMutation,
  useGetOptimisationGoalsQuery,
  useUpdateOptimisationGoalMutation,
} from "@api";
import { ActionConfirmationPopup, Button, FormLabel } from "@components";
import { ButtonVariant } from "@components/types";
import { OptimisationGoal } from "@types";

interface GoalFormState {
  title: string;
  category: string;
  description: string;
}

const EMPTY_FORM: GoalFormState = { title: "", category: "", description: "" };

export const OptimisationGoals: FC = () => {
  const { data, isLoading } = useGetOptimisationGoalsQuery();
  const [createGoal, { isLoading: isCreating }] = useCreateOptimisationGoalMutation();
  const [updateGoal, { isLoading: isUpdating }] = useUpdateOptimisationGoalMutation();
  const [deleteGoal] = useDeleteOptimisationGoalMutation();

  // Side-panel state: null = closed, otherwise create (no id) or edit.
  const [editing, setEditing] = useState<OptimisationGoal | null | undefined>(undefined);
  const [form, setForm] = useState<GoalFormState>(EMPTY_FORM);
  const [goalPendingDelete, setGoalPendingDelete] = useState<OptimisationGoal | null>(null);

  const goals = data?.data ?? [];
  const isPanelOpen = editing !== undefined;
  const isSaving = isCreating || isUpdating;
  const canSave = form.title.trim().length > 0 && form.category.trim().length > 0;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
  };

  const openEdit = (goal: OptimisationGoal) => {
    setForm({
      title: goal.title,
      category: goal.category,
      description: goal.description ?? "",
    });
    setEditing(goal);
  };

  const closePanel = () => setEditing(undefined);

  const handleSave = async () => {
    if (!canSave) return;
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      description: form.description.trim() || undefined,
    };
    try {
      if (editing) {
        await updateGoal({ id: editing.id, data: payload }).unwrap();
        toast.success("Optimisation goal updated");
      } else {
        await createGoal(payload).unwrap();
        toast.success("Optimisation goal created");
      }
      closePanel();
    } catch {
      toast.error("Failed to save optimisation goal");
    }
  };

  const handleDelete = async () => {
    if (!goalPendingDelete) return;
    try {
      await deleteGoal(goalPendingDelete.id).unwrap();
      toast.success("Optimisation goal deleted");
    } catch {
      toast.error("Failed to delete optimisation goal");
    } finally {
      setGoalPendingDelete(null);
    }
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl text-typography-900 font-secondary">Optimisation Goals</h1>
        <Button variant={ButtonVariant.PRIMARY} onClick={openCreate} className="h-[40px] px-5">
          Create goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : goals.length === 0 ? (
          <p className="text-typography-700">
            No optimisation goals yet. Click “Create goal” to add one.
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-light text-sm text-typography-700">
                <th className="py-3 pr-4 font-medium w-1/4">Title</th>
                <th className="py-3 pr-4 font-medium w-1/5">Category</th>
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="py-3 pr-4 font-medium w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(goal => (
                <tr
                  key={goal.id}
                  className="border-b border-border-light text-sm text-typography-900 align-top"
                >
                  <td className="py-3 pr-4">{goal.title}</td>
                  <td className="py-3 pr-4">{goal.category}</td>
                  <td className="py-3 pr-4 text-typography-700 whitespace-pre-wrap">
                    {goal.description || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-3">
                      <button
                        className="text-primary-500 hover:underline"
                        onClick={() => openEdit(goal)}
                      >
                        Edit
                      </button>
                      <button
                        className="text-destructive-500 hover:underline"
                        onClick={() => setGoalPendingDelete(goal)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Slide-in create/edit panel. */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative z-50 h-full w-full max-w-[480px] bg-white shadow-xl flex flex-col p-6 gap-5 overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-secondary text-typography-900">
              {editing ? "Edit optimisation goal" : "Create optimisation goal"}
            </h2>

            <div className="flex flex-col gap-2">
              <FormLabel isMandatory>Title</FormLabel>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Build rapport with the user"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel isMandatory>Category</FormLabel>
              <input
                type="text"
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g. Relationship"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel>Description</FormLabel>
              <AutoExpandableTextarea
                value={form.description}
                onChange={value => setForm(prev => ({ ...prev, description: value }))}
                placeholder="What does this goal mean and when should it apply?"
                minHeight={96}
                maxLines={12}
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base"
              />
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <Button variant={ButtonVariant.TEXT} onClick={closePanel} className="h-[40px] px-5">
                Cancel
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleSave}
                disabled={!canSave || isSaving}
                className="h-[40px] px-5"
              >
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(goalPendingDelete)}
        onClose={() => setGoalPendingDelete(null)}
        title="Delete"
        titleItalic="optimisation goal"
        description={`Are you sure you want to delete **${goalPendingDelete?.title ?? ""}**? This cannot be undone.`}
        primaryButton={{ label: "Delete", onClick: handleDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setGoalPendingDelete(null) }}
      />
    </div>
  );
};
