import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import { RoleplayRehearsal, RoleplayRehearsalSocketEvent } from "@src/types/roleplayStudio";
import { logger } from "@utils";

const logPrefix = "[Roleplay Rehearsal Socket]";
const MAX_RECONNECTION_ATTEMPTS = 10;

interface UseRehearsalSocketProps {
  /**
   * The single rehearsal run to watch. When null/undefined the socket stays
   * closed — a live rehearsal only exists during a round's REHEARSING phase, so
   * there's no point holding a connection open otherwise.
   */
  rehearsalId?: string | null;
  onUpdate?: (data: RoleplayRehearsal | RoleplayRehearsal[]) => void;
}

/**
 * Live single-rehearsal progress over socket.io namespace
 * `roleplay-studio/rehearsals` (event REHEARSALS_UPDATED). A near-verbatim clone
 * of useImprovementSocket, pointed at the rehearsal room so the auto-improve
 * live card can tick "N of M rehearsals complete" during the Rehearsing phase.
 * Only ever joins the `rehearsal:<id>` room; connects lazily and tears the
 * connection down whenever `rehearsalId` clears.
 */
export const useRehearsalSocket = ({ rehearsalId, onUpdate }: UseRehearsalSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  // Keep the latest room target/handler visible to a long-lived socket.
  const rehearsalIdRef = useRef(rehearsalId);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const joinRoom = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const id = rehearsalIdRef.current;
    if (id) {
      socket.emit(RoleplayRehearsalSocketEvent.JOIN_REHEARSAL_ROOM, { rehearsalId: id });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    socketRef.current?.removeAllListeners();
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current || !rehearsalIdRef.current) return;
    if (attemptsRef.current >= MAX_RECONNECTION_ATTEMPTS) {
      logger.error(`${logPrefix} Max reconnection attempts reached`);
      return;
    }
    attemptsRef.current++;
    const delay = Math.min(2000 * Math.pow(1.5, attemptsRef.current), 30000);
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = setTimeout(() => {
      if (!isUnmountedRef.current) connectRef.current();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    // No rehearsal to watch → stay closed.
    if (isUnmountedRef.current || !rehearsalIdRef.current || socketRef.current?.connected) return;
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    const socket = io(`${baseUrl}/${SocketConnectionPaths.ROLEPLAY_REHEARSALS}`, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 10000,
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on(RoleplayRehearsalSocketEvent.CONNECTED, () => {
      logger.info(`${logPrefix} Connected`);
      attemptsRef.current = 0;
      joinRoom();
    });
    socket.on("connect_error", (error: Error) => {
      logger.error(`${logPrefix} Connection error: ${error.message}`);
      scheduleReconnect();
    });
    socket.on("disconnect", (reason: string) => {
      logger.info(`${logPrefix} Disconnected: ${reason}`);
      if (!isUnmountedRef.current && rehearsalIdRef.current) scheduleReconnect();
    });
    socket.on(
      RoleplayRehearsalSocketEvent.REHEARSALS_UPDATED,
      (data: RoleplayRehearsal | RoleplayRehearsal[]) => {
        onUpdateRef.current?.(data);
      },
    );
  }, [joinRoom, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Lifecycle tied to the watched rehearsal: connect (and join) when an id
  // appears, tear down when it clears.
  useEffect(() => {
    isUnmountedRef.current = false;
    rehearsalIdRef.current = rehearsalId;
    attemptsRef.current = 0;
    if (rehearsalId) {
      if (socketRef.current?.connected) {
        joinRoom();
      } else {
        connect();
      }
    } else {
      disconnect();
    }
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [rehearsalId, connect, disconnect, joinRoom]);
};
