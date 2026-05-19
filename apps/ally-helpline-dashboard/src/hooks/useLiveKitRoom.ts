import { useState, useEffect, useCallback, useRef } from "react";

import { Room, RoomEvent, Participant } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { AutoTermination } from "@ally-ui-mono/ui-shared/assets";
import { LIVEKIT_CONFIG, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import {
  AGENT_STATE_EVENT_TYPE,
  AGENT_STATE_THINKING,
  AGENT_STATE_DONE_THINKING,
  AGENT_STATE_SPEAKING,
} from "@constants";
import { RoomStatus } from "@types";
import { decodeUint8ToJson } from "@utils";

import { AgentTurnStatus, LiveKitEvent, UseLiveKitRoomReturn } from "./types";

// Tiny delay before connect to avoid React 18 StrictMode mount/unmount/mount races
// against the shared Room instance. Was 5000ms when it was also acting as a
// "give the agent time to boot" hack; agent-readiness is now event-driven below.
const STRICT_MODE_GUARD_MS = 100;
// If the agent participant joins but produces no audio (e.g. user-speaks-first
// scenarios), transition out of ringing after this grace window so the user
// isn't stuck on a ringing UI waiting for a sound that won't come.
const AGENT_SILENT_GRACE_MS = 1500;

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
  const [detectedEventIds, setDetectedEventIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState(null);
  const [agentTurnStatus, setAgentTurnStatus] = useState<AgentTurnStatus>("user_turn");

  const agentTurnStatusRef = useRef<AgentTurnStatus>("user_turn");

  const lastEventTimestampRef = useRef<number | null>(null);
  const autoTerminationAudio = useRef<HTMLAudioElement | null>(new Audio(AutoTermination));

  // Tracks whether we've already transitioned to AGENT_JOINED in this session;
  // prevents the grace timer + active-speakers handler from racing.
  const agentJoinedRef = useRef(false);
  const silentGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { id } = useParams();

  const roomDataString = localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA);
  const roomData = roomDataString ? JSON.parse(roomDataString) : null;
  const isConnected = roomStatus === RoomStatus.CONNECTED;
  const isConnecting = roomStatus === RoomStatus.CONNECTING;

  const updateAgentTurnStatus = useCallback((status: AgentTurnStatus) => {
    agentTurnStatusRef.current = status;
    setAgentTurnStatus(status);
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
    // Handle agent state signals — do not treat as score/event data
    if (eventObj?.type === AGENT_STATE_EVENT_TYPE) {
      if (eventObj.state === AGENT_STATE_THINKING) {
        updateAgentTurnStatus(AGENT_STATE_THINKING);
      } else if (eventObj.state === AGENT_STATE_DONE_THINKING) {
        if (agentTurnStatusRef.current !== AGENT_STATE_SPEAKING) {
          updateAgentTurnStatus("user_turn");
        }
      }
      return;
    }

    setEvents(prev => [...prev, eventObj]);
    setScore(prev => prev + (eventObj?.data?.score ?? 0));
    setDetectedEventIds(prevIds => {
      return [...new Set([...prevIds, ...(eventObj?.data?.detected_event_ids || [])])];
    });
  }, []);

  const transitionToAgentJoined = useCallback(() => {
    if (agentJoinedRef.current) return;
    agentJoinedRef.current = true;
    if (silentGraceTimerRef.current) {
      clearTimeout(silentGraceTimerRef.current);
      silentGraceTimerRef.current = null;
    }
    setRoomStatus(RoomStatus.AGENT_JOINED);
  }, []);

  const onRemoteParticipantConnected = useCallback(() => {
    setStartTime(prev => prev || new Date());
    // Turn status flips to "thinking" as soon as the agent participant joins
    // so the UI can show the prep indicator. Room status stays in ringing until
    // the agent actually emits audio (or the silent-grace fallback fires).
    updateAgentTurnStatus("thinking");
    if (!agentJoinedRef.current && !silentGraceTimerRef.current) {
      silentGraceTimerRef.current = setTimeout(() => {
        silentGraceTimerRef.current = null;
        transitionToAgentJoined();
      }, AGENT_SILENT_GRACE_MS);
    }
  }, [transitionToAgentJoined, updateAgentTurnStatus]);

  const onRoomDisconnect = useCallback(() => {
    if (!endSessionButtonRef.current) autoTerminationAudio.current?.play();
    setRoomStatus(RoomStatus.DISCONNECTING);
    logger.info("Disconnected from room");
    if (room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
    }
    // Reset turn status on disconnect
    updateAgentTurnStatus("user_turn");
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
        logger.info("Cleaning up: disabling microphone");
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
    updateAgentTurnStatus("user_turn");
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();

    // Reset ringing/agent-joined tracking so a subsequent connect starts fresh.
    agentJoinedRef.current = false;
    if (silentGraceTimerRef.current) {
      clearTimeout(silentGraceTimerRef.current);
      silentGraceTimerRef.current = null;
    }

    // Reset the last event timestamp on cleanup
    lastEventTimestampRef.current = null;
  }, [room, onDataReceived, onRoomDisconnect, onRemoteParticipantConnected, updateAgentTurnStatus]);

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

        // Register listeners BEFORE enabling mic so we don't miss ParticipantConnected
        // if the agent joins while the browser is showing the mic permission dialog.
        room.on(RoomEvent.DataReceived, onDataReceived);
        room.on(RoomEvent.Disconnected, onRoomDisconnect);
        room.on(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);

        // Speaking detection — determines SPEAKING vs USER_TURN states, and
        // the first agent-speaking event also ends the ringing UI.
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          const agentSpeaking = speakers.some(s => s.identity !== room.localParticipant.identity);
          if (agentSpeaking) {
            transitionToAgentJoined();
            updateAgentTurnStatus(AGENT_STATE_SPEAKING);
          } else {
            if (agentTurnStatusRef.current !== AGENT_STATE_THINKING) {
              updateAgentTurnStatus("user_turn");
            }
          }
        });

        // Handle agent already present in the room (e.g. fast re-join or cache hit)
        if (room.remoteParticipants.size > 0) {
          logger.info("Agent already in room at connect time, marking as joined");
          onRemoteParticipantConnected();
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        logger.info("Microphone enabled");

        // Reset last event timestamp on a fresh connection
        lastEventTimestampRef.current = null;
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
    // Connect right away; ringing UI is gated by roomStatus !== AGENT_JOINED and
    // is left in place until the agent emits audio (or the silent-grace fallback).
    // A tiny delay is kept solely to dodge StrictMode mount/unmount races.
    const connectionTimeout = setTimeout(() => {
      connectToRoom();
    }, STRICT_MODE_GUARD_MS);

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

  useEffect(() => {
    return () => autoTerminationAudio.current?.pause();
  }, []);

  return {
    error,
    events,
    handleRetryConnection,
    room,
    roomStatus,
    score,
    startTime,
    roomData,
    detectedEventIds,
    agentTurnStatus,
  };
};
