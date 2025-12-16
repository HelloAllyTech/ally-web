import { useState, useEffect, useCallback, useRef } from "react";

import { LIVEKIT_CONFIG, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { RoomStatus } from "@types";
import { decodeUint8ToJson } from "@utils";
import { Room, RoomEvent } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { AutoTermination } from "@ally-ui-mono/ui-shared/assets";

import { LiveKitEvent, UseLiveKitRoomReturn } from "./types";

export const useLiveKitRoom = (
  handleDisconnect: () => void,
  endSessionButtonRef: any,
): UseLiveKitRoomReturn => {
  const navigate = useNavigate();

  const [room] = useState(() => new Room(LIVEKIT_CONFIG));
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(RoomStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveKitEvent[]>([]);
  const [score, setScore] = useState<number>(0);

  const lastEventTimestampRef = useRef<number | null>(null);
  const autoTerminationAudio = useRef<HTMLAudioElement | null>(new Audio(AutoTermination));

  const { id } = useParams();

  const roomDataString = localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA);
  const roomData = roomDataString ? JSON.parse(roomDataString) : null;
  const startTime = roomData?.createdAt ? new Date(roomData?.createdAt) : new Date();
  const isConnected = roomStatus === RoomStatus.CONNECTED;
  const isConnecting = roomStatus === RoomStatus.CONNECTING;

  const getLiveKitUrl = (): string => {
    const url = roomData?.serverUrl || import.meta.env.VITE_LIVEKIT_URL;
    if (!url) {
      throw new Error("LiveKit URL not found in room data or environment variables");
    }
    return url;
  };

  const onDataReceived = useCallback((payload: any) => {
    const eventObj = decodeUint8ToJson(payload) as LiveKitEvent;
    setEvents(prev => [...prev, eventObj]);
    setScore(prev => prev + (eventObj?.data?.score ?? 0));
  }, []);

  const onRoomDisconnect = useCallback(() => {
    if (!endSessionButtonRef.current) autoTerminationAudio.current?.play();
    setRoomStatus(RoomStatus.DISCONNECTING);
    logger.info("Disconnected from room");
    if (room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
    }
    setTimeout(
      () => {
        setRoomStatus(RoomStatus.DISCONNECTED);
        handleDisconnect();
      },
      endSessionButtonRef.current ? 0 : 4000,
    );
  }, []);

  const cleanupRoom = useCallback(() => {
    try {
      if (room.localParticipant) {
        logger.info("Cleaning up: disabling microphone");
        room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch (cleanupError) {
      logger.warn(`Error while disabling microphone during cleanup: ${cleanupError}`);
    }

    // Remove room-level listeners to prevent duplication on reconnect
    room.off(RoomEvent.DataReceived, onDataReceived);
    room.off(RoomEvent.Disconnected, onRoomDisconnect);
    room.removeAllListeners();

    logger.info("Disconnecting from room");
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();

    // Reset the last event timestamp on cleanup
    lastEventTimestampRef.current = null;
  }, [room, onDataReceived, onRoomDisconnect]);

  const connectToRoom = async () => {
    try {
      if (!id || !roomData) {
        logger.info("Missing roomId or roomData, redirecting to home");
        navigate(ROUTES.LEARN);
        return;
      }

      if (!isConnected && !isConnecting) {
        setRoomStatus(RoomStatus.CONNECTING);
        setError(null);

        const token = roomData?.accessToken;
        const livekitUrl = getLiveKitUrl();

        if (!token) {
          throw new Error("Access token not found in room data");
        }

        logger.info("Connecting to LiveKit room...");
        await room.connect(livekitUrl, token);
        logger.info(`Successfully connected to room: ${room.name}`);

        setRoomStatus(RoomStatus.CONNECTED);

        await room.localParticipant.setMicrophoneEnabled(true);
        logger.info("Microphone enabled");

        // Reset last event timestamp on a fresh connection
        lastEventTimestampRef.current = null;

        room.on(RoomEvent.DataReceived, onDataReceived);
        room.on(RoomEvent.Disconnected, onRoomDisconnect);
      }
    } catch (error) {
      logger.error(`Failed to connect to LiveKit room: ${error}`);
      setRoomStatus(RoomStatus.DISCONNECTED);
      setError(error instanceof Error ? error.message : "Failed to connect to room");
    }
  };

  const handleRetryConnection = () => {
    setError(null);
    connectToRoom();
  };

  useEffect(() => {
    // Add a small delay before connecting to avoid race conditions in StrictMode
    const connectionTimeout = setTimeout(() => {
      connectToRoom();
    }, 100);

    return () => {
      clearTimeout(connectionTimeout);
      // Cleanup on route change to avoid duplicate listeners and ensure disconnect
      cleanupRoom();
    };
  }, [id, cleanupRoom]);

  useEffect(() => {
    return () => {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ROOM_DATA);
      cleanupRoom();
    };
  }, [cleanupRoom]);

  useEffect(() => {
    const handleUnload = () => {
      // Disconnect room on page unload since we disabled auto-disconnect in LIVEKIT_CONFIG
      room.disconnect();
    };

    window.addEventListener("pagehide", handleUnload);

    return () => {
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [room]);

  return {
    error,
    events,
    handleRetryConnection,
    room,
    roomStatus,
    score,
    startTime,
    roomData,
  };
};
