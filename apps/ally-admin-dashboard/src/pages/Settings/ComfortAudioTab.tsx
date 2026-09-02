import React from "react";

import { ComfortAudioSettings } from "@components";

/**
 * Thin wrapper so the tab strip has something to switch to and the library
 * component stays reusable elsewhere. `hideHeading` because the tab label and
 * the shell's per-tab description already say what this is.
 */
export const ComfortAudioTab: React.FC = () => (
  <div className="max-w-3xl">
    <ComfortAudioSettings hideHeading />
  </div>
);
