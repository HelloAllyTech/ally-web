import { useCallback, useEffect, useMemo, useRef } from "react";

import { toast } from "sonner";

import {
  productRoadmapAPI,
  useCreateRoadmapSavedViewMutation,
  useDeleteRoadmapSavedViewMutation,
  useGetRoadmapSavedViewsQuery,
  useGetRoadmapViewOrderQuery,
  usePinRoadmapSavedViewMutation,
  useSetRoadmapViewOrderMutation,
  useUpdateRoadmapSavedViewMutation,
} from "@api";
import { store } from "@store";
import { RoadmapSavedView, RoadmapViewState } from "@types";

import {
  applySavedViewOrder,
  isValidViewDrop,
  isViewDirty,
  serializeViewState,
} from "./utils/views";

/** The source used 800ms; keeping it means the same feel for anyone migrating over. */
const AUTOSAVE_DEBOUNCE_MS = 800;

interface UseSavedViewsOptions {
  /** The board's live filter/sort state. */
  current: RoadmapViewState;
  /** Apply a saved snapshot to the board. */
  onApply: (state: RoadmapViewState) => void;
  /** Active view id from the URL (?view=), or null for the unsaved "All" tab. */
  activeViewId: string | null;
  setActiveViewId: (id: string | null) => void;
  canVote: boolean;
  canManage: boolean;
  currentUserId?: number;
}

/**
 * Saved views: the named filter/sort snapshots rendered as a sub-tab strip.
 *
 * Three behaviours worth knowing:
 *
 * 1. AUTOSAVE IS OWNER-ONLY. Tweaking filters while a view you own is active saves after a
 *    debounce. Tweaking them on someone else's PINNED view does not — that is transient
 *    exploration, and silently rewriting a shared view under other people would be hostile.
 *
 * 2. THE DIRTY CHECK USES A KEY-ORDERED SERIALISATION. Postgres jsonb does not preserve key
 *    order, so comparing raw JSON.stringify output makes every view look permanently dirty.
 *    See serializeViewState.
 *
 * 3. REORDER IS OPTIMISTIC WITH ROLLBACK, in the shape of useUser.reorderSidebar: patch the
 *    cache, fire the mutation, undo and toast on failure. The mutation carries no cache tags
 *    precisely so this patch is the update path.
 */
export const useSavedViews = ({
  current,
  onApply,
  activeViewId,
  setActiveViewId,
  canVote,
  canManage,
  currentUserId,
}: UseSavedViewsOptions) => {
  const { data: rawViews } = useGetRoadmapSavedViewsQuery();
  const { data: orderData } = useGetRoadmapViewOrderQuery();

  const [createView] = useCreateRoadmapSavedViewMutation();
  const [updateView] = useUpdateRoadmapSavedViewMutation();
  const [pinView] = usePinRoadmapSavedViewMutation();
  const [deleteView] = useDeleteRoadmapSavedViewMutation();
  const [setViewOrder] = useSetRoadmapViewOrderMutation();

  const views = useMemo(
    () => applySavedViewOrder(rawViews ?? [], orderData?.viewIds),
    [rawViews, orderData?.viewIds],
  );

  const activeView = useMemo(
    () => views.find(v => v.id === activeViewId) ?? null,
    [views, activeViewId],
  );

  const isOwner = useCallback(
    (view: RoadmapSavedView) => !!currentUserId && view.createdBy === currentUserId,
    [currentUserId],
  );

  const isDirty = !!activeView && isViewDirty(current, activeView.state);

  // ── autosave ──────────────────────────────────────────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Serialised state we have already persisted, so a re-render cannot re-fire the save. */
  const savedSignature = useRef<string | null>(null);

  // Deliberately keyed on the view ID alone, not on activeView: re-seeding the signature whenever
  // the object identity churned would erase the record of what we last persisted and let the
  // autosave below re-fire. ESLint's exhaustive-deps rule isn't configured in this project, so this
  // narrowing is a comment rather than a disable directive (see StatesEditor for the precedent).
  useEffect(() => {
    savedSignature.current = activeView ? serializeViewState(activeView.state) : null;
  }, [activeView?.id]);

  useEffect(() => {
    if (!activeView || !canVote || !isOwner(activeView)) return undefined;

    const signature = serializeViewState(current);
    if (signature === savedSignature.current) return undefined;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      autosaveTimer.current = null;
      try {
        await updateView({ id: activeView.id, state: current }).unwrap();
        savedSignature.current = signature;
      } catch {
        toast.error("Could not autosave this view.");
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [current, activeView, canVote, isOwner, updateView]);

  // ── actions ───────────────────────────────────────────────────────────────
  const selectView = useCallback(
    (id: string | null) => {
      setActiveViewId(id);
      const view = id ? views.find(v => v.id === id) : null;
      // Selecting "All" resets to an empty snapshot rather than leaving the last view's filters
      // applied under a tab that claims to be unfiltered.
      onApply(view?.state ?? {});
    },
    [views, setActiveViewId, onApply],
  );

  const saveCurrentAs = useCallback(
    async (name: string) => {
      try {
        const created = await createView({ name, state: current }).unwrap();
        setActiveViewId(created.id);
        toast.success(`Saved "${created.name}".`);
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ?? "Could not save that view.";
        toast.error(message);
      }
    },
    [createView, current, setActiveViewId],
  );

  const renameView = useCallback(
    async (id: string, name: string) => {
      try {
        await updateView({ id, name }).unwrap();
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not rename that view.";
        toast.error(message);
      }
    },
    [updateView],
  );

  const togglePinned = useCallback(
    async (view: RoadmapSavedView) => {
      try {
        await pinView({ id: view.id, pinned: !view.pinned }).unwrap();
        toast.success(view.pinned ? "Unpinned for everyone." : "Pinned for everyone.");
      } catch (error) {
        // The backend gates pinning on EDIT_PRODUCT_ROADMAP and answers 403 independently.
        const message =
          (error as { data?: { message?: string } })?.data?.message ?? "Could not change pinning.";
        toast.error(message);
      }
    },
    [pinView],
  );

  const removeView = useCallback(
    async (view: RoadmapSavedView) => {
      try {
        await deleteView(view.id).unwrap();
        if (view.id === activeViewId) selectView(null);
        toast.success(`Deleted "${view.name}".`);
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not delete that view.";
        toast.error(message);
      }
    },
    [deleteView, activeViewId, selectView],
  );

  /**
   * Reorder, optimistically. Rejects a drop that would put a personal view above a pinned one:
   * the source persisted such an order and then re-sorted on render, so the tab visibly snapped
   * back. Refusing the drop is clearer than accepting and undoing it.
   */
  const reorderViews = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!isValidViewDrop(views, fromIndex, toIndex)) return;

      const nextIds = views.map(v => v.id);
      const [moved] = nextIds.splice(fromIndex, 1);
      nextIds.splice(toIndex, 0, moved);

      const patch = store.dispatch(
        productRoadmapAPI.util.updateQueryData("getRoadmapViewOrder", undefined, draft => {
          draft.viewIds = nextIds;
        }),
      );
      try {
        await setViewOrder(nextIds).unwrap();
      } catch {
        patch.undo();
        toast.error("Could not save the tab order.");
      }
    },
    [views, setViewOrder],
  );

  return {
    views,
    activeView,
    isDirty,
    isOwner,
    canReorder: canVote,
    canPin: canManage,
    selectView,
    saveCurrentAs,
    renameView,
    togglePinned,
    removeView,
    reorderViews,
  };
};
