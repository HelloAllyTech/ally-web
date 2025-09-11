import { useState, useEffect } from "react";

import { Room, RoomEvent, Track } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { LIVEKIT_CONFIG, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { RoomStatus } from "@types";
import { decodeUint8ToJson } from "@utils";

import { LiveKitEvent, UseLiveKitRoomReturn } from "./types";

export const useLiveKitRoom = (): UseLiveKitRoomReturn => {
  const navigate = useNavigate();

  const [room] = useState(() => new Room(LIVEKIT_CONFIG));
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(RoomStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveKitEvent[]>([]);
  const [score, setScore] = useState<number>(0);

  const { id } = useParams();

  // TODO: check if this is the correct way to get the room data: recheck keys after api implementation
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

  const onDataReceived = (payload: any, _participant: any, _kind: any, _topic: any) => {
    const eventObj = decodeUint8ToJson(payload) as LiveKitEvent;

    setEvents(prev => [...prev, eventObj]);
    setScore(prev => prev + (eventObj?.data?.score ?? 0));
  };

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

        // Set up audio track listeners
        room.localParticipant.on(RoomEvent.TrackPublished, publication => {
          try {
            if (publication.kind === Track.Kind.Audio) {
              if (!publication.track) {
                throw new Error("Audio track is undefined");
              }
              logger.debug("Attaching audio track...");
              publication.track.attach();
              logger.debug("Audio track attached successfully");
            }
          } catch (error) {
            logger.error(`Error handling audio track: ${error}`);
          }
        });

        room.localParticipant.on(RoomEvent.TrackSubscribed, track => {
          logger.debug(`New track subscribed: ${track.kind}`);
        });

        room.localParticipant.on(RoomEvent.TrackUnsubscribed, track => {
          logger.debug(`Track unsubscribed: ${track.kind}`);
        });

        room.on(RoomEvent.DataReceived, onDataReceived);

        room.on(RoomEvent.Disconnected, () => {
          logger.info("Disconnected from room");
          setRoomStatus(RoomStatus.DISCONNECTED);
        });
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
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();
  };

  useEffect(() => {
    // Add a small delay before connecting to avoid race conditions in StrictMode
    const connectionTimeout = setTimeout(() => {
      connectToRoom();
    }, 100);

    return () => {
      clearTimeout(connectionTimeout);

      // Only disconnect if we're actually connected
      if (isConnected && room.localParticipant) {
        logger.info("Cleaning up: disabling microphone");
        room.localParticipant.setMicrophoneEnabled(false);
        logger.info("Disconnecting from room");
        setRoomStatus(RoomStatus.DISCONNECTED);
        room.disconnect();
      }
    };
  }, [id]);

  useEffect(() => {
    return () => {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ROOM_DATA);
    };
  }, [room]);

  return {
    error,
    events,
    handleEndSession,
    handleRetryConnection,
    room,
    roomStatus,
    score,
    startTime,
  };
};
