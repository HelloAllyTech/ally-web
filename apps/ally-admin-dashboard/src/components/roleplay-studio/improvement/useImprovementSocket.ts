import { useCallback, useEffect, useRef } from "react";

import { io, Socket } from "socket.io-client";

import { LOCAL_STORAGE_KEYS, SocketConnectionPaths } from "@constants";
import {
  RoleplayImprovementRun,
  RoleplayImprovementRunDetail,
  RoleplayImprovementSocketEvent,
} from "@src/types/roleplayStudio";
import { logger } from "@utils";

const logPrefix = "[Roleplay Improvements Socket]";
const MAX_RECONNECTION_ATTEMPTS = 10;

interface UseImprovementSocketProps {
  /** Joins the per-spec run-list room when set. */
  specId?: string | null;
  /** Joins the single-run room when set (full detail snapshots). */
  improvementRunId?: string | null;
  onUpdate?: (data: RoleplayImprovementRun[] | RoleplayImprovementRunDetail) => void;
}

/**
 * Live auto-improve progress over socket.io namespace
 * `roleplay-studio/improvements` (event IMPROVEMENTS_UPDATED). Simplified
 * clone of useScenarioReportsSocket: bearer auth from localStorage, capped
 * exponential-backoff reconnection, rooms re-joined on every (re)connect.
 */
export const useImprovementSocket = ({
  specId,
  improvementRunId,
  onUpdate,
}: UseImprovementSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountedRef = useRef(false);
  const connectRef = useRef<() => void>(() => {});
  // Keep the latest room targets/handler visible to a long-lived socket.
  const targetsRef = useRef({ specId, improvementRunId });
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const joinRooms = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const { specId: spec, improvementRunId: runId } = targetsRef.current;
    if (spec) {
      socket.emit(RoleplayImprovementSocketEvent.JOIN_USER_IMPROVEMENTS_ROOM, { specId: spec });
    }
    if (runId) {
      socket.emit(RoleplayImprovementSocketEvent.JOIN_IMPROVEMENT_ROOM, {
        improvementRunId: runId,
      });
    }
  }, []);

  useEffect(() => {
    targetsRef.current = { specId, improvementRunId };
    joinRooms();
  }, [specId, improvementRunId, joinRooms]);

  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;
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
    if (isUnmountedRef.current || socketRef.current?.connected) return;
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const token = localStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_ACCESS_TOKEN);
    const socket = io(`${baseUrl}/${SocketConnectionPaths.ROLEPLAY_IMPROVEMENTS}`, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 10000,
      forceNew: true,
    });
    socketRef.current = socket;

    socket.on(RoleplayImprovementSocketEvent.CONNECTED, () => {
      logger.info(`${logPrefix} Connected`);
      attemptsRef.current = 0;
      joinRooms();
    });
    socket.on("connect_error", (error: Error) => {
      logger.error(`${logPrefix} Connection error: ${error.message}`);
      scheduleReconnect();
    });
    socket.on("disconnect", (reason: string) => {
      logger.info(`${logPrefix} Disconnected: ${reason}`);
      if (!isUnmountedRef.current) scheduleReconnect();
    });
    socket.on(
      RoleplayImprovementSocketEvent.IMPROVEMENTS_UPDATED,
      (data: RoleplayImprovementRun[] | RoleplayImprovementRunDetail) => {
        onUpdateRef.current?.(data);
      },
    );
  }, [joinRooms, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isUnmountedRef.current = false;
    const timeout = setTimeout(() => connect(), 0);
    return () => {
      clearTimeout(timeout);
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [connect]);
};
