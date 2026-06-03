/**
 * Per-simulation state entry as stored on `Scenarios.metadata.states`.
 * Mirrors the ally-be `SimulationState` interface. Re-declared here to
 * avoid a hard cross-package type dependency.
 *
 * Lives in its own file (separate from StatesEditor.tsx) so the pure
 * `cascadeBoundEdit` helper can share the type without dragging the
 * component's Redux/API imports through to unit tests.
 */
export interface SimulationStateFormValue {
  id: string;
  name: string;
  guidelines: string;
  isStarting: boolean;
  scoreLower: number | null;
  scoreUpper: number | null;
  ragEnabled: boolean;
}
