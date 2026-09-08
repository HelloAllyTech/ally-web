import { FC, Fragment, useEffect, useMemo, useRef, useState } from "react";

import { toast } from "sonner";

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from "@ally-ui-mono/ui-shared";
import {
  useCreateCompetencyMutation,
  useDeleteCompetencyMutation,
  useGetCompetenciesQuery,
  useGetCompetencyBehavioursQuery,
  useGetCompetencyClustersQuery,
  useSetCompetencyBehavioursMutation,
  useUpdateCompetencyMutation,
} from "@api";
import { ActionConfirmationPopup, Button, FormLabel } from "@components";
import { ButtonVariant } from "@components/types";
import { Competency, CompetencyCluster } from "@types";

import { BehaviourTextList } from "./BehaviourTextList";
import { ClusterField } from "./ClusterField";
import { ClusterPanel } from "./ClusterPanel";

const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean);
const serialize = (name: string, helpful: string[], unhelpful: string[], clusters: string[]) =>
  JSON.stringify({
    name: name.trim(),
    helpful: clean(helpful),
    unhelpful: clean(unhelpful),
    // Sorted: chip order is presentation, not a change worth a save.
    clusters: [...clean(clusters)].sort(),
  });

type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * One competency row. Behaviours aren't part of the list response, so each row
 * fetches its own (RTK Query dedupes/caches these).
 *
 * The behaviour columns show a COUNT plus a one-line preview rather than the
 * full comma-joined list. Spelling all of them out turned this page into ~135
 * lines of prose across 15 rows, which buried the thing the page is actually
 * for — seeing how competencies are grouped. The full, editable lists are one
 * click away in the side panel. Same reasoning drops the raw uuid column: it
 * is the least useful thing on the row for a human, and it moved into the
 * panel where it can be read and copied deliberately.
 */
const CompetencyRow: FC<{
  competency: Competency;
  // The clusters this competency belongs to, shown only in the "All
  // competencies" view — inside a single cluster's view they'd all read the
  // same and the column would be noise.
  clusterNames: string[];
  onClick: () => void;
}> = ({ competency, clusterNames, onClick }) => {
  const { data, isLoading } = useGetCompetencyBehavioursQuery(competency.id);

  const summary = (behaviours?: { name?: string }[], label?: string) => {
    if (isLoading) return <span className="text-typography-600">…</span>;
    const names = (behaviours ?? []).map(b => b.name).filter(Boolean) as string[];
    if (names.length === 0) return <span className="text-typography-600">—</span>;
    // Truncated in JS rather than with a CSS clamp: this cell is a preview to
    // give scent. Spelling out all five behaviours per cell turned the page
    // into a wall of prose; the full, editable lists are in the side panel.
    const preview = names.join(", ");
    return (
      <>
        <span className="text-typography-900">
          {names.length} {label}
        </span>
        <span className="block text-xs text-typography-600" title={preview}>
          {preview.length > 48 ? `${preview.slice(0, 48).trimEnd()}…` : preview}
        </span>
      </>
    );
  };

  return (
    <TableRow
      onClick={onClick}
      className="border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-background-secondary transition-colors align-top"
    >
      <TableCell className="py-3 pr-4 font-medium">
        <span className="block">{competency.name}</span>
        {clusterNames.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {clusterNames.map(clusterName => (
              <span
                key={clusterName}
                className="rounded-full bg-background-secondary px-2 py-0.5 text-xs font-normal text-typography-600"
              >
                {clusterName}
              </span>
            ))}
          </span>
        )}
      </TableCell>
      <TableCell className="py-3 pr-4">{summary(data?.helpful, "helpful")}</TableCell>
      <TableCell className="py-3 pr-4">{summary(data?.unhelpful, "unhelpful")}</TableCell>
    </TableRow>
  );
};

// Which competencies the right-hand table is showing. Clusters live in the
// left rail, never in the table itself.
const ALL = "all";
const UNGROUPED = "ungrouped";

/** One row of the cluster rail: a name, its size, and a selected state. */
const RailItem: FC<{
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, count, isActive, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={isActive}
    className={`flex items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm transition-colors ${
      isActive
        ? "bg-primary-50 text-primary font-medium"
        : "text-typography-900 hover:bg-background-secondary"
    }`}
  >
    <span className="truncate">{label}</span>
    <span className={`shrink-0 text-xs ${isActive ? "text-primary" : "text-typography-600"}`}>
      {count}
    </span>
  </button>
);

export const Competencies: FC = () => {
  const { data, isLoading } = useGetCompetenciesQuery({});
  const { data: clustersData } = useGetCompetencyClustersQuery();
  const [createCompetency, { isLoading: isCreating }] = useCreateCompetencyMutation();
  const [updateCompetency] = useUpdateCompetencyMutation();
  const [deleteCompetency] = useDeleteCompetencyMutation();
  const [setCompetencyBehaviours] = useSetCompetencyBehavioursMutation();

  // Side-panel state: undefined = closed, null = create, object = edit.
  const [editing, setEditing] = useState<Competency | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [helpful, setHelpful] = useState<string[]>([]);
  const [unhelpful, setUnhelpful] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  // Cluster panel: undefined = closed, null = create, object = edit that one.
  const [editingCluster, setEditingCluster] = useState<CompetencyCluster | null | undefined>(
    undefined,
  );
  // Which cluster the table is filtered to: a cluster id, ALL, or UNGROUPED.
  const [selectedClusterId, setSelectedClusterId] = useState<string>(ALL);

  // Tracks the last persisted snapshot (so autosave only fires on real
  // changes) and which competency we've already seeded from the server.
  const lastSavedRef = useRef<string>("");
  const seededIdRef = useRef<string | null>(null);

  // Load the editing competency's behaviours (the GET also materialises the
  // predefined-doc defaults the first time). Skipped in create mode.
  const { data: behavioursData } = useGetCompetencyBehavioursQuery(editing?.id ?? "", {
    skip: !editing?.id,
  });

  // Seed local state once per competency (not on every refetch) so autosave's
  // own write-back doesn't reorder/clobber what the user is typing.
  useEffect(() => {
    if (!behavioursData || !editing?.id) return;
    if (seededIdRef.current === editing.id) return;
    const h = behavioursData.helpful.map(b => b.name);
    const u = behavioursData.unhelpful.map(b => b.name);
    // Clusters come off the list row (the competency response carries them),
    // so they seed here alongside the behaviours and land in the same
    // "last saved" snapshot the autosave compares against.
    const c = (editing.clusters ?? []).map(cluster => cluster.name);
    setHelpful(h);
    setUnhelpful(u);
    setClusters(c);
    lastSavedRef.current = serialize(editing.name, h, u, c);
    seededIdRef.current = editing.id;
    setSaveStatus("idle");
  }, [behavioursData, editing]);

  // Debounced autosave of name + behaviours while editing an existing competency.
  useEffect(() => {
    if (!editing?.id) return undefined;
    // Don't autosave until this competency's behaviours have been seeded into
    // local state. Otherwise, if the server load is slower than the debounce,
    // the timer fires with the pre-seed empty helpful/unhelpful and wipes the
    // stored mapping. Seeding sets seededIdRef to the current id.
    if (seededIdRef.current !== editing.id) return undefined;
    const trimmedName = name.trim();
    if (!trimmedName) return undefined; // name is required
    const snapshot = serialize(trimmedName, helpful, unhelpful, clusters);
    if (snapshot === lastSavedRef.current) return undefined;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await updateCompetency({
          id: editing.id,
          data: { name: trimmedName, clusterNames: clean(clusters) },
        }).unwrap();
        await setCompetencyBehaviours({
          id: editing.id,
          data: { helpful: clean(helpful), unhelpful: clean(unhelpful) },
        }).unwrap();
        lastSavedRef.current = snapshot;
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [name, helpful, unhelpful, clusters, editing, updateCompetency, setCompetencyBehaviours]);

  // Memoised: a fresh `?? []` each render would re-run the grouping memo below
  // on every keystroke in the side panel.
  const competencies = useMemo(() => data?.data ?? [], [data]);
  const isPanelOpen = editing !== undefined;
  const isEditMode = Boolean(editing?.id);

  const openCreate = () => {
    setName("");
    setHelpful([]);
    setUnhelpful([]);
    setClusters([]);
    setSaveStatus("idle");
    seededIdRef.current = null;
    setEditing(null);
  };

  const openEdit = (competency: Competency) => {
    setName(competency.name);
    setHelpful([]);
    setUnhelpful([]);
    setClusters([]);
    setSaveStatus("idle");
    seededIdRef.current = null; // force a fresh seed for this competency
    setEditing(competency);
  };

  const closePanel = () => {
    setEditing(undefined);
    setShowDeleteConfirm(false);
    seededIdRef.current = null;
  };

  // Create just makes the competency, then switches into edit mode where the
  // behaviour lists (and their doc defaults) load and autosave.
  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const created = await createCompetency({
        name: name.trim(),
        clusterNames: clean(clusters),
      }).unwrap();
      seededIdRef.current = null;
      setEditing(created);
      toast.success("Competency created");
    } catch {
      toast.error("Failed to create competency");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await deleteCompetency(editing.id).unwrap();
      toast.success("Competency deleted");
      closePanel();
    } catch {
      toast.error("Failed to delete competency");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const allClusters = useMemo(() => clustersData?.data ?? [], [clustersData]);

  // A competency can belong to several clusters, so this is a list per
  // competency, not a single parent. It drives the chips in the "All" view.
  const clusterNamesByCompetency = useMemo(() => {
    const byCompetency = new Map<string, string[]>();
    for (const cluster of allClusters) {
      for (const competencyId of cluster.competencyIds) {
        byCompetency.set(competencyId, [...(byCompetency.get(competencyId) ?? []), cluster.name]);
      }
    }
    return byCompetency;
  }, [allClusters]);

  const ungroupedCompetencies = useMemo(
    () => competencies.filter(competency => !clusterNamesByCompetency.has(competency.id)),
    [competencies, clusterNamesByCompetency],
  );

  // The cluster currently selected in the left rail, if it is a real one.
  const selectedCluster = useMemo(
    () => allClusters.find(cluster => cluster.id === selectedClusterId),
    [allClusters, selectedClusterId],
  );

  // A cluster the author deletes (or one that never existed) must not leave
  // the table showing nothing with no way back.
  useEffect(() => {
    if (selectedClusterId === ALL || selectedClusterId === UNGROUPED) return;
    if (!allClusters.some(cluster => cluster.id === selectedClusterId)) {
      setSelectedClusterId(ALL);
    }
  }, [allClusters, selectedClusterId]);

  const visibleCompetencies = useMemo(() => {
    if (selectedClusterId === ALL) return competencies;
    if (selectedClusterId === UNGROUPED) return ungroupedCompetencies;
    const memberIds = new Set(selectedCluster?.competencyIds ?? []);
    return competencies
      .filter(competency => memberIds.has(competency.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedClusterId, competencies, ungroupedCompetencies, selectedCluster]);

  const saveStatusLabel: Record<SaveStatus, string> = {
    idle: "",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Failed to save — retrying on next change",
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0 gap-3">
        <h1 className="text-2xl text-typography-900 font-secondary">Competencies</h1>
        <div className="flex items-center gap-3">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={() => setEditingCluster(null)}
            className="h-[40px] px-5"
          >
            New cluster
          </Button>
          <Button variant={ButtonVariant.PRIMARY} onClick={openCreate} className="h-[40px] px-5">
            Create competency
          </Button>
        </div>
      </div>

      {/*
        Two panes, deliberately: clusters live in the left rail and
        competencies in the table on the right, so the two never share a
        column. Selecting a cluster filters the table — the same
        framework-then-competencies shape Moodle uses for competency
        frameworks, and the same left-rail filtering people know from labels
        and saved views elsewhere.
      */}
      <div className="flex-1 min-h-0 mt-6 flex gap-6">
        <aside className="w-[240px] shrink-0 overflow-y-auto custom-scrollbar">
          <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wide text-typography-600">
            Clusters
          </p>
          <nav className="flex flex-col">
            <RailItem
              label="All competencies"
              count={competencies.length}
              isActive={selectedClusterId === ALL}
              onClick={() => setSelectedClusterId(ALL)}
            />
            {allClusters.map(cluster => (
              <RailItem
                key={cluster.id}
                label={cluster.name}
                count={cluster.competencyIds.length}
                isActive={selectedClusterId === cluster.id}
                onClick={() => setSelectedClusterId(cluster.id)}
              />
            ))}
            {/* Only meaningful once at least one cluster exists — with none,
                "Not in a cluster" is just "All competencies" under a second
                name, which reads as a bug. */}
            {allClusters.length > 0 && ungroupedCompetencies.length > 0 && (
              <RailItem
                label="Not in a cluster"
                count={ungroupedCompetencies.length}
                isActive={selectedClusterId === UNGROUPED}
                onClick={() => setSelectedClusterId(UNGROUPED)}
              />
            )}
          </nav>
          {allClusters.length === 0 && (
            <p className="mt-3 px-3 text-xs text-typography-600">
              No clusters yet. A cluster groups competencies — usually a framework you already train
              against — so a simulation can select the whole set in one click. Use “New cluster”
              above to make one.
            </p>
          )}
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-3 pb-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-lg text-typography-900 truncate">
                {selectedCluster?.name ??
                  (selectedClusterId === UNGROUPED ? "Not in a cluster" : "All competencies")}
              </h2>
              <p className="text-xs text-typography-600">
                {visibleCompetencies.length}{" "}
                {visibleCompetencies.length === 1 ? "competency" : "competencies"}
                {selectedCluster
                  ? " — selecting this cluster in a simulation selects all of them"
                  : ""}
              </p>
            </div>
            {selectedCluster && (
              <Button
                variant={ButtonVariant.SECONDARY}
                onClick={() => setEditingCluster(selectedCluster)}
                className="h-[36px] px-4 shrink-0"
              >
                Edit cluster
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <p className="text-typography-700">Loading…</p>
            ) : visibleCompetencies.length === 0 ? (
              <p className="text-typography-700">
                {competencies.length === 0
                  ? "No competencies yet. Click “Create competency” to add one."
                  : selectedCluster
                    ? "Nothing in this cluster yet. Use “Edit cluster” to add competencies to it."
                    : "Every competency belongs to a cluster."}
              </p>
            ) : (
              <Table className="w-full text-left border-collapse">
                <TableHead>
                  <TableRow className="border-b border-border-light text-sm text-typography-700">
                    <TableHeader className="py-3 pr-4 font-medium w-2/5">Competency</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">Helpful behaviours</TableHeader>
                    <TableHeader className="py-3 pr-4 font-medium">
                      Unhelpful behaviours
                    </TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleCompetencies.map(competency => (
                    <CompetencyRow
                      key={competency.id}
                      competency={competency}
                      // Inside one cluster's view every row would carry the
                      // same chip, so the chips only earn their place in the
                      // views that mix clusters together.
                      clusterNames={
                        selectedCluster ? [] : (clusterNamesByCompetency.get(competency.id) ?? [])
                      }
                      onClick={() => openEdit(competency)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      </div>

      {/* Slide-in create/edit panel. */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div className="relative z-50 h-full w-full max-w-[480px] bg-white shadow-xl flex flex-col p-6 gap-5 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-secondary text-typography-900">
                {isEditMode ? "Edit competency" : "Create competency"}
              </h2>
              {isEditMode && saveStatus !== "idle" && (
                <span
                  className={`text-xs ${saveStatus === "error" ? "text-destructive-500" : "text-typography-600"}`}
                >
                  {saveStatusLabel[saveStatus]}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <FormLabel isMandatory>Name</FormLabel>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Active Listening"
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base focus-within:ring-1 focus-within:ring-primary"
              />
            </div>

            <ClusterField
              values={clusters}
              onChange={setClusters}
              options={allClusters.map(cluster => cluster.name)}
            />

            {/* The id used to occupy the widest column in the table, where it
                was noise. It belongs here: rarely needed, but needed exactly
                when someone has this competency open. */}
            {isEditMode && editing?.id && (
              <div className="flex flex-col gap-1">
                <FormLabel>Competency ID</FormLabel>
                <span className="font-mono text-xs text-typography-600 break-all select-all">
                  {editing.id}
                </span>
              </div>
            )}

            {isEditMode ? (
              <>
                <BehaviourTextList
                  label="Helpful behaviours"
                  values={helpful}
                  onChange={setHelpful}
                />
                <BehaviourTextList
                  label="Unhelpful behaviours"
                  values={unhelpful}
                  onChange={setUnhelpful}
                />
                <p className="text-xs text-typography-600 -mt-1">
                  When this competency is selected in a simulation, helpful behaviours fill the
                  “Helper should do” rows and unhelpful ones fill the “Helper should not do” rows.
                  Changes save automatically.
                </p>

                <div className="flex justify-between items-center mt-auto">
                  <button
                    className="text-destructive-500 hover:underline text-sm"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    onClick={closePanel}
                    className="h-[40px] px-5"
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-end gap-3 mt-auto">
                <Button variant={ButtonVariant.TEXT} onClick={closePanel} className="h-[40px] px-5">
                  Cancel
                </Button>
                <Button
                  variant={ButtonVariant.PRIMARY}
                  onClick={handleCreate}
                  disabled={!name.trim() || isCreating}
                  className="h-[40px] px-5"
                >
                  {isCreating ? "Creating…" : "Create"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {editingCluster !== undefined && (
        <ClusterPanel
          cluster={editingCluster}
          competencies={competencies}
          onClose={() => setEditingCluster(undefined)}
        />
      )}

      <ActionConfirmationPopup
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete"
        titleItalic="competency"
        description={`Are you sure you want to delete **${editing?.name ?? ""}**? This cannot be undone.`}
        primaryButton={{ label: "Delete", onClick: handleDelete }}
        secondaryButton={{ label: "Cancel", onClick: () => setShowDeleteConfirm(false) }}
      />
    </div>
  );
};
