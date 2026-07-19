import { FC, useEffect, useRef, useState } from "react";

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
  useSetCompetencyBehavioursMutation,
  useUpdateCompetencyMutation,
} from "@api";
import { ActionConfirmationPopup, Button, FormLabel } from "@components";
import { ButtonVariant } from "@components/types";
import { Competency } from "@types";

import { BehaviourTextList } from "./BehaviourTextList";

const clean = (arr: string[]) => arr.map(s => s.trim()).filter(Boolean);
const serialize = (name: string, helpful: string[], unhelpful: string[]) =>
  JSON.stringify({ name: name.trim(), helpful: clean(helpful), unhelpful: clean(unhelpful) });

type SaveStatus = "idle" | "saving" | "saved" | "error";

// One row of the competencies table. Behaviours aren't part of the list
// response, so each row fetches its own (RTK Query dedupes/caches these).
const CompetencyRow: FC<{ competency: Competency; onClick: () => void }> = ({
  competency,
  onClick,
}) => {
  const { data, isLoading } = useGetCompetencyBehavioursQuery(competency.id);
  const helpful = data?.helpful.map(b => b.name).join(", ");
  const unhelpful = data?.unhelpful.map(b => b.name).join(", ");

  return (
    <TableRow
      onClick={onClick}
      className="border-b border-border-light text-sm text-typography-900 cursor-pointer hover:bg-background-secondary transition-colors align-top"
    >
      <TableCell className="py-3 pr-4 font-mono text-xs text-typography-600 whitespace-nowrap">
        {competency.id}
      </TableCell>
      <TableCell className="py-3 pr-4 font-medium">{competency.name}</TableCell>
      <TableCell className="py-3 pr-4 text-typography-700">
        {isLoading ? "…" : helpful || "—"}
      </TableCell>
      <TableCell className="py-3 pr-4 text-typography-700">
        {isLoading ? "…" : unhelpful || "—"}
      </TableCell>
    </TableRow>
  );
};

export const Competencies: FC = () => {
  const { data, isLoading } = useGetCompetenciesQuery({});
  const [createCompetency, { isLoading: isCreating }] = useCreateCompetencyMutation();
  const [updateCompetency] = useUpdateCompetencyMutation();
  const [deleteCompetency] = useDeleteCompetencyMutation();
  const [setCompetencyBehaviours] = useSetCompetencyBehavioursMutation();

  // Side-panel state: undefined = closed, null = create, object = edit.
  const [editing, setEditing] = useState<Competency | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [helpful, setHelpful] = useState<string[]>([]);
  const [unhelpful, setUnhelpful] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

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
    setHelpful(h);
    setUnhelpful(u);
    lastSavedRef.current = serialize(editing.name, h, u);
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
    const snapshot = serialize(trimmedName, helpful, unhelpful);
    if (snapshot === lastSavedRef.current) return undefined;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await updateCompetency({ id: editing.id, data: { name: trimmedName } }).unwrap();
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
  }, [name, helpful, unhelpful, editing, updateCompetency, setCompetencyBehaviours]);

  const competencies = data?.data ?? [];
  const isPanelOpen = editing !== undefined;
  const isEditMode = Boolean(editing?.id);

  const openCreate = () => {
    setName("");
    setHelpful([]);
    setUnhelpful([]);
    setSaveStatus("idle");
    seededIdRef.current = null;
    setEditing(null);
  };

  const openEdit = (competency: Competency) => {
    setName(competency.name);
    setHelpful([]);
    setUnhelpful([]);
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
      const created = await createCompetency({ name: name.trim() }).unwrap();
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

  const saveStatusLabel: Record<SaveStatus, string> = {
    idle: "",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Failed to save — retrying on next change",
  };

  return (
    <div className="h-full font-primary flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-2xl text-typography-900 font-secondary">Competencies</h1>
        <Button variant={ButtonVariant.PRIMARY} onClick={openCreate} className="h-[40px] px-5">
          Create competency
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-6">
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : competencies.length === 0 ? (
          <p className="text-typography-700">
            No competencies yet. Click “Create competency” to add one.
          </p>
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium w-[220px]">Competency ID</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium w-1/5">Name</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Helpful behaviours</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Unhelpful behaviours</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {competencies.map(competency => (
                <CompetencyRow
                  key={competency.id}
                  competency={competency}
                  onClick={() => openEdit(competency)}
                />
              ))}
            </TableBody>
          </Table>
        )}
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
