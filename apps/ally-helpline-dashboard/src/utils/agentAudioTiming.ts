/**
 * Diagnostic timer for "the agent joined but never spoke".
 *
 * Prod measurements (Aug 2026) showed the agent publishes its audio track in a
 * constant ~0.8s, but the learner's client then takes a median 4s — and a p90 of
 * 21s, worst case 35s — before that track is subscribed and any sound can reach
 * them. The agent withholds every audio frame until a subscriber exists, so the
 * learner sits in a silent room watching a "joined" agent, and closes and reopens
 * the session.
 *
 * Server logs cannot say where that time goes, so the browser has to. Splitting
 * the wait at the two events the client can see attributes it without guesswork:
 *
 *   track_published_to_subscribed_ms large  -> the subscribe/renegotiation itself
 *   participant_to_track_published_ms large -> server -> client signalling
 *   both small, yet the agent still waited  -> server -> agent notification, i.e.
 *                                              the agent's own gating is the bug
 *
 * Only durations and the room name are recorded — no IPs, no SDP, no media.
 */

/** Emitted once per session, whatever the outcome. */
export type AgentAudioTimingOutcome =
  /** Normal path: the agent's audio track was subscribed. */
  | "subscribed"
  /** Nothing was subscribed before the ceiling — the interesting failure. */
  | "timeout"
  /** Learner left (or navigated) before a subscription happened. */
  | "abandoned";

export interface AgentAudioTimingPayload {
  room_name: string | null;
  outcome: AgentAudioTimingOutcome;
  /** Agent participant appeared, relative to our room connect. */
  connect_to_agent_participant_ms: number | null;
  /** Agent's audio track was announced to us, relative to it appearing. */
  participant_to_track_published_ms: number | null;
  /** THE number: track announced -> we subscribed. */
  track_published_to_subscribed_ms: number | null;
  /** Subscribed -> the agent was first heard speaking. */
  subscribed_to_first_audio_ms: number | null;
  /** What the learner actually experiences: connect -> first sound. */
  connect_to_first_audio_ms: number | null;
}

type Emit = (payload: AgentAudioTimingPayload) => void;

/** Ceiling for the timeout outcome. Above the worst case observed in prod (35s). */
export const AGENT_AUDIO_TIMING_CEILING_MS = 45_000;

export interface AgentAudioTimer {
  markConnected(): void;
  markAgentParticipant(): void;
  markTrackPublished(): void;
  markTrackSubscribed(): void;
  markFirstAudio(): void;
  /** Emit now if not already emitted. Safe to call repeatedly. */
  flush(outcome: AgentAudioTimingOutcome): void;
  /** Clear timers and marks; also cancels a pending timeout emit. */
  reset(): void;
}

/**
 * Build a timer. `emit` is called at most once per timer instance.
 *
 * `now` and `setTimer`/`clearTimer` are injectable so tests can drive time
 * without waiting 45 real seconds.
 */
export function createAgentAudioTimer(
  emit: Emit,
  options: {
    getRoomName?: () => string | null;
    now?: () => number;
    ceilingMs?: number;
    setTimer?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
    clearTimer?: (handle: ReturnType<typeof setTimeout>) => void;
  } = {},
): AgentAudioTimer {
  const now = options.now ?? (() => performance.now());
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? (h => clearTimeout(h));
  const ceilingMs = options.ceilingMs ?? AGENT_AUDIO_TIMING_CEILING_MS;
  const getRoomName = options.getRoomName ?? (() => null);

  let connectedAt: number | null = null;
  let participantAt: number | null = null;
  let publishedAt: number | null = null;
  let subscribedAt: number | null = null;
  let firstAudioAt: number | null = null;
  let emitted = false;
  let ceilingHandle: ReturnType<typeof setTimeout> | null = null;

  const delta = (from: number | null, to: number | null) =>
    from === null || to === null ? null : Math.round(to - from);

  const clearCeiling = () => {
    if (ceilingHandle !== null) {
      clearTimer(ceilingHandle);
      ceilingHandle = null;
    }
  };

  const flush = (outcome: AgentAudioTimingOutcome) => {
    if (emitted) return;
    // Nothing measured at all (e.g. unmount before connect) — not worth an event.
    if (connectedAt === null) {
      clearCeiling();
      return;
    }
    emitted = true;
    clearCeiling();
    emit({
      room_name: getRoomName(),
      outcome,
      connect_to_agent_participant_ms: delta(connectedAt, participantAt),
      participant_to_track_published_ms: delta(participantAt, publishedAt),
      track_published_to_subscribed_ms: delta(publishedAt, subscribedAt),
      subscribed_to_first_audio_ms: delta(subscribedAt, firstAudioAt),
      connect_to_first_audio_ms: delta(connectedAt, firstAudioAt),
    });
  };

  return {
    markConnected() {
      if (connectedAt !== null) return;
      connectedAt = now();
      // Guarantees an event even when the learner keeps a silent session open.
      ceilingHandle = setTimer(() => {
        ceilingHandle = null;
        flush("timeout");
      }, ceilingMs);
    },
    markAgentParticipant() {
      if (participantAt === null) participantAt = now();
    },
    markTrackPublished() {
      if (publishedAt === null) publishedAt = now();
    },
    markTrackSubscribed() {
      if (subscribedAt === null) subscribedAt = now();
    },
    markFirstAudio() {
      if (firstAudioAt !== null) return;
      firstAudioAt = now();
      // First sound reached the learner — the question is answered, report it.
      flush("subscribed");
    },
    flush,
    reset() {
      clearCeiling();
      connectedAt = participantAt = publishedAt = subscribedAt = firstAudioAt = null;
      emitted = false;
    },
  };
}
