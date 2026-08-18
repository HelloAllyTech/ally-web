import { FC, useEffect, useState } from "react";

import { useReducedMotion } from "framer-motion";

/**
 * The ten-frame braille spinner from the console mockup, built from escapes
 * rather than the literal glyphs — U+280B, U+2819, U+2839, U+2838, U+283C,
 * U+2834, U+2826, U+2827, U+2807, U+280F — so the cycle survives being copied
 * through an editor that doesn't render braille well.
 */
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const FRAME_INTERVAL_MS = 90;

export interface BrailleSpinnerProps {
  className?: string;
}

/**
 * The "still working" glyph next to Bug Hunter's in-flight log line. Fixed at
 * `1ch` so the frame change never reflows the line it sits in, and frozen on
 * its first frame under reduced motion rather than cycling.
 */
export const BrailleSpinner: FC<BrailleSpinnerProps> = ({ className }) => {
  const shouldReduceMotion = useReducedMotion();
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) return undefined;
    const interval = setInterval(() => {
      setFrameIndex(index => (index + 1) % FRAMES.length);
    }, FRAME_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [shouldReduceMotion]);

  return (
    <span
      // `font-mono` is the baseline; colour is left to the caller via
      // `className` rather than a hardcoded console colour.
      className={`font-mono ${className ?? ""}`.trim()}
      style={{ width: "1ch", display: "inline-block" }}
      aria-hidden="true"
    >
      {FRAMES[shouldReduceMotion ? 0 : frameIndex]}
    </span>
  );
};
