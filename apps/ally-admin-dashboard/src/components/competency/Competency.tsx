import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  useCreateCompetencyMutation,
  useDeleteCompetencyMutation,
  useGetCompetenciesQuery,
  useGetCompetencyBehavioursQuery,
  useLazyGetCompetencyBehavioursQuery,
  useSetCompetencyBehavioursMutation,
  useUpdateCompetencyMutation,
} from "@api";
import { ArrowSolid, Edit, Trash } from "@assets";
import { BEHAVIOUR_STATES, en, FORM_FIELD_IDS } from "@constants";
import { useClickOutside, useUser } from "@hooks";
import {
  Competency as CompetencyType,
  CompetencyBehavioursResponse,
  enumBehaviourInstructionCategory,
  HelperTagItem,
} from "@types";

import { ActionConfirmationPopup } from "../action-confirmation-popup";
import { FormLabel } from "../form-label";

// Label shown briefly when the behaviour selections have diverged from a
// competency's mapping but the user-owned custom competency that captures them
// hasn't been materialised yet (the create is debounced).
const CUSTOM_LABEL = "Custom";

// How long to wait after the last behaviour-table edit before materialising /
// syncing the user's custom competency. Mirrors the autosave cadence used by
// the Competencies management page.
const SYNC_DEBOUNCE_MS = 700;

// Behaviours round-trip through the backend by NAME (the behaviour-library ids
// are reassigned on save), so the only stable comparison key is category+name.
// Renaming a default behaviour therefore also reads as a divergence — exactly
// what we want.
const behaviourKey = (category: string, behaviour: HelperTagItem) =>
  `${category}::${(behaviour.name ?? "").trim()}`;

// Signature of the behaviours currently in the Behaviour Instructions /
// Scoring Rubric table. Empty/uncategorised rows contribute nothing.
const tableBehaviourKeys = (
  rows?: { category?: string; behaviors?: HelperTagItem[] }[],
): Set<string> => {
  const keys = new Set<string>();
  for (const row of rows ?? []) {
    if (
      row?.category !== enumBehaviourInstructionCategory.HELPER_SHOULD_DO &&
      row?.category !== enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO
    ) {
      continue;
    }
    for (const behaviour of (row.behaviors as HelperTagItem[] | undefined) ?? []) {
      if (behaviour?.name?.trim()) keys.add(behaviourKey(row.category, behaviour));
    }
  }
  return keys;
};

// Signature of a competency's canonical mapping (helpful → SHOULD_DO,
// unhelpful → SHOULD_NOT_DO), in the same key space as tableBehaviourKeys.
const competencyBehaviourKeys = (data?: CompetencyBehavioursResponse): Set<string> => {
  const keys = new Set<string>();
  for (const behaviour of data?.helpful ?? []) {
    if (behaviour?.name?.trim()) {
      keys.add(behaviourKey(enumBehaviourInstructionCategory.HELPER_SHOULD_DO, behaviour));
    }
  }
  for (const behaviour of data?.unhelpful ?? []) {
    if (behaviour?.name?.trim()) {
      keys.add(behaviourKey(enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO, behaviour));
    }
  }
  return keys;
};

const keySetsEqual = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every(key => b.has(key));

const signatureOf = (keys: Set<string>) => [...keys].sort().join("|");

// Convert the behaviour table into the { helpful, unhelpful } name lists the
// setCompetencyBehaviours endpoint expects.
const behaviourRowsToPayload = (
  rows?: { category?: string; behaviors?: HelperTagItem[] }[],
): { helpful: string[]; unhelpful: string[] } => {
  const helpful: string[] = [];
  const unhelpful: string[] = [];
  for (const row of rows ?? []) {
    const target =
      row?.category === enumBehaviourInstructionCategory.HELPER_SHOULD_DO
        ? helpful
        : row?.category === enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO
          ? unhelpful
          : null;
    if (!target) continue;
    for (const behaviour of (row.behaviors as HelperTagItem[] | undefined) ?? []) {
      const name = behaviour?.name?.trim();
      if (name) target.push(name);
    }
  }
  return { helpful, unhelpful };
};

// A custom competency is stored as `{ownerId}_custom_{N}`; show the owner the
// friendlier `your_custom_{N}`. Once renamed it no longer matches the pattern,
// so we fall back to the chosen name.
const displayNameFor = (competency: CompetencyType, userId?: number): string => {
  if (competency.isCustom && userId != null) {
    const match = new RegExp(`^${userId}_custom_(\\d+)$`).exec(competency.name);
    if (match) return `your_custom_${match[1]}`;
  }
  return competency.name;
};

interface CompetencyProps {
  id: string;
  formMethods: any;
  isMandatory?: boolean;
  label?: string;
  // When true, the options list opens ABOVE the trigger instead of below.
  // Used where the dropdown sits at the bottom of its container (e.g. the
  // Agent Builder Copilot V2 chat composer) and a downward list would be
  // clipped / off-screen.
  dropUp?: boolean;
}

export const Competency: React.FC<CompetencyProps> = ({
  id,
  formMethods,
  isMandatory = false,
  label = "Competency",
  dropUp = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Latest Controller field, captured during render so handlers outside the
  // Controller render (confirmation, eager-create) can apply the change.
  const fieldRef = useRef<any>(null);
  // The table signature currently considered "in sync" with the selected
  // competency, plus that competency's id. Re-established whenever the
  // competency changes (a fresh selection or a loaded simulation); a later
  // table change under the same competency is therefore a genuine user edit.
  const baselineRef = useRef<{ competencyId: string | null; signature: string } | null>(null);
  // Re-entrancy guard for the async create/update so rapid edits can't fire
  // two creates.
  const isSyncingRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A competency the user picked that's awaiting confirmation because applying
  // it would overwrite existing behaviour selections.
  const [pendingCompetency, setPendingCompetency] = useState<CompetencyType | null>(null);
  // A custom competency the user asked to delete (confirmation popup).
  const [pendingDelete, setPendingDelete] = useState<CompetencyType | null>(null);
  // Inline-rename state for the user's own custom competencies.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const { user } = useUser();
  const userId = user?.id;

  const { data: competenciesData, isLoading } = useGetCompetenciesQuery({
    name: searchTerm,
    includeOwnCustom: true,
  });
  const [fetchCompetencyBehaviours] = useLazyGetCompetencyBehavioursQuery();
  const [createCompetency] = useCreateCompetencyMutation();
  const [setCompetencyBehaviours] = useSetCompetencyBehavioursMutation();
  const [updateCompetency] = useUpdateCompetencyMutation();
  const [deleteCompetency] = useDeleteCompetencyMutation();

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const {
    control,
    getValues,
    formState: { errors },
  } = formMethods;

  // Reactive form values so the trigger label re-derives — and the eager-sync
  // effect re-runs — whenever the user edits the behaviour table or changes
  // the selected competency.
  const selectedCompetency = useWatch({ control, name: "competency" }) as
    | CompetencyType
    | undefined;
  const behaviourRows = useWatch({ control, name: FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS }) as
    | { category?: string; behaviors?: HelperTagItem[] }[]
    | undefined;

  // The selected competency's stored behaviour mapping, used to detect whether
  // the table still represents it. RTK Query caches this (same tag as the
  // auto-populate fetch), so it's not an extra round-trip.
  const { data: selectedCompetencyBehaviours } = useGetCompetencyBehavioursQuery(
    selectedCompetency?.id ?? "",
    { skip: !selectedCompetency?.id },
  );

  // Trigger label. A custom always shows its (your_custom_N / renamed) name.
  // A global shows its name while the table matches, and the transient "Custom"
  // while a divergence is pending materialisation.
  const { displayLabel, isPlaceholder } = useMemo(() => {
    if (selectedCompetency?.id) {
      if (selectedCompetency.isCustom) {
        return { displayLabel: displayNameFor(selectedCompetency, userId), isPlaceholder: false };
      }
      if (!selectedCompetencyBehaviours) {
        return { displayLabel: selectedCompetency.name, isPlaceholder: false };
      }
      const matches = keySetsEqual(
        tableBehaviourKeys(behaviourRows),
        competencyBehaviourKeys(selectedCompetencyBehaviours),
      );
      return matches
        ? { displayLabel: selectedCompetency.name, isPlaceholder: false }
        : { displayLabel: CUSTOM_LABEL, isPlaceholder: false };
    }

    return tableBehaviourKeys(behaviourRows).size > 0
      ? { displayLabel: CUSTOM_LABEL, isPlaceholder: false }
      : { displayLabel: en.common.select, isPlaceholder: true };
  }, [selectedCompetency, selectedCompetencyBehaviours, behaviourRows, userId]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Auto-populate the Behaviour Instructions / Scoring Rubric table from the
  // competency's mapped behaviours: helpful → "Helper should do" rows,
  // unhelpful → "Helper should not do" rows. Per product decision this ALWAYS
  // replaces the existing rows on a user competency change.
  const buildBehaviourRow = (
    category: enumBehaviourInstructionCategory,
    behaviours: HelperTagItem[],
  ) => ({
    // A stable per-row id is required: the behaviour table identifies the row
    // to mutate by id (rowId), and its edit handler ignores changes whose
    // rowId is null — so without this, the × (remove) and + (add) controls on
    // auto-populated rows would be no-ops.
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    behaviors: behaviours,
    instructions: [],
    stateInstructions: BEHAVIOUR_STATES.map(state => ({
      stateId: state.stateId,
      instruction: "",
    })),
  });

  const autoPopulateBehaviourInstructions = async (competencyId: string) => {
    try {
      const { helpful, unhelpful } = await fetchCompetencyBehaviours(competencyId).unwrap();
      const rows: ReturnType<typeof buildBehaviourRow>[] = [];
      if (helpful.length) {
        rows.push(buildBehaviourRow(enumBehaviourInstructionCategory.HELPER_SHOULD_DO, helpful));
      }
      if (unhelpful.length) {
        rows.push(
          buildBehaviourRow(enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO, unhelpful),
        );
      }
      // The table now mirrors this competency's stored mapping, so record it as
      // the in-sync baseline (set BEFORE setValue so the watch/effect that fires
      // next sees the matching baseline and doesn't treat populate as an edit).
      baselineRef.current = {
        competencyId,
        signature: signatureOf(tableBehaviourKeys(rows)),
      };
      formMethods.setValue(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS, rows, {
        shouldDirty: true,
      });
    } catch {
      // Non-fatal: leave the table as-is if behaviours can't be fetched.
    }
  };

  // True when the table already holds behaviour selections that the
  // auto-populate would replace.
  const hasExistingBehaviourSelections = () => {
    const rows = formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) as
      | { behaviors?: unknown[] }[]
      | undefined;
    return (
      Array.isArray(rows) &&
      rows.some(row => Array.isArray(row?.behaviors) && row.behaviors.length > 0)
    );
  };

  const applyCompetency = (competency: CompetencyType) => {
    fieldRef.current?.onChange(competency?.id);
    formMethods.setValue("competency", competency);
    if (competency?.id) {
      void autoPopulateBehaviourInstructions(competency.id);
    }
  };

  const handleSelect = (field: any, competency: CompetencyType) => {
    fieldRef.current = field;
    setIsOpen(false);
    setSearchTerm("");

    const current = formMethods.getValues("competency") as CompetencyType | undefined;
    // Re-selecting the same competency is a no-op.
    if (current?.id && competency?.id && current.id === competency.id) return;

    // Changing competency replaces the current rubric/behaviour selections.
    // Warn first when there's an existing selection to lose; otherwise (e.g.
    // the very first pick on an empty table) apply immediately.
    if (hasExistingBehaviourSelections()) {
      setPendingCompetency(competency);
    } else {
      applyCompetency(competency);
    }
  };

  const confirmCompetencyChange = () => {
    if (pendingCompetency) applyCompetency(pendingCompetency);
    setPendingCompetency(null);
  };

  const cancelCompetencyChange = () => setPendingCompetency(null);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // --- Eager custom-competency materialisation ----------------------------
  // Fires (debounced) whenever the behaviour table changes AWAY from the
  // in-sync baseline under the same competency — i.e. a genuine ×/+ edit. A
  // bare competency change (selection or load) only re-establishes the
  // baseline and never materialises, so opening a saved scenario is inert.
  const syncCustomFromTable = async () => {
    if (isSyncingRef.current) return;
    if (pendingCompetency) return; // awaiting the change-confirmation popup

    // Read the table and the selection LIVE rather than from the watched
    // snapshot this debounced callback closed over 700ms ago: a competency
    // change writes the new mapping into the table and re-points `baselineRef`
    // synchronously, so a stale snapshot compares the OLD table against the
    // NEW baseline and mistakes a competency change for a hand edit.
    const liveRows = formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) as
      | { category?: string; behaviors?: HelperTagItem[] }[]
      | undefined;
    const liveCompetency = formMethods.getValues("competency") as CompetencyType | undefined;
    const tableKeys = tableBehaviourKeys(liveRows);
    const signature = signatureOf(tableKeys);
    const competencyId = liveCompetency?.id ?? null;

    // (Re)establish the baseline when the selected competency changes (a fresh
    // selection or a loaded simulation). Never materialise in that same cycle.
    if (!baselineRef.current || baselineRef.current.competencyId !== competencyId) {
      baselineRef.current = { competencyId, signature };
      return;
    }

    // Same competency, table unchanged from baseline → nothing to do.
    if (signature === baselineRef.current.signature) return;

    // Same competency but the table changed → a genuine user edit (× / +).
    // Emptying the table entirely is treated as "no selection", not a custom.
    if (tableKeys.size === 0) {
      baselineRef.current = { competencyId, signature };
      return;
    }

    // …but only if the author actually made that edit. Rows that arrived from
    // the server are not a divergence to capture: the editor loads a scenario
    // with `formMethods.reset()`, and the behaviour table's own housekeeping
    // writes (empty-row seeding, row-id backfill) deliberately pass
    // `shouldDirty: false` for exactly this reason. Without this gate, a
    // simulation GET that resolves after the first debounce tick leaves an
    // "empty table" baseline recorded, so the freshly loaded rows read as a
    // hand edit — and a draft that merely has a filled Scoring Rubric and no
    // competency yet silently acquires a machine-made `your_custom_N` the
    // moment it's opened.
    if (!formMethods.getFieldState(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS).isDirty) {
      baselineRef.current = { competencyId, signature };
      return;
    }

    const payload = behaviourRowsToPayload(liveRows);

    // Case 1: editing an already-custom competency → keep its mapping in sync.
    if (liveCompetency?.isCustom && competencyId) {
      isSyncingRef.current = true;
      try {
        await setCompetencyBehaviours({ id: competencyId, data: payload }).unwrap();
        baselineRef.current = { competencyId, signature };
      } catch {
        // Non-fatal: a later edit retries.
      } finally {
        isSyncingRef.current = false;
      }
      return;
    }

    // Case 2/3: edited away from a global competency (or typed with none
    // selected) → materialise a single user-owned custom and select it WITHOUT
    // repopulating the table (we keep the user's edits as-is).
    isSyncingRef.current = true;
    try {
      const custom = await createCompetency({ isCustom: true }).unwrap();
      await setCompetencyBehaviours({ id: custom.id, data: payload }).unwrap();
      // Two round-trips happened above, and picking from the dropdown is not
      // blocked while they're in flight. If the author chose a competency by
      // hand in the meantime, that choice wins — writing the materialised
      // custom now would silently replace it, which reads as "the dropdown
      // won't let me select a competency". Drop the baseline so the next tick
      // re-establishes it against whatever they picked.
      const selectedNow =
        (formMethods.getValues("competency") as CompetencyType | undefined)?.id ?? null;
      if (selectedNow !== competencyId) {
        baselineRef.current = null;
        return;
      }
      baselineRef.current = { competencyId: custom.id, signature };
      fieldRef.current?.onChange(custom.id);
      formMethods.setValue("competency", custom);
    } catch {
      toast.error(en.errors.failedCompetencyCreation);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncCustomFromTable();
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [behaviourRows, selectedCompetency, pendingCompetency]);

  // --- Inline rename / delete of the user's own custom competencies --------
  const startRename = (competency: CompetencyType) => {
    setRenamingId(competency.id);
    setRenameValue(displayNameFor(competency, userId));
  };

  const submitRename = async (competency: CompetencyType) => {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name || name === competency.name) return;
    try {
      await updateCompetency({ id: competency.id, data: { name } }).unwrap();
      // Keep the trigger label in sync if this is the selected competency.
      if (selectedCompetency?.id === competency.id) {
        formMethods.setValue("competency", { ...selectedCompetency, name });
      }
    } catch {
      toast.error(en.errors.failedCompetencyUpdate);
    }
  };

  const confirmDelete = async () => {
    const competency = pendingDelete;
    setPendingDelete(null);
    if (!competency) return;
    try {
      await deleteCompetency(competency.id).unwrap();
      // Deleting the selected custom clears the selection and the table.
      if (selectedCompetency?.id === competency.id) {
        fieldRef.current?.onChange("");
        formMethods.setValue("competency", "");
        formMethods.setValue(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS, [], { shouldDirty: true });
        baselineRef.current = null;
      }
    } catch {
      toast.error(en.errors.failedCompetencyDeletion);
    }
  };

  const competencies = competenciesData?.data || [];

  const renderDropdown = (field: { value: string }) => {
    return (
      <div
        className={`absolute left-0 w-full bg-white border rounded-md shadow-lg max-h-[240px] overflow-auto z-50 custom-scrollbar ${
          dropUp ? "bottom-full mb-1" : "top-full mt-1"
        }`}
      >
        <div className="sticky top-0 p-2 bg-white">
          <input
            type="text"
            placeholder={en.common.search}
            value={searchTerm}
            onChange={handleTextChange}
            className="w-full rounded border border-border-light px-3 py-1 bg-white text-md cursor-pointer flex items-center justify-between focus-none"
          />
        </div>
        {isLoading ? (
          <div className="px-3 py-2 text-sm text-typography-800">Loading...</div>
        ) : competencies.length === 0 ? (
          <div className="px-3 py-2 text-sm text-typography-800">
            {en.common.noOptionsAvailable}
          </div>
        ) : (
          competencies.map(competency => {
            const isSelected = selectedCompetency?.id === competency.id;
            const isRenaming = renamingId === competency.id;
            return (
              <div
                key={competency.id}
                className={`group flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? "bg-primary-50 text-primary font-medium"
                    : "text-typography-900 hover:bg-background-secondary"
                } ${isRenaming ? "" : "cursor-pointer"}`}
                onClick={() => {
                  if (!isRenaming) handleSelect(field, competency);
                }}
              >
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => void submitRename(competency)}
                    onKeyDown={e => {
                      if (e.key === "Enter") void submitRename(competency);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="w-full rounded border border-border-light px-2 py-0.5 text-base text-typography-900"
                  />
                ) : (
                  <>
                    <span className="text-base truncate">{displayNameFor(competency, userId)}</span>
                    {competency.isCustom && (
                      <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title={en.common.edit}
                          onClick={e => {
                            e.stopPropagation();
                            startRename(competency);
                          }}
                          className="text-typography-400 hover:text-primary p-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title={en.common.delete}
                          onClick={e => {
                            e.stopPropagation();
                            setPendingDelete(competency);
                          }}
                          className="text-typography-400 hover:text-destructive-500 p-1"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
      </div>
      <div ref={dropdownRef}>
        <div className="relative">
          <Controller
            name={id}
            control={control}
            defaultValue={getValues?.(id) ?? ""}
            rules={{ required: isMandatory ? `${label} is required` : false }}
            render={({ field }) => {
              fieldRef.current = field;
              return (
                <>
                  <div
                    className="w-full rounded border border-border-light px-3 py-1 bg-white text-base cursor-pointer flex items-center justify-between focus-within:ring-1 focus-within:ring-primary"
                    onClick={() => setIsOpen(prev => !prev)}
                  >
                    <span className={isPlaceholder ? "text-typography-600" : "text-typography-900"}>
                      {displayLabel}
                    </span>
                    <span
                      className={`text-typography-600 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      <ArrowSolid />
                    </span>
                  </div>

                  {isOpen && renderDropdown(field)}
                </>
              );
            }}
          />
        </div>
      </div>
      {errors && errors[id] && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id]?.message}</p>
      )}

      <ActionConfirmationPopup
        isOpen={Boolean(pendingCompetency)}
        onClose={cancelCompetencyChange}
        title="Change"
        titleItalic="competency"
        description={
          "Changing the competency will replace the current Behaviour Instructions / Scoring " +
          "Rubric selections with the behaviours mapped to the new competency. Do you want to continue?"
        }
        primaryButton={{ label: "Accept", onClick: confirmCompetencyChange }}
        secondaryButton={{ label: "Cancel", onClick: cancelCompetencyChange }}
      />

      <ActionConfirmationPopup
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete"
        titleItalic="competency"
        description={
          "This permanently deletes your custom competency. Any simulation still using it will " +
          "keep its behaviours, but the competency won't be selectable again. Do you want to continue?"
        }
        primaryButton={{ label: en.common.delete, onClick: () => void confirmDelete() }}
        secondaryButton={{ label: en.common.cancel, onClick: () => setPendingDelete(null) }}
      />
    </div>
  );
};
