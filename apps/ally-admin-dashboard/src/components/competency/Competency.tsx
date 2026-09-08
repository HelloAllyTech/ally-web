import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Controller, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Tooltip } from "@ally-ui-mono/ui-shared";
import {
  useCreateCompetencyMutation,
  useDeleteCompetencyMutation,
  useGetCompetenciesQuery,
  useGetCompetencyClustersQuery,
  useLazyGetCompetencyBehavioursQuery,
  useSetCompetencyBehavioursMutation,
  useUpdateCompetencyMutation,
} from "@api";
import { ArrowSolid, Edit, Trash, TooltipIcon } from "@assets";
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

// Label shown when the behaviour selections no longer match any real
// competency and the user-owned custom that captures them hasn't been
// materialised yet (the create is debounced).
const CUSTOM_LABEL = "Custom";

// How long to wait after the last behaviour-table edit before reconciling the
// selection with the table. Mirrors the autosave cadence used by the
// Competencies management page.
const SYNC_DEBOUNCE_MS = 700;

// Behaviours round-trip through the backend by NAME (the behaviour-library ids
// are reassigned on save), so the only stable comparison key is category+name.
// Renaming a default behaviour therefore also reads as a divergence — exactly
// what we want.
const behaviourKey = (category: string, behaviour: HelperTagItem) =>
  `${category}::${(behaviour.name ?? "").trim()}`;

type BehaviourRow = {
  id?: string;
  category?: string;
  behaviors?: HelperTagItem[];
  // Which competency this row was populated from. Client-only: the save
  // payload carries category/behaviors/instructions/stateInstructions and
  // nothing else, so this never reaches the server — it is re-derived from the
  // behaviour overlap when a saved simulation is re-opened.
  competencyId?: string;
};

const isScoredCategory = (category?: string) =>
  category === enumBehaviourInstructionCategory.HELPER_SHOULD_DO ||
  category === enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO;

const namedBehaviours = (row?: BehaviourRow): HelperTagItem[] =>
  (row?.behaviors ?? []).filter(behaviour => behaviour?.name?.trim());

// Signature of the behaviours currently in the Behaviour Instructions /
// Scoring Rubric table. Empty/uncategorised rows contribute nothing.
const tableBehaviourKeys = (rows?: BehaviourRow[]): Set<string> => {
  const keys = new Set<string>();
  for (const row of rows ?? []) {
    if (!isScoredCategory(row?.category)) continue;
    for (const behaviour of namedBehaviours(row)) {
      keys.add(behaviourKey(row.category!, behaviour));
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

// Convert behaviour rows into the { helpful, unhelpful } name lists the
// setCompetencyBehaviours endpoint expects.
const behaviourRowsToPayload = (
  rows: BehaviourRow[],
): { helpful: string[]; unhelpful: string[] } => {
  const helpful: string[] = [];
  const unhelpful: string[] = [];
  for (const row of rows) {
    const target =
      row?.category === enumBehaviourInstructionCategory.HELPER_SHOULD_DO
        ? helpful
        : row?.category === enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO
          ? unhelpful
          : null;
    if (!target) continue;
    for (const behaviour of namedBehaviours(row)) target.push(behaviour.name!.trim());
  }
  return { helpful, unhelpful };
};

/**
 * Works out which competency each behaviour row belongs to.
 *
 * `row.competencyId` is authoritative while the author is in the editor — the
 * auto-populate stamps it. It is absent after a reload (the server stores
 * rows, not their provenance), so fall back to the competency whose mapping
 * shares the most behaviours with the row for that category. Overlap rather
 * than an exact match on purpose: an author who deletes one behaviour from a
 * row must keep that row attributed to the competency it came from, otherwise
 * the edit reads as a brand-new rubric instead of a divergence from that one
 * competency.
 *
 * Rows sharing nothing with any selected competency are orphans — behaviours
 * the author typed that no selected framework covers.
 */
const attributeRows = (
  rows: BehaviourRow[],
  selected: CompetencyType[],
  mappings: Record<string, CompetencyBehavioursResponse | undefined>,
): { byCompetency: Map<string, BehaviourRow[]>; orphans: BehaviourRow[] } => {
  const byCompetency = new Map<string, BehaviourRow[]>();
  const orphans: BehaviourRow[] = [];
  const selectedIds = new Set(selected.map(competency => competency.id));

  const push = (competencyId: string, row: BehaviourRow) =>
    byCompetency.set(competencyId, [...(byCompetency.get(competencyId) ?? []), row]);

  for (const row of rows) {
    if (!isScoredCategory(row?.category)) continue;
    const behaviours = namedBehaviours(row);
    if (behaviours.length === 0) continue;

    if (row.competencyId && selectedIds.has(row.competencyId)) {
      push(row.competencyId, row);
      continue;
    }

    const rowKeys = new Set(behaviours.map(behaviour => behaviourKey(row.category!, behaviour)));
    let best: { competencyId: string; overlap: number } | null = null;
    for (const competency of selected) {
      const mapped = competencyBehaviourKeys(mappings[competency.id]);
      const overlap = [...rowKeys].filter(key => mapped.has(key)).length;
      // Strictly greater, so ties go to the earlier competency in the
      // selection and attribution stays stable across ticks.
      if (overlap > 0 && (!best || overlap > best.overlap)) {
        best = { competencyId: competency.id, overlap };
      }
    }
    if (best) push(best.competencyId, row);
    else orphans.push(row);
  }

  return { byCompetency, orphans };
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

const selectionKeyOf = (selected: CompetencyType[]) =>
  selected
    .map(competency => competency.id)
    .sort()
    .join(",");

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
  // Restricts the picker to a single competency. The Agent Builder Copilot
  // asks for exactly one, and its generation prompt takes one name.
  singleSelect?: boolean;
}

export const Competency: React.FC<CompetencyProps> = ({
  id,
  formMethods,
  isMandatory = false,
  label = "Competency",
  dropUp = false,
  singleSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Latest Controller field, captured during render so handlers outside the
  // Controller render can apply the change.
  const fieldRef = useRef<any>(null);
  // The table signature considered "in sync" with the current selection, plus
  // that selection's key. Re-established whenever the selection changes (a
  // fresh pick or a loaded simulation); a later table change under the same
  // selection is therefore a genuine user edit.
  const baselineRef = useRef<{ selectionKey: string; signature: string } | null>(null);
  // Re-entrancy guard for the async fork/update so rapid edits can't fire two
  // creates.
  const isSyncingRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A custom competency the user asked to delete (confirmation popup).
  const [pendingDelete, setPendingDelete] = useState<CompetencyType | null>(null);
  // Inline-rename state for the user's own custom competencies.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  // Behaviour mappings for the selected competencies, keyed by id. Needed to
  // tell "the table still represents these competencies" from a real edit.
  const [mappings, setMappings] = useState<Record<string, CompetencyBehavioursResponse>>({});

  const { user } = useUser();
  const userId = user?.id;

  const { data: competenciesData, isLoading } = useGetCompetenciesQuery({
    name: searchTerm,
    includeOwnCustom: true,
  });
  const { data: clustersData } = useGetCompetencyClustersQuery();
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

  // Reactive form values so the trigger label re-derives — and the sync effect
  // re-runs — whenever the author edits the behaviour table or the selection.
  const watchedSelection = useWatch({ control, name: FORM_FIELD_IDS.COMPETENCIES }) as
    | CompetencyType[]
    | undefined;
  const primaryCompetency = useWatch({ control, name: FORM_FIELD_IDS.COMPETENCY }) as
    | CompetencyType
    | undefined;
  const behaviourRows = useWatch({ control, name: FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS }) as
    | BehaviourRow[]
    | undefined;

  // A simulation saved before multi-competency selection existed carries only
  // the scalar, so read through to it rather than showing an empty picker.
  const selected = useMemo<CompetencyType[]>(() => {
    if (Array.isArray(watchedSelection) && watchedSelection.length > 0) return watchedSelection;
    return primaryCompetency?.id ? [primaryCompetency] : [];
  }, [watchedSelection, primaryCompetency]);

  const selectedIds = useMemo(() => new Set(selected.map(competency => competency.id)), [selected]);

  // Keep `mappings` populated for everything selected. Fetches only what is
  // missing, so this settles rather than looping.
  useEffect(() => {
    const missing = selected.filter(competency => !mappings[competency.id]);
    if (missing.length === 0) return undefined;
    let cancelled = false;
    void (async () => {
      const loaded = await Promise.all(
        missing.map(async competency => {
          try {
            return [
              competency.id,
              await fetchCompetencyBehaviours(competency.id).unwrap(),
            ] as const;
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      const entries = loaded.filter(
        (entry): entry is readonly [string, CompetencyBehavioursResponse] => entry !== null,
      );
      if (entries.length > 0) {
        setMappings(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, mappings, fetchCompetencyBehaviours]);

  // Memoised because `?? []` mints a new array each render, which would
  // invalidate the grouped-options and trigger-label memos below every time.
  const competencies = useMemo(() => competenciesData?.data ?? [], [competenciesData]);
  const clusters = useMemo(() => clustersData?.data ?? [], [clustersData]);

  // Trigger label. Naming the cluster when the selection is exactly its
  // members is the whole point of clusters — the framework's own name reads
  // far better than "14 competencies" for a set the author picked in one go.
  const { displayLabel, isPlaceholder } = useMemo(() => {
    if (selected.length === 0) {
      return tableBehaviourKeys(behaviourRows).size > 0
        ? { displayLabel: CUSTOM_LABEL, isPlaceholder: false }
        : { displayLabel: en.common.select, isPlaceholder: true };
    }

    const selectionKey = selectionKeyOf(selected);
    const matchingCluster = clusters.find(
      cluster =>
        cluster.competencyIds.length > 0 &&
        selectionKeyOf(
          cluster.competencyIds.map(clusterId => ({ id: clusterId }) as CompetencyType),
        ) === selectionKey,
    );
    if (matchingCluster) {
      return { displayLabel: matchingCluster.name, isPlaceholder: false };
    }

    if (selected.length === 1) {
      const only = selected[0];
      if (only.isCustom) {
        return { displayLabel: displayNameFor(only, userId), isPlaceholder: false };
      }
      const mapping = mappings[only.id];
      // Until the mapping loads there is nothing to compare against, so show
      // the real name rather than flashing "Custom".
      if (!mapping) return { displayLabel: only.name, isPlaceholder: false };
      const matches = keySetsEqual(
        tableBehaviourKeys(behaviourRows),
        competencyBehaviourKeys(mapping),
      );
      return matches
        ? { displayLabel: only.name, isPlaceholder: false }
        : { displayLabel: CUSTOM_LABEL, isPlaceholder: false };
    }

    return {
      displayLabel: `${selected.length} competencies`,
      isPlaceholder: false,
    };
  }, [selected, clusters, mappings, behaviourRows, userId]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  // --- applying a selection ----------------------------------------------

  const buildBehaviourRow = (
    category: enumBehaviourInstructionCategory,
    behaviours: HelperTagItem[],
    competencyId: string,
  ) => ({
    // A stable per-row id is required: the behaviour table identifies the row
    // to mutate by id (rowId), and its edit handler ignores changes whose
    // rowId is null — so without this, the × (remove) and + (add) controls on
    // auto-populated rows would be no-ops.
    id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    behaviors: behaviours,
    competencyId,
    instructions: [],
    stateInstructions: BEHAVIOUR_STATES.map(state => ({
      stateId: state.stateId,
      instruction: "",
    })),
  });

  // Rows a competency contributes: one "should do" and one "should not do",
  // each tagged with the competency so a later edit is attributable to it.
  const rowsForCompetency = (competencyId: string, mapping: CompetencyBehavioursResponse) => {
    const rows = [];
    if (mapping.helpful.length) {
      rows.push(
        buildBehaviourRow(
          enumBehaviourInstructionCategory.HELPER_SHOULD_DO,
          mapping.helpful,
          competencyId,
        ),
      );
    }
    if (mapping.unhelpful.length) {
      rows.push(
        buildBehaviourRow(
          enumBehaviourInstructionCategory.HELPER_SHOULD_NOT_DO,
          mapping.unhelpful,
          competencyId,
        ),
      );
    }
    return rows;
  };

  const writeSelection = (next: CompetencyType[], rows: BehaviourRow[]) => {
    // Record the baseline BEFORE the writes, so the watch/effect that fires
    // next sees a matching baseline and doesn't read our own population as a
    // hand edit.
    baselineRef.current = {
      selectionKey: selectionKeyOf(next),
      signature: signatureOf(tableBehaviourKeys(rows)),
    };
    formMethods.setValue(FORM_FIELD_IDS.COMPETENCIES, next, { shouldDirty: true });
    // The scalar mirrors the first entry: the Copilot wizard and this field's
    // own required-validation both read one competency.
    fieldRef.current?.onChange(next[0]?.id ?? "");
    formMethods.setValue(FORM_FIELD_IDS.COMPETENCY, next[0] ?? "");
    formMethods.setValue(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS, rows, { shouldDirty: true });
  };

  /**
   * Adds competencies to the selection, appending each one's behaviour rows.
   * Additive rather than replacing: with several competencies (or a whole
   * cluster) in play, ticking one more must not discard the rubric already
   * assembled from the others.
   */
  const addCompetencies = async (toAdd: CompetencyType[]) => {
    const newOnes = toAdd.filter(competency => !selectedIds.has(competency.id));
    if (newOnes.length === 0) return;

    const fetched = await Promise.all(
      newOnes.map(async competency => {
        try {
          return [competency.id, await fetchCompetencyBehaviours(competency.id).unwrap()] as const;
        } catch {
          // Non-fatal: a competency whose behaviours can't be fetched is still
          // selected, it just contributes no rows.
          const empty: CompetencyBehavioursResponse = { helpful: [], unhelpful: [] };
          return [competency.id, empty] as const;
        }
      }),
    );
    setMappings(prev => ({ ...prev, ...Object.fromEntries(fetched) }));

    const existingRows = (formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) ??
      []) as BehaviourRow[];
    // Drop the placeholder empty row the table seeds itself with, so the first
    // pick doesn't leave a blank row above the populated ones.
    const keptRows = existingRows.filter(
      row => isScoredCategory(row?.category) && namedBehaviours(row).length > 0,
    );
    const addedRows = fetched.flatMap(([competencyId, mapping]) =>
      rowsForCompetency(competencyId, mapping),
    );

    const base = singleSelect ? [] : selected;
    const next = singleSelect ? newOnes.slice(0, 1) : [...base, ...newOnes];
    writeSelection(next, singleSelect ? addedRows : [...keptRows, ...addedRows]);
  };

  /** Removes a competency and the rows attributed to it. */
  const removeCompetency = (competency: CompetencyType) => {
    const rows = (formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) ??
      []) as BehaviourRow[];
    const { byCompetency } = attributeRows(rows, selected, mappings);
    const doomed = new Set(byCompetency.get(competency.id) ?? []);
    writeSelection(
      selected.filter(entry => entry.id !== competency.id),
      rows.filter(row => !doomed.has(row)),
    );
  };

  const toggleCompetency = (field: any, competency: CompetencyType) => {
    fieldRef.current = field;
    if (singleSelect) setIsOpen(false);
    if (selectedIds.has(competency.id)) {
      if (singleSelect) return; // re-picking the same one is a no-op
      removeCompetency(competency);
    } else {
      void addCompetencies([competency]);
    }
  };

  const toggleCluster = (field: any, competencyIds: string[]) => {
    fieldRef.current = field;
    const members = competencyIds
      .map(memberId => competencies.find(competency => competency.id === memberId))
      .filter((competency): competency is CompetencyType => Boolean(competency));
    const allSelected =
      members.length > 0 && members.every(competency => selectedIds.has(competency.id));

    if (allSelected) {
      const rows = (formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) ??
        []) as BehaviourRow[];
      const { byCompetency } = attributeRows(rows, selected, mappings);
      const doomedIds = new Set(members.map(competency => competency.id));
      const doomedRows = new Set(
        members.flatMap(competency => byCompetency.get(competency.id) ?? []),
      );
      writeSelection(
        selected.filter(competency => !doomedIds.has(competency.id)),
        rows.filter(row => !doomedRows.has(row)),
      );
    } else {
      void addCompetencies(members);
    }
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // --- reconciling hand edits back into the selection ---------------------
  // Fires (debounced) whenever the behaviour table changes AWAY from the
  // in-sync baseline under the same selection — i.e. a genuine ×/+ edit. A
  // bare selection change only re-establishes the baseline and never forks, so
  // opening a saved scenario is inert.
  const syncSelectionFromTable = async () => {
    if (isSyncingRef.current) return;

    // Read the table and the selection LIVE rather than from the watched
    // snapshot this debounced callback closed over 700ms ago: applying a
    // selection writes rows and re-points `baselineRef` synchronously, so a
    // stale snapshot compares the OLD table against the NEW baseline and
    // mistakes a selection change for a hand edit.
    const liveRows = (formMethods.getValues(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS) ??
      []) as BehaviourRow[];
    const liveSelectionRaw = formMethods.getValues(FORM_FIELD_IDS.COMPETENCIES) as
      | CompetencyType[]
      | undefined;
    const livePrimary = formMethods.getValues(FORM_FIELD_IDS.COMPETENCY) as
      | CompetencyType
      | undefined;
    const liveSelection =
      Array.isArray(liveSelectionRaw) && liveSelectionRaw.length > 0
        ? liveSelectionRaw
        : livePrimary?.id
          ? [livePrimary]
          : [];

    const tableKeys = tableBehaviourKeys(liveRows);
    const signature = signatureOf(tableKeys);
    const selectionKey = selectionKeyOf(liveSelection);

    // (Re)establish the baseline when the selection changes (a fresh pick or a
    // loaded simulation). Never fork in that same cycle.
    if (!baselineRef.current || baselineRef.current.selectionKey !== selectionKey) {
      baselineRef.current = { selectionKey, signature };
      return;
    }

    // Same selection, table unchanged from baseline → nothing to do.
    if (signature === baselineRef.current.signature) return;

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
      baselineRef.current = { selectionKey, signature };
      return;
    }

    // Emptying the table entirely is "no selection", not a rubric to capture.
    if (tableKeys.size === 0) {
      writeSelection([], liveRows);
      return;
    }

    // Every selected competency still needs its mapping to judge divergence.
    // Without it we cannot tell an edit from a match, and guessing either way
    // is worse than waiting for the next tick.
    if (liveSelection.some(competency => !mappings[competency.id])) return;

    isSyncingRef.current = true;
    try {
      const { byCompetency, orphans } = attributeRows(liveRows, liveSelection, mappings);
      let next = [...liveSelection];
      let rows = [...liveRows];
      const mappingUpdates: Record<string, CompetencyBehavioursResponse> = {};
      // Customs minted below. If the author's selection moves while these
      // round-trips are in flight, ours is discarded — and these become
      // orphans nothing will ever reference, so they get cleaned up rather
      // than left behind as clutter.
      const createdIds: string[] = [];

      for (const competency of liveSelection) {
        const owned = byCompetency.get(competency.id) ?? [];

        // Its whole row pair is gone → the author removed this competency from
        // the rubric, so drop it from the selection rather than forking an
        // empty custom.
        if (owned.length === 0) {
          next = next.filter(entry => entry.id !== competency.id);
          continue;
        }

        const payload = behaviourRowsToPayload(owned);
        const stillMatches = keySetsEqual(
          tableBehaviourKeys(owned),
          competencyBehaviourKeys(mappings[competency.id]),
        );
        if (stillMatches) continue;

        // Already the author's own custom → just keep its mapping in step.
        if (competency.isCustom) {
          await setCompetencyBehaviours({ id: competency.id, data: payload }).unwrap();
          mappingUpdates[competency.id] = {
            helpful: payload.helpful.map(name => ({ name })),
            unhelpful: payload.unhelpful.map(name => ({ name })),
          } as CompetencyBehavioursResponse;
          continue;
        }

        // A shared competency was edited. Fork ONLY this one into a private
        // copy holding the edit and swap it in place — the rest of the
        // selection stays attributed to their real competencies, which is what
        // keeps the analytics competency map meaningful for the simulation.
        const custom = await createCompetency({ isCustom: true }).unwrap();
        createdIds.push(custom.id);
        await setCompetencyBehaviours({ id: custom.id, data: payload }).unwrap();
        mappingUpdates[custom.id] = {
          helpful: payload.helpful.map(name => ({ name })),
          unhelpful: payload.unhelpful.map(name => ({ name })),
        } as CompetencyBehavioursResponse;
        next = next.map(entry => (entry.id === competency.id ? custom : entry));
        rows = rows.map(row => (owned.includes(row) ? { ...row, competencyId: custom.id } : row));
      }

      // Behaviours no selected framework covers → their own custom, so the
      // rubric never holds rows the selection doesn't account for.
      if (orphans.length > 0) {
        const payload = behaviourRowsToPayload(orphans);
        const custom = await createCompetency({ isCustom: true }).unwrap();
        createdIds.push(custom.id);
        await setCompetencyBehaviours({ id: custom.id, data: payload }).unwrap();
        mappingUpdates[custom.id] = {
          helpful: payload.helpful.map(name => ({ name })),
          unhelpful: payload.unhelpful.map(name => ({ name })),
        } as CompetencyBehavioursResponse;
        next = [...next, custom];
        rows = rows.map(row => (orphans.includes(row) ? { ...row, competencyId: custom.id } : row));
      }

      if (Object.keys(mappingUpdates).length > 0) {
        setMappings(prev => ({ ...prev, ...mappingUpdates }));
      }

      // The author can keep clicking while those round-trips are in flight. If
      // the selection moved under us, ours is stale — drop the baseline and let
      // the next tick reconcile against what they actually chose.
      const selectionNow = selectionKeyOf(
        (formMethods.getValues(FORM_FIELD_IDS.COMPETENCIES) as CompetencyType[] | undefined) ?? [],
      );
      if (selectionNow !== selectionKey) {
        await Promise.all(
          createdIds.map(async createdId => {
            try {
              await deleteCompetency(createdId).unwrap();
            } catch {
              // Non-fatal: worst case an unused custom lingers.
            }
          }),
        );
        baselineRef.current = null;
        return;
      }

      baselineRef.current = { selectionKey: selectionKeyOf(next), signature };
      formMethods.setValue(FORM_FIELD_IDS.COMPETENCIES, next, { shouldDirty: true });
      fieldRef.current?.onChange(next[0]?.id ?? "");
      formMethods.setValue(FORM_FIELD_IDS.COMPETENCY, next[0] ?? "");
      formMethods.setValue(FORM_FIELD_IDS.BEHAVIOR_INSTRUCTIONS, rows, { shouldDirty: true });
    } catch {
      toast.error(en.errors.failedCompetencyCreation);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncSelectionFromTable();
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [behaviourRows, watchedSelection, primaryCompetency, mappings]);

  // --- inline rename / delete of the user's own custom competencies --------
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
      // Keep the trigger label in sync if this competency is selected.
      if (selectedIds.has(competency.id)) {
        const next = selected.map(entry =>
          entry.id === competency.id ? { ...entry, name } : entry,
        );
        formMethods.setValue(FORM_FIELD_IDS.COMPETENCIES, next);
        formMethods.setValue(FORM_FIELD_IDS.COMPETENCY, next[0] ?? "");
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
      if (selectedIds.has(competency.id)) removeCompetency(competency);
    } catch {
      toast.error(en.errors.failedCompetencyDeletion);
    }
  };

  // --- dropdown -----------------------------------------------------------

  // Grouped options: one section per cluster, then everything ungrouped.
  // Membership is many-to-many, so a competency in two clusters shows under
  // both. A cluster with no member matching the current search is dropped
  // rather than shown as an empty heading.
  const groups = useMemo(() => {
    const byId = new Map(competencies.map(competency => [competency.id, competency]));
    const clustered = new Set(clusters.flatMap(cluster => cluster.competencyIds));
    const clusterGroups = clusters
      .map(cluster => ({
        cluster,
        members: cluster.competencyIds
          .map(memberId => byId.get(memberId))
          .filter((competency): competency is CompetencyType => Boolean(competency))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter(group => group.members.length > 0);
    return {
      clusterGroups,
      ungrouped: competencies.filter(competency => !clustered.has(competency.id)),
    };
  }, [competencies, clusters]);

  const renderOption = (field: { value: string }, competency: CompetencyType) => {
    const isSelected = selectedIds.has(competency.id);
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
          if (!isRenaming) toggleCompetency(field, competency);
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
            <span className="flex items-center gap-2 min-w-0">
              {!singleSelect && (
                <input
                  type="checkbox"
                  readOnly
                  checked={isSelected}
                  tabIndex={-1}
                  className="shrink-0 pointer-events-none accent-primary"
                />
              )}
              <span className="text-base truncate">{displayNameFor(competency, userId)}</span>
            </span>
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
  };

  const renderDropdown = (field: { value: string }) => {
    return (
      <div
        // Wider than the trigger on purpose: this field sits in the builder's
        // narrow left column, and competency names like "Exploration &
        // Normalization of Feelings" are unreadable truncated to it.
        className={`absolute left-0 w-full min-w-[320px] bg-white border rounded-md shadow-lg max-h-[280px] overflow-auto z-50 custom-scrollbar ${
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
          <>
            {groups.clusterGroups.map(({ cluster, members }) => {
              const allSelected = members.every(competency => selectedIds.has(competency.id));
              return (
                <div key={cluster.id}>
                  <div className="flex items-center justify-between gap-2 bg-background-secondary px-3 py-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-typography-700 truncate">
                      {cluster.name}
                    </span>
                    {/* Selecting the cluster is the point of the grouping: it
                        takes every competency under it in one click. */}
                    {!singleSelect && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          toggleCluster(field, cluster.competencyIds);
                        }}
                        className="shrink-0 text-xs text-primary hover:underline"
                      >
                        {allSelected ? "Clear all" : "Select all"}
                      </button>
                    )}
                  </div>
                  {members.map(competency => renderOption(field, competency))}
                </div>
              );
            })}

            {groups.ungrouped.length > 0 && (
              <div>
                {groups.clusterGroups.length > 0 && (
                  <div className="bg-background-secondary px-3 py-1.5">
                    <span className="text-xs font-medium uppercase tracking-wide text-typography-700">
                      Ungrouped
                    </span>
                  </div>
                )}
                {groups.ungrouped.map(competency => renderOption(field, competency))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <span className="flex items-center gap-1.5">
          <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
          {!singleSelect && (
            <Tooltip
              label={
                "Pick as many competencies as this roleplay should assess. Competencies are " +
                "grouped into clusters, and “Select all” on a cluster takes every competency " +
                "in it. Each one selected adds a “should do” and a “should not do” row to the " +
                "Scoring Rubric below."
              }
              align="top"
            >
              <button type="button" className="cursor-pointer inline-flex items-center">
                <TooltipIcon />
              </button>
            </Tooltip>
          )}
        </span>
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
      {!singleSelect && selected.length > 1 && (
        <p className="text-xs text-typography-600">
          The Behaviour Instructions / Scoring Rubric table holds one “should do” and one “should
          not do” row per selected competency. Removing a competency’s rows removes it from this
          list; editing them forks that one competency into your own copy.
        </p>
      )}
      {errors && errors[id] && (
        <p className="text-destructive-500 text-sm mt-1">{errors[id]?.message}</p>
      )}

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
