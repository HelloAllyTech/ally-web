import { useCallback, useEffect, useRef } from "react";

import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import { useLazyGetRoleplaySpecByIdQuery, useSaveRoleplayDraftMutation } from "@api";
import { en } from "@constants";
import { hydrateSpec, markDraftSaved, selectRoleplaySpecState, setSaveStatus } from "@reducer";
import { normalizeRoleplaySpec } from "@utils/roleplaySpec";

/** Matches CreateSimulation's background autosave cadence. */
export const AUTOSAVE_INTERVAL_MS = 10_000;

/**
 * Background draft persistence for the Roleplay Studio workspace.
 *
 * Every 10s (plus on step change and best-effort on beforeunload) the current
 * spec is PUT to the draft endpoint when — and only when — there are unsaved
 * local edits (revision > savedRevision) and no copilot stream is in flight
 * (streamed patches are persisted server-side already, and saving mid-stream
 * could race the concurrency token).
 *
 * A 409 means our `expectedUpdatedAt` is stale: the server draft moved under
 * us. We surface a toast and re-fetch + re-hydrate the latest draft.
 */
export const useSpecAutosave = ({ step }: { step?: string } = {}) => {
  const dispatch = useDispatch();
  const [saveDraft] = useSaveRoleplayDraftMutation();
  const [fetchSpec] = useLazyGetRoleplaySpecByIdQuery();

  // Latest slice snapshot in a ref so one stable interval sees fresh state.
  const sliceState = useSelector(selectRoleplaySpecState);
  const stateRef = useRef(sliceState);
  stateRef.current = sliceState;

  const savingRef = useRef(false);

  const saveNow = useCallback(async (): Promise<boolean> => {
    const state = stateRef.current;
    if (savingRef.current) return false;
    // Note: no versionId requirement — a brand-new spec has no snapshot yet;
    // the save itself creates one (returned as result.versionId).
    if (!state.spec || !state.specId) return false;
    if (state.isStreaming) return false;
    if (state.revision <= state.savedRevision) return false;

    savingRef.current = true;
    const revisionAtSave = state.revision;
    dispatch(setSaveStatus("saving"));

    try {
      const result = await saveDraft({
        specId: state.specId,
        spec: state.spec,
        expectedUpdatedAt: state.serverUpdatedAt,
      }).unwrap();
      dispatch(
        markDraftSaved({
          revision: revisionAtSave,
          updatedAt: result.updatedAt,
          versionId: result.versionId,
        }),
      );
      return true;
    } catch (error) {
      const status = (error as { status?: number | string })?.status;
      if (status === 409) {
        toast.error(en.roleplayStudio.saveConflict);
        try {
          const detail = await fetchSpec(state.specId).unwrap();
          dispatch(
            hydrateSpec({
              spec: normalizeRoleplaySpec(
                detail.activeVersion?.spec,
                detail.title || en.roleplayStudio.untitledRoleplay,
              ),
              specId: detail.id,
              versionId: detail.activeVersion?.id ?? state.versionId,
              updatedAt: detail.activeVersion?.updatedAt ?? null,
            }),
          );
        } catch {
          // Refetch failed too; leave the conflict state visible.
        }
        dispatch(setSaveStatus("conflict"));
      } else {
        dispatch(setSaveStatus("error"));
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [dispatch, fetchSpec, saveDraft]);

  // Single stable interval.
  useEffect(() => {
    const interval = setInterval(() => void saveNow(), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [saveNow]);

  // Persist when the user switches workspace steps.
  const previousStepRef = useRef(step);
  useEffect(() => {
    if (previousStepRef.current !== step) {
      previousStepRef.current = step;
      void saveNow();
    }
  }, [step, saveNow]);

  // Best-effort flush when the tab closes / reloads.
  useEffect(() => {
    const handleBeforeUnload = () => {
      void saveNow();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveNow]);

  return { saveNow };
};
