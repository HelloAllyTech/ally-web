import { useCallback, useEffect, useRef, useState } from "react";

import { BuilderBuildEvent } from "@types";

import { useAllySocket } from "./useAllySocket";

const NAMESPACE = "builder";

const SocketEvents = {
  JOIN_SESSION: "joinSession",
  LEAVE_SESSION: "leaveSession",
  JOINED: "joined",
  EVENTS: "buildEvents",
} as const;

interface UseBuilderSocketOptions {
  sessionId: string | null;
  /** Called with each pushed batch, already de-duplicated by seq. */
  onEvents: (events: BuilderBuildEvent[]) => void;
  /** Called after a reconnect — deltas missed while down are unrecoverable. */
  onMissedWindow: () => void;
}

/**
 * Live build events over the `/builder` socket namespace.
 *
 * The socket is an optimisation, not a dependency. The session page polls the
 * events endpoint regardless; this makes the feed keep up with the agent in
 * real time. `connected` is exposed so the caller can slow that poll to a
 * heartbeat while pushing works and speed it back up when it stops — a build
 * whose socket died quietly must not look like a build that stopped working.
 */
export const useBuilderSocket = ({
  sessionId,
  onEvents,
  onMissedWindow,
}: UseBuilderSocketOptions) => {
  const [joined, setJoined] = useState(false);
  const seenSeqRef = useRef<Set<number>>(new Set());

  // Held in refs so a fresh callback identity each render does not tear the
  // socket down and rebuild it — `handlers` must be referentially stable.
  const onEventsRef = useRef(onEvents);
  const onMissedWindowRef = useRef(onMissedWindow);
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    onEventsRef.current = onEvents;
    onMissedWindowRef.current = onMissedWindow;
    sessionIdRef.current = sessionId;
  }, [onEvents, onMissedWindow, sessionId]);

  useEffect(() => {
    seenSeqRef.current = new Set();
    setJoined(false);
  }, [sessionId]);

  const handlersRef = useRef<Record<string, (payload: unknown) => void>>({
    [SocketEvents.JOINED]: () => setJoined(true),
    [SocketEvents.EVENTS]: (raw: unknown) => {
      const payload = raw as { sessionId: string; events: BuilderBuildEvent[] };
      if (!payload?.events?.length) return;
      if (payload.sessionId !== sessionIdRef.current) return;

      // De-duplicate by seq: a reconnect replays, and the polling fallback may
      // already have fetched the same rows. Cheaper and far more reliable than
      // trying to make delivery exactly-once.
      const fresh = payload.events.filter(event => !seenSeqRef.current.has(event.seq));
      if (!fresh.length) return;
      for (const event of fresh) seenSeqRef.current.add(event.seq);
      onEventsRef.current(fresh);
    },
  });

  const { emit } = useAllySocket({
    namespace: NAMESPACE,
    label: "builder",
    handlers: handlersRef.current,
    enabled: Boolean(sessionId),
    onConnected: () => {
      if (sessionIdRef.current) {
        emitRef.current?.(SocketEvents.JOIN_SESSION, {
          sessionId: sessionIdRef.current,
        });
      }
    },
    onReconnected: () => {
      // Re-joining is not enough: anything emitted while the socket was down
      // was never queued anywhere, so the caller has to refetch the gap.
      setJoined(false);
      if (sessionIdRef.current) {
        emitRef.current?.(SocketEvents.JOIN_SESSION, {
          sessionId: sessionIdRef.current,
        });
      }
      onMissedWindowRef.current();
    },
  });

  // `emit` is referenced inside callbacks defined above it; the ref breaks
  // that ordering cycle without reordering the hook.
  const emitRef = useRef(emit);
  useEffect(() => {
    emitRef.current = emit;
  }, [emit]);

  useEffect(() => {
    if (!sessionId) return undefined;
    emit(SocketEvents.JOIN_SESSION, { sessionId });
    return () => {
      emit(SocketEvents.LEAVE_SESSION, { sessionId });
      setJoined(false);
    };
  }, [emit, sessionId]);

  /** Called by the page when it fetches events itself, to keep dedup honest. */
  const markSeen = useCallback((events: BuilderBuildEvent[]) => {
    for (const event of events) seenSeqRef.current.add(event.seq);
  }, []);

  return { connected: joined, markSeen };
};
