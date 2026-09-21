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
  QUEUE_VIEW_ID,
  QUEUE_VIEW_STATE,
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
      // "Queue" is a hardcoded pseudo-view like "All" (see QUEUE_VIEW_ID), not a row in `views`,
      // so it needs its own branch rather than falling into the find-by-id below.
      if (id === QUEUE_VIEW_ID) {
        onApply(QUEUE_VIEW_STATE);
        return;
      }
      const view = id ? views.find(v => v.id === id) : null;
      // Selecting "All" resets to an empty snapshot rather than leaving the last view's filters
      // applied under a tab that claims to be unfiltered.
      onApply(view?.state ?? {});
    },
    [views, setActiveViewId, onApply],
  );

  /**
   * Create a NEW, EMPTY view — not a snapshot of whatever is applied right now.
   *
   * The old behaviour ("save current filters as a view") made the button's result depend on
   * invisible state: the same click produced a different view depending on what you happened to
   * have filtered, and there was no way to make a fresh one without first clearing everything by
   * hand. Creating empty and then filtering into it is the order people actually work in.
   *
   * `onApply({})` IS LOAD-BEARING, not a tidy-up. The autosave above writes `current` onto the
   * active owned view, so creating an empty view while filters are still applied would have the
   * autosave immediately save those filters into it — the new view would silently be a copy of
   * the old one, which is the exact behaviour this change removes.
   */
  // ── landing view ──────────────────────────────────────────────────────────
  /**
   * Apply the active view's STATE on first render, not just its highlight.
   *
   * Two problems, one fix:
   *
   * 1. LANDING. A visit to /product-roadmap with no `?view=` should open the Queue. It cannot be
   *    done by defaulting `activeViewId` to the queue, because "All" selects itself by DELETING
   *    the param — absent would then mean Queue and All would be unreachable. So the absence is
   *    resolved once, here, and written into the URL as `?view=queue`; from then on absent never
   *    recurs and All keeps its own meaning.
   *
   * 2. DEEP LINKS. `selectView` is what applies a view's filters, layout and sort, and it only
   *    ran on click — so opening a shared `?view=<id>` link (or refreshing on one) showed the
   *    tab highlighted over UNFILTERED rows. That was already broken before the Queue existed;
   *    it just became conspicuous once the Queue started hiding its own filter controls.
   *
   * Runs ONCE, ref-guarded. A saved-view id has to wait for `views` to load before its state can
   * be read, so the guard is only set when the view is actually resolved — otherwise the first
   * render would consume the one chance while `views` was still empty.
   */
  const hasAppliedLandingView = useRef(false);
  useEffect(() => {
    if (hasAppliedLandingView.current) return;

    if (activeViewId === null) {
      hasAppliedLandingView.current = true;
      selectView(QUEUE_VIEW_ID);
      return;
    }
    if (activeViewId === QUEUE_VIEW_ID) {
      hasAppliedLandingView.current = true;
      onApply(QUEUE_VIEW_STATE);
      return;
    }
    // A saved view: nothing to apply until its row has arrived.
    const view = views.find(v => v.id === activeViewId);
    if (!view) return;
    hasAppliedLandingView.current = true;
    onApply(view.state);
  }, [activeViewId, views, selectView, onApply]);

  const createNewView = useCallback(
    async (name: string) => {
      try {
        const created = await createView({ name, state: {} }).unwrap();
        onApply({});
        setActiveViewId(created.id);
        toast.success(`Created "${created.name}". Filters you set now are saved to it.`);
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          "Could not create that view.";
        toast.error(message);
      }
    },
    [createView, onApply, setActiveViewId],
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
    createNewView,
    renameView,
    togglePinned,
    removeView,
    reorderViews,
  };
};
