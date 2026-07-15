import { FC } from "react";

import { useTranslation } from "react-i18next";

import { Drawer } from "@components";
import SimulationReview from "@src/pages/review/components/SimulationReview";

interface PeerSessionsDrawerProps {
  onClose: () => void;
  scenarioId: number;
}

/**
 * Right-side drawer that lists other people's shared-for-review sessions for a
 * single scenario (roleplay agent) in the viewer's tenant. Reuses the existing
 * SimulationReview feed (full FeedCards + infinite scroll + "Review
 * transcript" → review viewer), scoped by scenarioId and excluding the viewer's
 * own sessions. Rendered only while open, so the feed query fires on open, not
 * on scenario page load.
 */
const PeerSessionsDrawer: FC<PeerSessionsDrawerProps> = ({ onClose, scenarioId }) => {
  const { t } = useTranslation();

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("learn.scenario.peerSessions.title", "Watch how peers handled this")}
      drawerClassName="w-[46vw] min-w-[420px] max-w-[640px]"
      bodyClassName="h-full overflow-y-auto"
    >
      <div className="flex w-full flex-col items-center gap-4 px-4 py-4 sm:px-6">
        <SimulationReview readFilter="ALL" sortBy="LATEST" scenarioId={scenarioId} excludeOwn />
      </div>
    </Drawer>
  );
};

export default PeerSessionsDrawer;
