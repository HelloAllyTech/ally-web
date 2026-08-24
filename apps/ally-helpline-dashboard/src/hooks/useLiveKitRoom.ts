import { useState, useEffect, useCallback, useRef } from "react";

import { Room, RoomEvent, Participant, RemoteTrackPublication, Track } from "livekit-client";
import { useParams, useNavigate } from "react-router-dom";

import { logger } from "@ally-ui-mono/ui-shared";
import { AutoTermination } from "@ally-ui-mono/ui-shared/assets";
import { LIVEKIT_CONFIG, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import {
  AGENT_STATE_EVENT_TYPE,
  AGENT_STATE_THINKING,
  AGENT_STATE_DONE_THINKING,
  AGENT_STATE_SPEAKING,
  SUPERVISOR_TOPIC,
  SUPERVISOR_NOTE_EVENT_TYPE,
  EVENT_FEED_TOPICS,
} from "@constants";
import { ANALYTICS_EVENTS } from "@constants/analyticsEvents";
import { RoomStatus } from "@types";
import { captureEvent, createAgentAudioTimer, decodeUint8ToJson } from "@utils";

import { AgentTurnStatus, LiveKitEvent, SupervisorNote, UseLiveKitRoomReturn } from "./types";

// Tiny delay before connect to avoid React 18 StrictMode mount/unmount/mount races
// against the shared Room instance. Was 5000ms when it was also acting as a
// "give the agent time to boot" hack; agent-readiness is now event-driven below.
const STRICT_MODE_GUARD_MS = 100;
// If the agent participant joins but produces no audio (e.g. user-speaks-first
// scenarios), transition out of ringing after this grace window so the user
// isn't stuck on a ringing UI waiting for a sound that won't come.
const AGENT_SILENT_GRACE_MS = 1500;
// Cap on the entirely different failure above it: the room connected fine but
// no agent participant ever appears (worker not dispatched, worker crashed on
// boot, agent name mismatch). AGENT_SILENT_GRACE_MS cannot cover this — it only
// starts once a participant has joined — so without this timer the learner
// waits on "Waiting for the agent to join…" forever.
//
// 30s, armed from the moment the ROOM connection succeeds rather than from
// mount, so a slow connect doesn't eat the agent's budget. Chosen to match the
// telephony convention for "did the callee pick up" (~30s of ringing): long
// enough to absorb an agent-worker cold start, short enough that a learner who
// has already sat through the connect phase and the 3-2-1 countdown isn't left
// staring at a lie. Anything under ~20s risks failing a slow-but-healthy
// dispatch; anything over ~45s is indistinguishable from being abandoned.
const AGENT_JOIN_TIMEOUT_MS = 30000;

// livekit-client's ConnectionState values, inlined rather than imported: a
// partial test mock of the module would otherwise turn a routine status
// transition into a TypeError on `ConnectionState.Reconnecting`.
const CONNECTION_STATE = {
  RECONNECTING: "reconnecting",
  SIGNAL_RECONNECTING: "signalReconnecting",
  CONNECTED: "connected",
} as const;

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
  const [supervisorNotes, setSupervisorNotes] = useState<SupervisorNote[]>([]);
  const [startTime, setStartTime] = useState(null);
  const [agentTurnStatus, setAgentTurnStatus] = useState<AgentTurnStatus>("user_turn");
  // The room connected but no agent ever turned up — see AGENT_JOIN_TIMEOUT_MS.
  const [agentJoinTimedOut, setAgentJoinTimedOut] = useState(false);
  // How many supervisor hints the sequence numbers prove we never received.
  const [missedSupervisorNoteCount, setMissedSupervisorNoteCount] = useState(0);

  const agentTurnStatusRef = useRef<AgentTurnStatus>("user_turn");

  const lastEventTimestampRef = useRef<number | null>(null);
  const autoTerminationAudio = useRef<HTMLAudioElement | null>(new Audio(AutoTermination));

  // Tracks whether we've already transitioned to AGENT_JOINED in this session;
  // prevents the grace timer + active-speakers handler from racing.
  const agentJoinedRef = useRef(false);
  const silentGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Separate from agentJoinedRef: that one means "we've shown the live UI",
  // this one means "an agent participant physically appeared in the room". Only
  // the latter disarms the never-joined timeout.
  const agentParticipantSeenRef = useRef(false);
  const agentJoinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Highest supervisor-note seq seen this session. seq is 1-based per session,
  // so a baseline of 0 also catches notes lost before the first one arrived.
  const lastSupervisorSeqRef = useRef(0);

  // Room status to restore when a transient reconnect finishes.
  const preReconnectStatusRef = useRef<RoomStatus | null>(null);

  // Diagnostic only: measures how long after the agent joins the learner can
  // actually hear it, split so a silent agent can be attributed to the
  // subscribe step rather than guessed at. See utils/agentAudioTiming.
  // Lazy initialiser (like `room` above) so this is built once, not per render.
  const [audioTimer] = useState(() =>
    createAgentAudioTimer(
      payload => captureEvent(ANALYTICS_EVENTS.SIMULATION_AGENT_AUDIO_TIMING, payload),
      { getRoomName: () => room?.name ?? null },
    ),
  );

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

  const onDataReceived = useCallback(
    (payload: any, _participant?: any, _kind?: any, topic?: string) => {
      // Live supervisor notes have their own topic. They must be claimed before
      // the fall-through below, which treats any packet as a scored coaching
      // event — a note reaching `events` would corrupt the score.
      if (topic === SUPERVISOR_TOPIC) {
        const notePayload = decodeUint8ToJson(payload) as SupervisorNote & { type?: string };
        if (notePayload?.type !== SUPERVISOR_NOTE_EVENT_TYPE || !notePayload?.note) return;

        // Gap detection, the counterpart to the de-dup below. De-dup catches
        // the SAME seq arriving twice; this catches a seq that skips ahead
        // (5 then 8), which is the only evidence we get that notes 6 and 7
        // were dropped — a data-channel packet lost during a reconnect leaves
        // no other trace. A dup or an out-of-order replay has seq <= the
        // highest seen and is deliberately not counted.
        if (typeof notePayload.seq === "number") {
          const expectedSeq = lastSupervisorSeqRef.current + 1;
          if (notePayload.seq > expectedSeq) {
            const missed = notePayload.seq - expectedSeq;
            logger.warn(
              `Supervisor note sequence gap: expected seq ${expectedSeq}, received ${notePayload.seq} (${missed} note(s) missed)`,
            );
            setMissedSupervisorNoteCount(prev => prev + missed);
          }
          if (notePayload.seq > lastSupervisorSeqRef.current) {
            lastSupervisorSeqRef.current = notePayload.seq;
          }
        }

        setSupervisorNotes(prev =>
          // A reliable packet can be redelivered; seq is assigned per session
          // by the agent, so it is the stable identity of a note.
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
    },
    [],
  );

  const clearAgentJoinTimer = useCallback(() => {
    if (agentJoinTimerRef.current) {
      clearTimeout(agentJoinTimerRef.current);
      agentJoinTimerRef.current = null;
    }
  }, []);

  const transitionToAgentJoined = useCallback(() => {
    if (agentJoinedRef.current) return;
    agentJoinedRef.current = true;
    if (silentGraceTimerRef.current) {
      clearTimeout(silentGraceTimerRef.current);
      silentGraceTimerRef.current = null;
    }
    clearAgentJoinTimer();
    setRoomStatus(RoomStatus.AGENT_JOINED);
  }, [clearAgentJoinTimer]);

  const onRemoteParticipantConnected = useCallback(() => {
    // An agent turned up, so the "never joined" failure is off the table even
    // if it stays silent — AGENT_SILENT_GRACE_MS owns that case from here.
    agentParticipantSeenRef.current = true;
    clearAgentJoinTimer();
    audioTimer.markAgentParticipant();
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
  }, [transitionToAgentJoined, updateAgentTurnStatus, audioTimer, clearAgentJoinTimer]);

  // Arm the "agent never joined" cap. Called once the room connection itself
  // has succeeded, so it measures only the wait for the agent.
  const armAgentJoinTimeout = useCallback(() => {
    clearAgentJoinTimer();
    agentJoinTimerRef.current = setTimeout(() => {
      agentJoinTimerRef.current = null;
      if (agentJoinedRef.current || agentParticipantSeenRef.current) return;
      logger.error(`No agent participant joined the room within ${AGENT_JOIN_TIMEOUT_MS}ms`);
      setAgentJoinTimedOut(true);
    }, AGENT_JOIN_TIMEOUT_MS);
  }, [clearAgentJoinTimer]);

  // LiveKit reconnects transparently on a network blip. Surfacing it is not
  // cosmetic: data-channel packets (supervisor hints) are dropped for the
  // duration, so a UI that keeps claiming CONNECTED is claiming to have
  // received things it did not.
  const onRoomReconnecting = useCallback(() => {
    logger.warn("Room connection dropped — LiveKit is reconnecting");
    setRoomStatus(prev => {
      if (prev === RoomStatus.RECONNECTING) return prev;
      preReconnectStatusRef.current = prev;
      return RoomStatus.RECONNECTING;
    });
  }, []);

  const onRoomReconnected = useCallback(() => {
    logger.info("Room reconnected");
    setRoomStatus(prev => {
      if (prev !== RoomStatus.RECONNECTING) return prev;
      const restored =
        preReconnectStatusRef.current ??
        (agentJoinedRef.current ? RoomStatus.AGENT_JOINED : RoomStatus.CONNECTED);
      preReconnectStatusRef.current = null;
      return restored;
    });
  }, []);

  // Belt-and-braces: some drops surface only as a connection-state change
  // (e.g. signal reconnect) without a Reconnecting event pair.
  const onConnectionStateChanged = useCallback(
    (state: string) => {
      if (
        state === CONNECTION_STATE.RECONNECTING ||
        state === CONNECTION_STATE.SIGNAL_RECONNECTING
      ) {
        onRoomReconnecting();
      } else if (state === CONNECTION_STATE.CONNECTED) {
        onRoomReconnected();
      }
    },
    [onRoomReconnecting, onRoomReconnected],
  );

  // Diagnostic listeners for the agent's audio track. Remote audio is the agent:
  // the egress recorder joins hidden, so clients never see it as a participant.
  const onAgentTrackPublished = useCallback(
    (publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio) audioTimer.markTrackPublished();
    },
    [audioTimer],
  );

  const onAgentTrackSubscribed = useCallback(
    (_track: Track, publication: RemoteTrackPublication) => {
      if (publication.kind === Track.Kind.Audio) audioTimer.markTrackSubscribed();
    },
    [audioTimer],
  );

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

  // Detach every listener this hook attaches. Extracted so the retry path can
  // reuse it: retrying has to disconnect a room that may already be connected,
  // and doing that with RoomEvent.Disconnected still attached would bounce the
  // learner to the post-session summary instead of re-attempting the call.
  const detachRoomListeners = useCallback(() => {
    room.off(RoomEvent.DataReceived, onDataReceived);
    room.off(RoomEvent.Disconnected, onRoomDisconnect);
    room.off(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);
    room.off(RoomEvent.TrackPublished, onAgentTrackPublished);
    room.off(RoomEvent.TrackSubscribed, onAgentTrackSubscribed);
    room.off(RoomEvent.Reconnecting, onRoomReconnecting);
    room.off(RoomEvent.Reconnected, onRoomReconnected);
    room.off(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);
    room.removeAllListeners();
  }, [
    room,
    onDataReceived,
    onRoomDisconnect,
    onRemoteParticipantConnected,
    onAgentTrackPublished,
    onAgentTrackSubscribed,
    onRoomReconnecting,
    onRoomReconnected,
    onConnectionStateChanged,
  ]);

  const cleanupRoom = useCallback(() => {
    try {
      if (room.localParticipant) {
        logger.info("Cleaning up: disabling microphone");
        room.localParticipant.setMicrophoneEnabled(false);
      }
    } catch (cleanupError) {
      logger.warn(`Error while disabling microphone during cleanup: ${cleanupError}`);
    }

    // Report the audio timing before tearing down. If the learner left while the
    // agent was still inaudible this is the ONLY chance to record it — and those
    // are exactly the sessions worth measuring.
    audioTimer.flush("abandoned");
    audioTimer.reset();

    // Remove room-level listeners to prevent duplication on reconnect
    detachRoomListeners();

    logger.info("Disconnecting from room");
    updateAgentTurnStatus("user_turn");
    setRoomStatus(RoomStatus.DISCONNECTED);
    room.disconnect();

    // Reset ringing/agent-joined tracking so a subsequent connect starts fresh.
    agentJoinedRef.current = false;
    agentParticipantSeenRef.current = false;
    preReconnectStatusRef.current = null;
    if (silentGraceTimerRef.current) {
      clearTimeout(silentGraceTimerRef.current);
      silentGraceTimerRef.current = null;
    }
    clearAgentJoinTimer();
    setAgentJoinTimedOut(false);

    // Reset the last event timestamp on cleanup
    lastEventTimestampRef.current = null;
  }, [
    room,
    detachRoomListeners,
    updateAgentTurnStatus,
    audioTimer,
    clearAgentJoinTimer,
  ]);

  // `force` bypasses the already-connected/connecting guard. Only the retry
  // path sets it: after a failed agent-join the room IS connected, so the guard
  // would silently make the retry button do nothing.
  const connectToRoom = async (force = false) => {
    try {
      if (!id || !roomData) {
        logger.info("Missing roomId or roomData, redirecting to home");
        navigate(ROUTES.LEARN);
        return;
      }

      if (force || (!isConnected && !isConnecting)) {
        setRoomStatus(RoomStatus.CONNECTING);
        setError(null);
        setAgentJoinTimedOut(false);

        const token = roomData?.accessToken;
        const livekitUrl = getLiveKitUrl();

        if (!token) {
          throw new Error("Access token not found in room data");
        }

        logger.info("Connecting to LiveKit room...");
        await room.connect(livekitUrl, token);
        logger.info(`Successfully connected to room: ${room.name}`);
        audioTimer.markConnected();

        setRoomStatus(RoomStatus.CONNECTED);

        // The room is up; from here the only thing we're waiting for is the
        // agent, so this is where the never-joined cap starts ticking.
        armAgentJoinTimeout();

        // Register listeners BEFORE enabling mic so we don't miss ParticipantConnected
        // if the agent joins while the browser is showing the mic permission dialog.
        room.on(RoomEvent.DataReceived, onDataReceived);
        room.on(RoomEvent.Disconnected, onRoomDisconnect);
        room.on(RoomEvent.ParticipantConnected, onRemoteParticipantConnected);
        room.on(RoomEvent.TrackPublished, onAgentTrackPublished);
        room.on(RoomEvent.TrackSubscribed, onAgentTrackSubscribed);
        room.on(RoomEvent.Reconnecting, onRoomReconnecting);
        room.on(RoomEvent.Reconnected, onRoomReconnected);
        room.on(RoomEvent.ConnectionStateChanged, onConnectionStateChanged);

        // Speaking detection — determines SPEAKING vs USER_TURN states, and
        // the first agent-speaking event also ends the ringing UI.
        room.on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          const agentSpeaking = speakers.some(s => s.identity !== room.localParticipant.identity);
          if (agentSpeaking) {
            audioTimer.markFirstAudio();
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
          // Its audio track may also already exist, in which case the events above
          // never fire for it — record what is already there so the measurement
          // isn't silently skipped on this path.
          room.remoteParticipants.forEach(participant => {
            participant.audioTrackPublications.forEach(publication => {
              audioTimer.markTrackPublished();
              if (publication.isSubscribed) audioTimer.markTrackSubscribed();
            });
          });
        }

        await room.localParticipant.setMicrophoneEnabled(true);
        logger.info("Microphone enabled");

        // Reset last event timestamp on a fresh connection
        lastEventTimestampRef.current = null;
      }
    } catch (error) {
      logger.error(`Failed to connect to LiveKit room: ${error}`);
      clearAgentJoinTimer();
      setRoomStatus(RoomStatus.DISCONNECTED);
      setError(error instanceof Error ? error.message : "Failed to connect to room");
    }
  };

  /**
   * Start the whole attempt over from either failure state (connect failed, or
   * connected-but-no-agent). Both need the room torn down first — the
   * no-agent case has a live connection and registered listeners — and the
   * teardown has to happen with listeners detached, or RoomEvent.Disconnected
   * would fire handleDisconnect and navigate the learner to the post-session
   * summary instead of retrying.
   */
  const handleRetryConnection = () => {
    logger.info("Retrying simulation connection");
    setError(null);
    setAgentJoinTimedOut(false);
    agentJoinedRef.current = false;
    agentParticipantSeenRef.current = false;
    preReconnectStatusRef.current = null;
    if (silentGraceTimerRef.current) {
      clearTimeout(silentGraceTimerRef.current);
      silentGraceTimerRef.current = null;
    }
    clearAgentJoinTimer();

    detachRoomListeners();
    try {
      room.disconnect();
    } catch (disconnectError) {
      logger.warn(`Error disconnecting before retry: ${disconnectError}`);
    }

    updateAgentTurnStatus("user_turn");
    connectToRoom(true);
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
    agentJoinTimedOut,
    missedSupervisorNoteCount,
    events,
    handleRetryConnection,
    room,
    roomStatus,
    score,
    startTime,
    roomData,
    detectedEventIds,
    agentTurnStatus,
    supervisorNotes,
  };
};
