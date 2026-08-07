/**
 * Tests for the agent-audio timing diagnostic.
 *
 * The contracts that matter: exactly one event per session, the abandoned case
 * still reports (those are the sessions we are trying to explain), and the
 * segment we care about — track published -> subscribed — is reported faithfully.
 */

import { describe, expect, it, vi } from "vitest";

import { createAgentAudioTimer, type AgentAudioTimingPayload } from "../agentAudioTiming";

/** Timer wired to a controllable clock and a no-op scheduler. */
function harness(ceilingMs = 45_000) {
  const emit = vi.fn<(p: AgentAudioTimingPayload) => void>();
  let clock = 0;
  const timers: Array<{ fn: () => void; at: number }> = [];
  const timer = createAgentAudioTimer(emit, {
    now: () => clock,
    ceilingMs,
    getRoomName: () => "ss_room",
    setTimer: (fn, ms) => {
      timers.push({ fn, at: clock + ms });
      return timers.length as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: handle => {
      const i = (handle as unknown as number) - 1;
      if (timers[i]) timers.splice(i, 1, { fn: () => undefined, at: Infinity });
    },
  });
  return {
    emit,
    timer,
    advance(ms: number) {
      clock += ms;
      timers.filter(t => t.at <= clock).forEach(t => t.fn());
    },
    set(ms: number) {
      clock = ms;
    },
  };
}

describe("createAgentAudioTimer", () => {
  it("reports each segment of the wait", () => {
    const h = harness();
    h.timer.markConnected();
    h.set(1_000);
    h.timer.markAgentParticipant();
    h.set(1_800);
    h.timer.markTrackPublished();
    h.set(22_000); // the slow subscribe we are hunting
    h.timer.markTrackSubscribed();
    h.set(22_400);
    h.timer.markFirstAudio();

    expect(h.emit).toHaveBeenCalledTimes(1);
    expect(h.emit.mock.calls[0][0]).toEqual({
      room_name: "ss_room",
      outcome: "subscribed",
      connect_to_agent_participant_ms: 1_000,
      participant_to_track_published_ms: 800,
      track_published_to_subscribed_ms: 20_200,
      subscribed_to_first_audio_ms: 400,
      connect_to_first_audio_ms: 22_400,
    });
  });

  it("emits exactly once even if marks repeat", () => {
    const h = harness();
    h.timer.markConnected();
    h.timer.markConnected();
    h.timer.markTrackPublished();
    h.timer.markTrackPublished();
    h.timer.markTrackSubscribed();
    h.timer.markFirstAudio();
    h.timer.markFirstAudio();
    h.timer.flush("abandoned");

    expect(h.emit).toHaveBeenCalledTimes(1);
    expect(h.emit.mock.calls[0][0].outcome).toBe("subscribed");
  });

  it("reports the abandoned case, which is the one worth measuring", () => {
    const h = harness();
    h.timer.markConnected();
    h.set(1_200);
    h.timer.markAgentParticipant();
    h.set(2_000);
    h.timer.markTrackPublished();
    h.set(19_000);
    h.timer.flush("abandoned"); // learner gave up before any sound

    expect(h.emit).toHaveBeenCalledTimes(1);
    const p = h.emit.mock.calls[0][0];
    expect(p.outcome).toBe("abandoned");
    expect(p.track_published_to_subscribed_ms).toBeNull();
    expect(p.connect_to_first_audio_ms).toBeNull();
    expect(p.participant_to_track_published_ms).toBe(800);
  });

  it("emits a timeout outcome when a silent session is left open", () => {
    const h = harness(45_000);
    h.timer.markConnected();
    h.timer.markAgentParticipant();
    h.timer.markTrackPublished();

    expect(h.emit).not.toHaveBeenCalled();
    h.advance(45_000);

    expect(h.emit).toHaveBeenCalledTimes(1);
    expect(h.emit.mock.calls[0][0].outcome).toBe("timeout");
  });

  it("does not emit if the session never connected", () => {
    const h = harness();
    h.timer.flush("abandoned");
    expect(h.emit).not.toHaveBeenCalled();
  });

  it("cancels the ceiling once it has reported, so no second event fires", () => {
    const h = harness(45_000);
    h.timer.markConnected();
    h.timer.markTrackPublished();
    h.timer.markTrackSubscribed();
    h.timer.markFirstAudio();
    expect(h.emit).toHaveBeenCalledTimes(1);

    h.advance(60_000);
    expect(h.emit).toHaveBeenCalledTimes(1);
  });

  it("reset allows a fresh measurement after a reconnect", () => {
    const h = harness();
    h.timer.markConnected();
    h.timer.markTrackPublished();
    h.timer.markTrackSubscribed();
    h.timer.markFirstAudio();
    expect(h.emit).toHaveBeenCalledTimes(1);

    h.timer.reset();
    h.set(100_000);
    h.timer.markConnected();
    h.set(101_500);
    h.timer.markTrackPublished();
    h.set(103_000);
    h.timer.markTrackSubscribed();
    h.timer.markFirstAudio();

    expect(h.emit).toHaveBeenCalledTimes(2);
    expect(h.emit.mock.calls[1][0].track_published_to_subscribed_ms).toBe(1_500);
  });
});
