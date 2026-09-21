import { FC, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  useCreateCompetencyClusterMutation,
  useDeleteCompetencyClusterMutation,
  useUpdateCompetencyClusterMutation,
} from "@api";
import { ActionConfirmationPopup, Button, FormLabel } from "@components";
import { ButtonVariant } from "@components/types";
import { Competency, CompetencyCluster } from "@types";

interface ClusterPanelProps {
  // null = create a new cluster, an object = edit that one.
  cluster: CompetencyCluster | null;
  competencies: Competency[];
  onClose: () => void;
}

/**
 * Create or edit a cluster: its name, and which competencies are in it.
 *
 * This is the visible home for cluster management. Membership can also be set
 * from a competency's own Clusters field — handy when adding one competency to
 * a framework — but "I want a new cluster" has to be a thing you can see and
 * click, not something you discover by typing an unknown name into a
 * typeahead.
 */
export const ClusterPanel: FC<ClusterPanelProps> = ({ cluster, competencies, onClose }) => {
  const [name, setName] = useState(cluster?.name ?? "");
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set(cluster?.competencyIds ?? []));
  const [search, setSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [createCluster, { isLoading: isCreating }] = useCreateCompetencyClusterMutation();
  const [updateCluster, { isLoading: isUpdating }] = useUpdateCompetencyClusterMutation();
  const [deleteCluster] = useDeleteCompetencyClusterMutation();

  const isEditMode = Boolean(cluster?.id);
  const isSaving = isCreating || isUpdating;

  // Custom competencies are private to their owner, so they are never
  // groupable — keep them out of the picker rather than letting someone add
  // one and wonder why nobody else sees it.
  const selectable = useMemo(
    () => competencies.filter(competency => !competency.isCustom),
    [competencies],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return selectable;
    return selectable.filter(competency => competency.name.toLowerCase().includes(query));
  }, [selectable, search]);

  const toggle = (competencyId: string) =>
    setMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(competencyId)) next.delete(competencyId);
      else next.add(competencyId);
      return next;
    });

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (cluster?.id) {
        await updateCluster({
          id: cluster.id,
          data: { name: trimmed, competencyIds: [...memberIds] },
        }).unwrap();
        toast.success("Cluster updated");
      } else {
        await createCluster({ name: trimmed, competencyIds: [...memberIds] }).unwrap();
        toast.success("Cluster created");
      }
      onClose();
    } catch (error) {
      // A duplicate name comes back as a 409 with a usable message; showing it
      // beats a generic failure: naming the cluster that already exists is actionable.
      const message = (error as { data?: { message?: string } })?.data?.message;
      toast.error(message || "Failed to save cluster");
    }
  };

  const handleDelete = async () => {
    if (!cluster?.id) return;
    try {
      await deleteCluster(cluster.id).unwrap();
      toast.success("Cluster deleted");
      onClose();
    } catch {
      toast.error("Failed to delete cluster");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-50 h-full w-full max-w-[480px] bg-white shadow-xl flex flex-col p-6 gap-5 overflow-y-auto custom-scrollbar">
        <h2 className="text-xl font-secondary text-typography-900">
          {isEditMode ? "Edit cluster" : "New cluster"}
        </h2>

        <div className="flex flex-col gap-2">
          <FormLabel isMandatory>Cluster name</FormLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Core Communication"
            className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
          />
          <p className="text-xs text-typography-600">
            Usually a framework — the name an author will see when they pick the whole set for a
            simulation.
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <FormLabel>Competencies in this cluster</FormLabel>
            <span className="text-xs text-typography-600">{memberIds.size} selected</span>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search competencies…"
            className="w-full rounded border border-border-light px-3 py-2 bg-white text-sm focus-within:ring-1 focus-within:ring-primary"
          />
          <div className="flex-1 min-h-[200px] overflow-y-auto custom-scrollbar rounded border border-border-light">
            {visible.length === 0 ? (
              <p className="p-3 text-sm text-typography-600">No competencies match that search.</p>
            ) : (
              visible.map(competency => (
                <label
                  key={competency.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-typography-900 hover:bg-background-secondary cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={memberIds.has(competency.id)}
                    onChange={() => toggle(competency.id)}
                    className="accent-primary"
                  />
                  <span className="truncate">{competency.name}</span>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-typography-600">
            A competency can sit in more than one cluster — adding it here doesn’t remove it from
            anywhere else.
          </p>
        </div>

        <div className="flex justify-between items-center">
          {isEditMode ? (
            <button
              className="text-destructive-500 hover:underline text-sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete cluster
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button variant={ButtonVariant.TEXT} onClick={onClose} className="h-[40px] px-5">
              Cancel
            </Button>
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => void handleSave()}
              disabled={!name.trim() || isSaving}
              className="h-[40px] px-5"
            >
              {isSaving ? "Saving…" : isEditMode ? "Save" : "Create cluster"}
            </Button>
          </div>
        </div>
      </div>

      <ActionConfirmationPopup
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete"
        titleItalic="cluster"
        description={
          `Are you sure you want to delete **${cluster?.name ?? ""}**? ` +
          "Its competencies are kept — they just stop being grouped. Simulations already built " +
          "from this cluster are unaffected: they store the competencies themselves, not the " +
          "cluster."
        }
        primaryButton={{ label: "Delete", onClick: () => void handleDelete() }}
        secondaryButton={{ label: "Cancel", onClick: () => setShowDeleteConfirm(false) }}
      />
    </div>
  );
};
