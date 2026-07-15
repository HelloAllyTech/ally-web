import { useCallback, useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { buildTrackRoute, buildTrackItemRoute } from "@constants";
import { TrackDetail, TrackDetailItem, TrackItemStatus } from "@types";

/**
 * A single item in the flattened player sequence, carrying its owning
 * section so the top bar can render the section title and the segmented
 * rail can group by section.
 */
export interface FlatTrackItem {
  item: TrackDetailItem;
  sectionId: string;
  sectionTitle: string;
  /** Index of the item within its section (0-based). */
  indexInSection: number;
  /** Number of items in the item's section. */
  sectionItemCount: number;
}

/**
 * Flattens a track's sections → ordered item list. Sections and their items
 * are both sorted by `order`. Pure — exported for unit testing.
 */
export const flattenTrackItems = (track: TrackDetail | undefined): FlatTrackItem[] => {
  if (!track) return [];
  const sections = [...track.sections].sort((a, b) => a.order - b.order);
  const flat: FlatTrackItem[] = [];
  for (const section of sections) {
    const items = [...section.items].sort((a, b) => a.order - b.order);
    items.forEach((item, indexInSection) => {
      flat.push({
        item,
        sectionId: section.id,
        sectionTitle: section.title,
        indexInSection,
        sectionItemCount: items.length,
      });
    });
  }
  return flat;
};

/** Index of `itemId` in the flattened list, or -1. Pure. */
export const findItemIndex = (flat: FlatTrackItem[], itemId: string): number =>
  flat.findIndex(f => f.item.id === itemId);

/**
 * Whether the player may advance past `entry`. True when the item is already
 * COMPLETED, or a completion signal was just returned for it in this session.
 * Pure — exported for unit testing.
 */
export const computeCanAdvance = (
  entry: FlatTrackItem | undefined,
  justCompletedItemIds: ReadonlySet<string>,
): boolean => {
  if (!entry) return false;
  if (entry.item.status === TrackItemStatus.COMPLETED) return true;
  return justCompletedItemIds.has(entry.item.id);
};

export interface TrackPlayerNavigation {
  flat: FlatTrackItem[];
  currentIndex: number;
  current: FlatTrackItem | undefined;
  prev: FlatTrackItem | undefined;
  next: FlatTrackItem | undefined;
  hasPrev: boolean;
  hasNext: boolean;
  canAdvance: boolean;
  /** Overall completion percentage across the whole track. */
  overallPct: number;
  goToItem: (itemId: string) => void;
  goPrev: () => void;
  goNext: () => void;
  exitToOverview: () => void;
}

/** Overall completed-item percentage for the whole track. Pure. */
export const computeOverallPct = (flat: FlatTrackItem[]): number => {
  if (flat.length === 0) return 0;
  const completed = flat.filter(f => f.item.status === TrackItemStatus.COMPLETED).length;
  return Math.round((completed / flat.length) * 100);
};

/**
 * Player navigation state machine: flattens the track, locates the current
 * item, and exposes prev/next + advance gating and navigation helpers. The
 * pure helpers above hold all the logic; this wires them to routing.
 */
export const useTrackPlayerNavigation = (
  track: TrackDetail | undefined,
  trackId: string,
  itemId: string,
  justCompletedItemIds: ReadonlySet<string>,
): TrackPlayerNavigation => {
  const navigate = useNavigate();

  const flat = useMemo(() => flattenTrackItems(track), [track]);
  const currentIndex = useMemo(() => findItemIndex(flat, itemId), [flat, itemId]);

  const current = currentIndex >= 0 ? flat[currentIndex] : undefined;
  const prev = currentIndex > 0 ? flat[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < flat.length - 1 ? flat[currentIndex + 1] : undefined;

  const canAdvance = useMemo(
    () => computeCanAdvance(current, justCompletedItemIds),
    [current, justCompletedItemIds],
  );

  const overallPct = useMemo(() => computeOverallPct(flat), [flat]);

  const goToItem = useCallback(
    (id: string) => navigate(buildTrackItemRoute(trackId, id)),
    [navigate, trackId],
  );

  const goPrev = useCallback(() => {
    if (prev) navigate(buildTrackItemRoute(trackId, prev.item.id));
  }, [navigate, prev, trackId]);

  const goNext = useCallback(() => {
    if (next) navigate(buildTrackItemRoute(trackId, next.item.id));
  }, [navigate, next, trackId]);

  const exitToOverview = useCallback(() => navigate(buildTrackRoute(trackId)), [navigate, trackId]);

  return {
    flat,
    currentIndex,
    current,
    prev,
    next,
    hasPrev: Boolean(prev),
    hasNext: Boolean(next),
    canAdvance,
    overallPct,
    goToItem,
    goPrev,
    goNext,
    exitToOverview,
  };
};
