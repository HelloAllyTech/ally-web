import React from "react";

import { EmptyState } from "@components";
import { en } from "@constants";

/** Placeholder — the Runs surface is intentionally not built yet. */
export const RunsTab: React.FC = () => (
  <div className="mt-4">
    <EmptyState
      title={en.aiLab.runs.comingSoon}
      subtitle={en.aiLab.runs.comingSoonSubtitle}
      hideActionButton
    />
  </div>
);
