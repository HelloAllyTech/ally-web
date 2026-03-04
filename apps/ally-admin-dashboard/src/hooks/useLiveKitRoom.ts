import { useState, useEffect, useCallback, useRef } from "react";

import { Room, RoomEvent } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { AutoTermination } from "@ally-ui-mono/ui-shared/assets";
import { useEndScenarioPreviewMutation } from "@api";
import { LIVEKIT_CONFIG, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { RoomStatus, UseLiveKitRoomReturn, LiveKitEvent } from "@types";
import { decodeUint8ToJson } from "@utils";

const RINGING_BELL_DELAY = 5000; // 5 seconds for ringing the bell

export const useLiveKitRoom = (
  handleDisconnect: () => void,
  endSessionButtonRef: any,
): UseLiveKitRoomReturn => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [endScenarioPreview] = useEndScenarioPreviewMutation();

  const roomDataString = localStorage.getItem(LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA);
  const roomData = roomDataString ? JSON.parse(roomDataString) : null;

  const [room] = useState(() => new Room(LIVEKIT_CONFIG));
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(RoomStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveKitEvent[]>([]);
  const [detectedEventIds, setDetectedEventIds] = useState<string[]>([]);
  const [score, setScore] = useState<number>(0);
  const [startTime, setStartTime] = useState(null);

  const lastEventTimestampRef = useRef<number | null>(null);
  const autoTerminationAudio = useRef<HTMLAudioElement | null>(new Audio(AutoTermination));

  const isConnected = roomStatus === RoomStatus.CONNECTED;
  const isConnecting = roomStatus === RoomStatus.CONNECTING;

  useEffect(() => {
    return () => autoTerminationAudio.current?.pause();
  }, []);

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
    setDetectedEventIds(prevIds => {
      return [...new Set([...prevIds, ...(eventObj?.data?.detected_event_ids || [])])];
    });
  }, []);

  const onRemoteParticipantConnected = useCallback(() => {
    setStartTime(new Date());
    setRoomStatus(RoomStatus.AGENT_JOINED);
  }, []);

  const onRoomDisconnect = useCallback(() => {
    if (!endSessionButtonRef.current) autoTerminationAudio.current?.play();
    setRoomStatus(RoomStatus.DISCONNECTED);
    setTimeout(
      () => {
        handleDisconnect();
      },
      endSessionButtonRef.current ? 0 : 1000,
    );
  }, []);

  const cleanupRoom = useCallback(() => {
    try {
      if (room.localParticipant) {
        room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch (cleanupError) {
      logger.warn(`Error while disabling microphone during cleanup: ${cleanupError}`);
    }

    // Remove room-level listeners to prevent duplication on reconnect
    room.off(RoomEvent.DataReceived, onDataReceived);
    room.off(RoomEvent.Disconnected, onRoomDisconnect);
    room.off(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);
    room.removeAllListeners();

    logger.info("Disconnecting from room");
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();

    // Reset the last event timestamp on cleanup
    lastEventTimestampRef.current = null;
  }, [room, onDataReceived, onRoomDisconnect, onRemoteParticipantConnected]);

  useEffect(() => {
    // Add a small delay before connecting to avoid race conditions in StrictMode
    const connectionTimeout = setTimeout(() => {
      connectToRoom();
    }, RINGING_BELL_DELAY); // 10 seconds for ringing the bell

    return () => {
      clearTimeout(connectionTimeout);
      // Cleanup on route change to avoid duplicate listeners and ensure disconnect
      cleanupRoom();
    };
  }, [id, cleanupRoom]);

  const connectToRoom = async () => {
    try {
      if (!id || !roomData) {
        navigate(ROUTES.SIMULATION_STUDIO);
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

        await room.connect(livekitUrl, token);
        setRoomStatus(RoomStatus.CONNECTED);
        await room.localParticipant.setMicrophoneEnabled(true);

        // Reset last event timestamp on a fresh connection
        lastEventTimestampRef.current = null;

        room.on(RoomEvent.DataReceived, onDataReceived);
        room.on(RoomEvent.Disconnected, onRoomDisconnect);
        room.on(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);
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

  const handleEndSession = async () => {
    if (room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
    }
    await endScenarioPreview({ roomName: id || "" });
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();
  };

  useEffect(() => {
    return () => {
      cleanupRoom();
    };
  }, [cleanupRoom]);

  return {
    error,
    events,
    handleEndSession,
    handleRetryConnection,
    room: room as unknown as any,
    roomStatus,
    score,
    startTime,
    roomData,
    detectedEventIds,
  };
};
