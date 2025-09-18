import { useState, useEffect, useRef } from "react";

import { audioLevelConfig } from "@constants";

/**
 * useAudioLevel
 *
 * Purpose:
 * - Computes a real-time, normalized audio intensity value for a given `MediaStreamTrack`.
 * - Designed to drive simple visualizations (e.g., meters, pulsing shapes) at ~animation-frame cadence.
 *
 * How it works:
 * - Builds a Web Audio graph: MediaStreamTrack -> MediaStreamSource -> AnalyserNode.
 * - On each animation frame, reads frequency-domain magnitudes, computes their average, and
 *   normalizes the result using `audioLevelConfig.normalizationFactor`.
 *
 * Inputs:
 * - `track`: The audio `MediaStreamTrack` (e.g., from getUserMedia or RTC/LiveKit publication).
 *
 * Outputs:
 * - A single `number` representing current audio level (normalized).
 *
 * Lifecycle:
 * - Starts processing when a valid `track` is provided.
 * - Tears down (cancels rAF, closes AudioContext) when the component unmounts or `track` changes.
 */
export const useAudioLevel = (track: MediaStreamTrack | undefined) => {
  const [level, setLevel] = useState<number>(0);

  // rAF id for continuous updates
  const frameRef = useRef<number | undefined>(undefined);
  // AnalyserNode used to read frequency magnitudes from the audio stream
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Buffer that receives frequency data on each frame
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    // If there is no track, do not set up the audio graph
    if (!track) return undefined;

    // Create the audio context and connect the track to an analyser
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(new MediaStream([track]));
    const analyser = audioContext.createAnalyser();

    // Configure analyser resolution via FFT size; higher values = more frequency bins
    analyser.fftSize = audioLevelConfig.fftSize;
    source.connect(analyser);
    analyserRef.current = analyser;
    // Allocate a buffer to hold one frame of frequency magnitudes
    dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

    // Reads frequency data each frame, computes an average magnitude, normalizes it,
    // and updates `level`. Uses rAF for smooth UI updates.
    const updateLevel = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const average =
        dataArrayRef.current.reduce((acc, val) => acc + val, 0) / dataArrayRef.current.length;
      setLevel(average / audioLevelConfig.normalizationFactor);
      frameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();

    return () => {
      // Stop updates and release audio resources
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      audioContext.close();
    };
  }, [track]);

  return level;
};
