import React, { FC } from "react";

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { useAudioLevel } from "../useAudioLevel";

const DisplayLevel: FC<{ track?: MediaStreamTrack }> = ({ track }) => {
  const level = useAudioLevel(track);
  return <div data-testid="level">{level}</div>;
};

describe("useAudioLevel", () => {
  const originalAudioContext = global.AudioContext;
  const originalMediaStream = (global as any).MediaStream;
  let lastRafCb: FrameRequestCallback | null = null;
  let rafId = 0;

  beforeEach(() => {
    // Mock requestAnimationFrame to capture the scheduled callback
    lastRafCb = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(cb => {
      lastRafCb = cb;
      rafId += 1;
      return rafId;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalAudioContext) {
      (global as any).AudioContext = originalAudioContext;
    }
    (global as any).MediaStream = originalMediaStream;
  });

  it("returns 0 when track is undefined", () => {
    render(<DisplayLevel />);
    expect(screen.getByTestId("level").textContent).toBe("0");
  });

  it("updates level after one animation frame tick", () => {
    // Mock MediaStream to avoid constructor validation
    (global as any).MediaStream = class MockMediaStream {
      constructor() {}
    } as any;

    // Prepare analyser that returns deterministic data
    const analyserData = [10, 20, 30, 40];
    const mockAnalyser = {
      frequencyBinCount: analyserData.length,
      getByteFrequencyData: (arr: Uint8Array) => {
        for (let i = 0; i < analyserData.length; i += 1) {
          arr[i] = analyserData[i];
        }
      },
    } as unknown as AnalyserNode;

    class MockAudioContext {
      createMediaStreamSource() {
        return { connect: vi.fn(), disconnect: vi.fn() } as any;
      }
      createAnalyser() {
        return mockAnalyser;
      }
      close() {}
    }

    (global as any).AudioContext = MockAudioContext as any;

    // Fake track object; contents are irrelevant due to mocks
    const fakeTrack = {} as MediaStreamTrack;

    render(<DisplayLevel track={fakeTrack} />);

    // Trigger one rAF cycle
    expect(lastRafCb).toBeTruthy();
    if (lastRafCb) lastRafCb(performance.now());

    // Average of [10,20,30,40] = 25; normalizationFactor is 128
    // Expected level = 25 / 128
    const expected = (25 / 128).toString();
    expect(screen.getByTestId("level").textContent).toBe(expected);
  });
});
