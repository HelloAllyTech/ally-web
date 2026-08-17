import { useCallback, useEffect, useMemo, useRef } from "react";

import { baseAPI } from "@api";
import { TAG_TYPES } from "@constants";
import { AllySocketStatus, useAllySocket } from "@hooks";
import { store } from "@store";

/** Wire names from ally-be's RoadmapEvents enum. Must match exactly. */
export enum RoadmapSocketEvent {
  CONNECTED = "CONNECTED",
  JOIN_BOARD = "JOIN_BOARD",
  JOIN_OPPORTUNITY = "JOIN_OPPORTUNITY",
  LEAVE_OPPORTUNITY = "LEAVE_OPPORTUNITY",
  ALLOCATION_CHANGED = "ALLOCATION_CHANGED",
  OPPORTUNITY_UPSERTED = "OPPORTUNITY_UPSERTED",
  OPPORTUNITY_DELETED = "OPPORTUNITY_DELETED",
  COMMENT_CHANGED = "COMMENT_CHANGED",
  ROADMAP_INVALIDATED = "ROADMAP_INVALIDATED",
}

/** Every server→client payload carries the actor, which is what makes echo suppression possible. */
interface RoadmapEventBase {
  actorId?: number;
}

/** ROADMAP_INVALIDATED's reason, from ally-be's RoadmapEvent union. */
interface RoadmapInvalidatedEvent extends RoadmapEventBase {
  reason?: string;
}

/**
 * Coalesce window. Split and merge emit a burst of events in one transaction; invalidating per
 * event would fire several refetches for a single user action.
 */
const COALESCE_MS = 250;

/**
 * Past this much downtime, replaying nothing and refetching everything is the honest choice: the
 * deltas we missed are gone, and a board showing stale coins is worse than a brief loading state.
 */
const STALE_AFTER_SECONDS = 30;

interface UseProductRoadmapRealtimeOptions {
  /** Caller's Ally user id, so their own writes can be ignored. */
  currentUserId?: number;
  /** Open drawer's opportunity id — joins that room for comment deltas. */
  openOpportunityId?: string | null;
  /** False when the user cannot read the board; keeps the socket closed. */
  enabled?: boolean;
}

/**
 * Live board updates.
 *
 * WHY TAG INVALIDATION RATHER THAN PATCHING THE CACHE FROM THE PAYLOAD: the list is server-sorted
 * and server-filtered. A coin change can move a row across a `sortBy=priority` boundary or out of a
 * `priorityMin` filter entirely, and no client-side patch can know that without re-running the
 * query. The standalone app's answer was a 400ms-debounced reload of twelve tables; this is the
 * same idea, scoped to the tags that actually changed.
 *
 * OWN-ECHO SUPPRESSION IS THE LOAD-BEARING PART. Every coin click optimistically patches the cache
 * and then round-trips. Without dropping events whose `actorId` is us, the broadcast from our own
 * write invalidates the list mid-interaction and refetches over the optimistic patch — the number
 * visibly snaps back to its old value while the user is still clicking. The backend sends actorId
 * on every payload precisely so this is possible; treat it as a contract, not an optimisation.
 *
 * KNOWN LIMITATION, not fixable here: ally-be has no socket.io Redis adapter, so fan-out is
 * single-instance. With more than one replica, a mutation served by replica A never reaches clients
 * on replica B. Supabase Realtime fanned out globally, so this is a real regression at scale — it is
 * a pre-existing platform property (ScenarioReportGateway has it too), and the fix is
 * `@socket.io/redis-adapter` in main.ts rather than anything in this file.
 */
export const useProductRoadmapRealtime = ({
  currentUserId,
  openOpportunityId,
  enabled = true,
}: UseProductRoadmapRealtimeOptions) => {
  const pendingTagsRef = useRef<Set<string>>(new Set());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openOpportunityRef = useRef<string | null>(null);
  openOpportunityRef.current = openOpportunityId ?? null;

  const flush = useCallback(() => {
    flushTimerRef.current = null;
    const tags = [...pendingTagsRef.current];
    pendingTagsRef.current.clear();
    if (tags.length === 0) return;
    store.dispatch(baseAPI.util.invalidateTags(tags));
  }, []);

  const invalidate = useCallback(
    (tags: string[]) => {
      tags.forEach(tag => pendingTagsRef.current.add(tag));
      if (flushTimerRef.current) return;
      flushTimerRef.current = setTimeout(flush, COALESCE_MS);
    },
    [flush],
  );

  /** True when this event is the echo of something the current user just did. */
  const isOwnEcho = useCallback(
    (event?: RoadmapEventBase) =>
      !!currentUserId && !!event?.actorId && event.actorId === currentUserId,
    [currentUserId],
  );

  const handlers = useMemo(
    () => ({
      [RoadmapSocketEvent.ALLOCATION_CHANGED]: (event: RoadmapEventBase) => {
        // Someone else's vote changed a score, so the list order and every score bar may move.
        // Our OWN vote is already reflected optimistically — see the docblock.
        if (isOwnEcho(event)) return;
        invalidate([TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES]);
      },

      [RoadmapSocketEvent.OPPORTUNITY_UPSERTED]: (event: RoadmapEventBase) => {
        if (isOwnEcho(event)) return;
        invalidate([
          TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
          // A new or edited opportunity can introduce a goal/owner/creator value the facet lists
          // do not yet contain, which would leave the filter row unable to select it.
          TAG_TYPES.PRODUCT_ROADMAP_FACETS,
        ]);
      },

      [RoadmapSocketEvent.OPPORTUNITY_DELETED]: () => {
        // NOT echo-suppressed: a delete removes a row rather than adjusting a number, so there is
        // no optimistic patch to protect, and leaving a deleted row on screen is worse.
        invalidate([
          TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
          TAG_TYPES.PRODUCT_ROADMAP_FACETS,
          // Deleting returns coins to their owners, so the caller's own budget may have changed.
          TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
        ]);
      },

      [RoadmapSocketEvent.COMMENT_CHANGED]: (event: RoadmapEventBase) => {
        if (isOwnEcho(event)) return;
        invalidate([
          TAG_TYPES.PRODUCT_ROADMAP_COMMENTS,
          // The row shows a comment count.
          TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
        ]);
      },

      [RoadmapSocketEvent.ROADMAP_INVALIDATED]: (event: RoadmapInvalidatedEvent) => {
        // Tier 2: split, merge, taxonomy edits. Deliberately NOT echo-suppressed — an owner rename
        // cascades to rows ally-be never touched, so even the actor's own client cannot know what
        // changed without re-querying. This is also why the backend cannot enumerate the delta.
        //
        // 'board' is the ONE reason that IS echo-suppressed, and it has to be: a month-board drag
        // is fully known to the client that performed it, which already applied the exact patch
        // optimistically. Without this the card animates into its new lane, our own broadcast
        // comes back, the board refetches and the card visibly jumps — the same failure the coin
        // input had before actorId existed. Other people's boards still refresh, since the
        // suppression is per-actor.
        if (event?.reason === "board" && isOwnEcho(event)) return;
        invalidate([
          TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
          TAG_TYPES.PRODUCT_ROADMAP_FACETS,
          TAG_TYPES.PRODUCT_ROADMAP_GOALS,
          TAG_TYPES.PRODUCT_ROADMAP_OWNERS,
          TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
        ]);
      },
    }),
    [invalidate, isOwnEcho],
  );

  const { emit } = useAllySocket({
    namespace: "product-roadmap",
    label: "Product Roadmap Socket",
    enabled,
    handlers: handlers as Record<string, (payload: unknown) => void>,
    onConnected: () => {
      emitRef.current?.(RoadmapSocketEvent.JOIN_BOARD);
      // Re-join the drawer's room too: rooms live on the server connection, so a reconnect starts
      // with no memberships and comment deltas would silently stop arriving.
      if (openOpportunityRef.current) {
        emitRef.current?.(RoadmapSocketEvent.JOIN_OPPORTUNITY, {
          opportunityId: openOpportunityRef.current,
        });
      }
    },
    onReconnected: downtimeSeconds => {
      if (downtimeSeconds < STALE_AFTER_SECONDS) return;
      invalidate([
        TAG_TYPES.PRODUCT_ROADMAP_OPPORTUNITIES,
        TAG_TYPES.PRODUCT_ROADMAP_FACETS,
        TAG_TYPES.PRODUCT_ROADMAP_COIN_BUDGET,
        TAG_TYPES.PRODUCT_ROADMAP_COMMENTS,
      ]);
    },
    onStatusChange: (status: AllySocketStatus) => {
      statusRef.current = status;
    },
  });

  // `emit` is created by the hook we are configuring, so onConnected reaches it through a ref.
  const emitRef = useRef<typeof emit | null>(null);
  emitRef.current = emit;
  const statusRef = useRef<AllySocketStatus>(AllySocketStatus.CONNECTING);

  // Follow the drawer: join the new room, leave the old one, so a long session does not accumulate
  // memberships and receive comment events for opportunities nobody is looking at.
  const joinedOpportunityRef = useRef<string | null>(null);
  useEffect(() => {
    const next = openOpportunityId ?? null;
    const previous = joinedOpportunityRef.current;
    if (next === previous) return;

    if (previous) emit(RoadmapSocketEvent.LEAVE_OPPORTUNITY, { opportunityId: previous });
    if (next) emit(RoadmapSocketEvent.JOIN_OPPORTUNITY, { opportunityId: next });
    joinedOpportunityRef.current = next;
  }, [openOpportunityId, emit]);

  useEffect(
    () => () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    },
    [],
  );
};
