import { useState, useEffect, useCallback, useRef } from "react";

import { Room, RoomEvent, Participant } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { AutoTermination } from "@ally-ui-mono/ui-shared/assets";
import { useDispatchPreviewAgentMutation, useEndScenarioPreviewMutation } from "@api";
import {
  LIVEKIT_CONFIG,
  LOCAL_STORAGE_KEYS,
  ROUTES,
  SUPERVISOR_TOPIC,
  SUPERVISOR_NOTE_EVENT_TYPE,
  EVENT_FEED_TOPICS,
} from "@constants";
import { RoomStatus, UseLiveKitRoomReturn, LiveKitEvent, SupervisorNotePayload } from "@types";
import { decodeUint8ToJson } from "@utils";

// Tiny delay before connect to avoid React 18 StrictMode mount/unmount/mount races
// against the shared Room instance. Was 5000ms when it was also acting as a
// "give the agent time to boot" hack; agent-readiness is now event-driven below.
const STRICT_MODE_GUARD_MS = 100;
// If the agent participant joins but produces no audio (e.g. user-speaks-first
// scenarios), transition out of ringing after this grace window so the user
// isn't stuck on a ringing UI waiting for a sound that won't come.
const AGENT_SILENT_GRACE_MS = 1500;

/**
 * Optional behavior overrides so non-simulation flows (e.g. preview
 * live preview) can reuse this hook. Every field defaults to the original
 * simulation-preview behavior, so existing call sites are unchanged.
 */
export interface UseLiveKitRoomConfig {
  /** localStorage key holding the room data payload. */
  storageKey?: string;
  /** Route to bail to when no id/room data is present. */
  fallbackRoute?: string;
  /** Ends the session server-side; defaults to endScenarioPreview. */
  endSession?: (roomName: string) => Promise<unknown>;
  /** Dispatches the agent; defaults to dispatchPreviewAgent. */
  dispatchAgent?: (roomName: string) => Promise<unknown>;
  /** Whether direct agent dispatch applies to this room id. */
  isPreviewRoom?: (id: string) => boolean;
}

export const useLiveKitRoom = (
  handleDisconnect: () => void,
  endSessionButtonRef: any,
  config: UseLiveKitRoomConfig = {},
): UseLiveKitRoomReturn => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [endScenarioPreview] = useEndScenarioPreviewMutation();
  const [dispatchPreviewAgent] = useDispatchPreviewAgentMutation();

  const roomDataString = localStorage.getItem(
    config.storageKey ?? LOCAL_STORAGE_KEYS.PREVIEW_ROOM_DATA,
  );
  const roomData = roomDataString ? JSON.parse(roomDataString) : null;

  const [room] = useState(() => new Room(LIVEKIT_CONFIG));
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(RoomStatus.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<LiveKitEvent[]>([]);
  const [detectedEventIds, setDetectedEventIds] = useState<string[]>([]);
  const [supervisorNotes, setSupervisorNotes] = useState<SupervisorNotePayload[]>([]);
  const [score, setScore] = useState<number>(0);
  const [startTime, setStartTime] = useState(null);

  const lastEventTimestampRef = useRef<number | null>(null);
  const autoTerminationAudio = useRef<HTMLAudioElement | null>(new Audio(AutoTermination));

  // Tracks whether we've already transitioned to AGENT_JOINED in this session;
  // prevents the grace timer + active-speakers handler from racing.
  const agentJoinedRef = useRef(false);
  const silentGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isConnected = roomStatus === RoomStatus.CONNECTED;
  const isConnecting = roomStatus === RoomStatus.CONNECTING;

  useEffect(() => {
    const audio = autoTerminationAudio.current;
    return () => audio?.pause();
  }, []);

  const onDataReceived = useCallback(
    (payload: any, _participant?: any, _kind?: any, topic?: string) => {
      // Live supervisor notes ride their own topic and must be claimed before
      // the fall-through below, which adds any packet to `events` and folds its
      // score in — a note landing there would corrupt the preview's score.
      if (topic === SUPERVISOR_TOPIC) {
        const notePayload = decodeUint8ToJson(payload) as SupervisorNotePayload & {
          type?: string;
        };
        if (notePayload?.type !== SUPERVISOR_NOTE_EVENT_TYPE || !notePayload?.note) return;
        setSupervisorNotes(prev =>
          prev.some(existing => existing.seq === notePayload.seq)
            ? prev
            : [
                ...prev,
                {
                  note: notePayload.note,
                  seq: notePayload.seq,
                  turn_index: notePayload.turn_index,
                  timestamp: notePayload.timestamp,
                },
              ],
        );
        return;
      }

      // Everything below folds the packet into the scored event feed, so only
      // topics that genuinely belong to that feed may reach it.
      if (!EVENT_FEED_TOPICS.includes(topic)) return;

      const eventObj = decodeUint8ToJson(payload) as LiveKitEvent;
      setEvents(prev => [...prev, eventObj]);
      setScore(prev => prev + (eventObj?.data?.score ?? 0));
      setDetectedEventIds(prevIds => {
        return [...new Set([...prevIds, ...(eventObj?.data?.detected_event_ids || [])])];
      });
    },
    [],
  );

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
    // Stay in ringing UI until the agent actually emits audio. For scenarios
    // where the agent waits for the user to speak first, the grace timer below
    // promotes us to AGENT_JOINED so the UI doesn't ring forever.
    if (!agentJoinedRef.current && !silentGraceTimerRef.current) {
      silentGraceTimerRef.current = setTimeout(() => {
        silentGraceTimerRef.current = null;
        transitionToAgentJoined();
      }, AGENT_SILENT_GRACE_MS);
    }
  }, [transitionToAgentJoined]);

  const onActiveSpeakersChanged = useCallback(
    (speakers: Participant[]) => {
      const remoteSpeaking = speakers.some(s => s.identity !== room.localParticipant?.identity);
      if (remoteSpeaking) transitionToAgentJoined();
    },
    [room, transitionToAgentJoined],
  );

  const onRoomDisconnect = useCallback(() => {
    if (!endSessionButtonRef.current) autoTerminationAudio.current?.play();
    setRoomStatus(RoomStatus.DISCONNECTED);
    setTimeout(
      () => {
        handleDisconnect();
      },
      endSessionButtonRef.current ? 0 : 1000,
    );
  }, [handleDisconnect, endSessionButtonRef]);

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
    room.off(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);
    room.removeAllListeners();

    logger.info("Disconnecting from room");
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
  }, [
    room,
    onDataReceived,
    onRoomDisconnect,
    onRemoteParticipantConnected,
    onActiveSpeakersChanged,
  ]);

  const { fallbackRoute, isPreviewRoom, dispatchAgent } = config;
  const connectToRoom = useCallback(async () => {
    try {
      if (!id || !roomData) {
        navigate(fallbackRoute ?? ROUTES.SIMULATION_STUDIO);
        return;
      }

      if (!isConnected && !isConnecting) {
        setRoomStatus(RoomStatus.CONNECTING);
        setError(null);

        const getLiveKitUrl = (): string => {
          const url = roomData?.serverUrl || import.meta.env.VITE_LIVEKIT_URL;
          if (!url) {
            throw new Error("LiveKit URL not found in room data or environment variables");
          }
          return url;
        };

        const token = roomData?.accessToken;
        const livekitUrl = getLiveKitUrl();

        if (!token) {
          throw new Error("Access token not found in room data");
        }

        await room.connect(livekitUrl, token);
        setRoomStatus(RoomStatus.CONNECTED);

        // Register listeners BEFORE dispatch so we don't miss ParticipantConnected if agent joins quickly
        room.on(RoomEvent.DataReceived, onDataReceived);
        room.on(RoomEvent.Disconnected, onRoomDisconnect);
        room.on(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);
        room.on(RoomEvent.ActiveSpeakersChanged, onActiveSpeakersChanged);

        const checkAgentJoined = () => {
          if (room.remoteParticipants.size > 0) {
            onRemoteParticipantConnected();
          }
        };
        checkAgentJoined();

        await room.localParticipant.setMicrophoneEnabled(true);

        const isPreview =
          id && typeof id === "string" && (isPreviewRoom?.(id) ?? id.startsWith("preview-"));
        const shouldDispatch = Boolean(roomData?.useDirectAgentDispatch) && isPreview;
        if (shouldDispatch) {
          try {
            logger.info(`[LiveKit] Dispatching agent to preview room: ${id}`);
            if (dispatchAgent) await dispatchAgent(id);
            else await dispatchPreviewAgent({ roomName: id }).unwrap();
            logger.info(`[LiveKit] Agent dispatch request sent successfully`);
          } catch (dispatchError) {
            logger.warn(
              `Direct agent dispatch failed: ${dispatchError}. If running locally, ensure ally-be has ALLOW_DIRECT_AGENT_DISPATCH or NODE_ENV=development.`,
            );
          }
        } else if (isPreview) {
          logger.info(
            `[LiveKit] Skipping direct agent dispatch for preview room: ${id}. Agent should join via webhook.`,
          );
        }

        // Reset last event timestamp on a fresh connection
        lastEventTimestampRef.current = null;
      }
    } catch (error) {
      logger.error(`Failed to connect to LiveKit room: ${error}`);
      setRoomStatus(RoomStatus.DISCONNECTED);
      setError(error instanceof Error ? error.message : "Failed to connect to room");
    }
  }, [
    id,
    roomData,
    navigate,
    fallbackRoute,
    isConnected,
    isConnecting,
    room,
    onDataReceived,
    onRoomDisconnect,
    onRemoteParticipantConnected,
    onActiveSpeakersChanged,
    isPreviewRoom,
    dispatchAgent,
    dispatchPreviewAgent,
  ]);

  // The connect effect below is scoped to the ROOM, and these refs are what keep
  // it that way.
  //
  // It briefly depended on [id, cleanupRoom, connectToRoom]. Both of those
  // change identity constantly: `connectToRoom` lists `isConnecting` and
  // `isConnected` — which it sets itself, on the line before it awaits
  // `room.connect()` — and `cleanupRoom` reaches `handleDisconnect`, which call
  // sites pass as an inline arrow. So the effect re-ran on almost every render,
  // and its cleanup calls `room.disconnect()`. That aborted the in-flight
  // connect every time: in production the agent joined each preview room within
  // ~5s and the human never joined at all, so the worker declared an orphaned
  // session at 30s while the page sat on "Connecting to session…" forever.
  //
  // Refs rather than a hand-trimmed dependency array, deliberately. Dropping a
  // dep silences `react-hooks/exhaustive-deps` only until the next sweep puts it
  // back, which is precisely how this regressed. A ref is stable, so the lint
  // rule and the effect's intended lifetime agree instead of fighting — and the
  // timeout always calls the freshest closure.
  const connectToRoomRef = useRef(connectToRoom);
  const cleanupRoomRef = useRef(cleanupRoom);
  useEffect(() => {
    connectToRoomRef.current = connectToRoom;
    cleanupRoomRef.current = cleanupRoom;
  });

  useEffect(() => {
    // Connect right away; ringing UI is gated by roomStatus !== AGENT_JOINED and
    // is left in place until the agent emits audio (or the silent-grace fallback).
    // A tiny delay is kept solely to dodge StrictMode mount/unmount races.
    const connectionTimeout = setTimeout(() => {
      connectToRoomRef.current();
    }, STRICT_MODE_GUARD_MS);

    return () => {
      clearTimeout(connectionTimeout);
      // Cleanup on route change to avoid duplicate listeners and ensure disconnect
      cleanupRoomRef.current();
    };
  }, [id]);

  const handleRetryConnection = () => {
    setError(null);
    connectToRoom();
  };

  const handleEndSession = async () => {
    if (room.localParticipant) {
      room.localParticipant.setMicrophoneEnabled(false);
    }
    if (config.endSession) await config.endSession(id || "");
    else await endScenarioPreview({ roomName: id || "" });
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();
  };

  // A second unmount-cleanup effect used to live here, keyed on [cleanupRoom].
  // It was the same defect as the connect effect above and had the same effect
  // on production: `cleanupRoom` changes identity on nearly every render, so its
  // teardown — `room.disconnect()` — ran on nearly every render.
  //
  // Deleted rather than given a ref of its own, because it was only ever
  // guarding unmount, and the connect effect's own cleanup already covers that:
  // React runs every effect's cleanup when the component unmounts. Keeping both
  // would just disconnect the same room twice.

  useEffect(() => {
    if (roomStatus !== RoomStatus.CONNECTED) return () => {};
    const interval = setInterval(() => {
      if (room.remoteParticipants.size > 0) {
        onRemoteParticipantConnected();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [roomStatus, room, onRemoteParticipantConnected]);

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
    supervisorNotes,
  };
};
