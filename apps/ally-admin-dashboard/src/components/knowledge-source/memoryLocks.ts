/**
 * Trainer-authored memory locks on Knowledge Sources.
 *
 * A source with `unlocksFromStateId` stays hidden from the character until the
 * session reaches that state (or any later one); unset means always available.
 * The runtime rule lives in ally-ai-learn `app/core/graph/knowledge_locks.py`;
 * these helpers only keep the studio's view of it consistent.
 *
 * Pure (no React / RHF) so the rules are unit-testable on their own.
 */

export interface LockableSource {
  id: string;
  title: string;
  content?: string;
  unlocksFromStateId?: string | null;
}

export interface LadderState {
  id: string;
  name: string;
  scoreLower: number | null;
}

/** States in ladder order — ascending scoreLower, the order the runtime reads. */
export const ladderOrder = <T extends LadderState>(states: T[]): T[] =>
  [...states].sort(
    (a, b) =>
      (a.scoreLower ?? Number.NEGATIVE_INFINITY) - (b.scoreLower ?? Number.NEGATIVE_INFINITY),
  );

/** Display name for a state in a picker or summary. */
export const stateLabel = (state: LadderState, index: number): string =>
  state.name?.trim() || `State ${index + 1}`;

/** Sources whose lock opens at exactly this state. */
export const sourcesOpeningAt = <T extends LockableSource>(sources: T[], stateId: string): T[] =>
  sources.filter(source => source.unlocksFromStateId === stateId);

/**
 * Re-point locks when a state is deleted.
 *
 * Moved to the NEXT state up the ladder, so a memory never opens earlier than
 * the trainer intended. Only when the deleted state was the top one does it
 * fall back to the one below — there is nothing later to wait for, and keeping
 * a lock that names a missing state would hide the memory all session (the
 * runtime fails closed, and ally-be rejects it on save).
 */
export const reassignLocksForRemovedState = <T extends LockableSource>(
  sources: T[],
  statesBeforeRemoval: LadderState[],
  removedStateId: string,
): { sources: T[]; moved: number; movedTo: LadderState | null } => {
  const ladder = ladderOrder(statesBeforeRemoval);
  const index = ladder.findIndex(state => state.id === removedStateId);
  const affected = sources.filter(source => source.unlocksFromStateId === removedStateId);
  if (index === -1 || affected.length === 0) {
    return { sources, moved: 0, movedTo: null };
  }
  const target = ladder[index + 1] ?? ladder[index - 1] ?? null;
  return {
    sources: sources.map(source =>
      source.unlocksFromStateId === removedStateId
        ? { ...source, unlocksFromStateId: target?.id ?? null }
        : source,
    ),
    moved: affected.length,
    movedTo: target,
  };
};
