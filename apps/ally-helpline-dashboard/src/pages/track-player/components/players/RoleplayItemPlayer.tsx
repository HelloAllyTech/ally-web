import { FC } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { PlayIcon, Refresh, TickGreenBackground } from "@assets";
import { useStartSimulation } from "@hooks";
import {
  ACTIVE_TRACK_CONTEXT_KEY,
  ActiveTrackContext,
  StartCaseItemPayload,
  StartRoleplayItemPayload,
  TrackDetailItem,
} from "@types";

interface RoleplayItemPlayerProps {
  payload: StartRoleplayItemPayload | StartCaseItemPayload;
  item: TrackDetailItem;
  trackId: string;
  alreadyCompleted: boolean;
}

/**
 * Persists the return-to-track context so the post-simulation UpNext tab can
 * route the learner back into the player when the roleplay/case ends.
 */
const persistTrackContext = (ctx: ActiveTrackContext) => {
  try {
    sessionStorage.setItem(ACTIVE_TRACK_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // sessionStorage may be unavailable (private mode) — non-fatal.
  }
};

/**
 * Pre-launch screen for roleplay and case items. Roleplay items launch a
 * live simulation (linked to the track item progress row); case items open
 * the existing case detail page. Both stash the active-track context first.
 */
export const RoleplayItemPlayer: FC<RoleplayItemPlayerProps> = ({
  payload,
  item,
  trackId,
  alreadyCompleted,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startSimulation, isStarting } = useStartSimulation();

  const launch = async () => {
    persistTrackContext({ trackId, itemId: item.id });

    if (payload.type === "CASE") {
      navigate(`/case/${payload.caseId}`);
      return;
    }

    await startSimulation({
      params: {
        scenarioId: payload.scenarioId,
        trackItemProgressId: payload.trackItemProgressId,
      },
      metadata: { title: item.title, coverImageUrl: undefined },
    });
  };

  const isCase = payload.type === "CASE";
  const primaryLabel = isCase ? t("tracks2.roleplay.openCase") : t("tracks2.roleplay.start");

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-primary-600">
        <PlayIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-typography-900">{item.title}</h2>
      {item.description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-typography-700">
          {item.description}
        </p>
      )}
      <p className="mt-2 max-w-md text-sm text-typography-700">{t("tracks2.roleplay.intro")}</p>

      {alreadyCompleted && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-50 px-4 py-1.5 text-sm font-medium text-success-800">
          <TickGreenBackground className="h-4 w-4" />
          {t("tracks2.roleplay.completed")}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={launch}
          disabled={isStarting}
          className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:pointer-events-none disabled:opacity-50"
        >
          {alreadyCompleted && !isCase ? (
            <>
              <Refresh className="h-4 w-4" />
              {t("tracks2.roleplay.replay")}
            </>
          ) : (
            <>
              <PlayIcon className="h-4 w-4" />
              {primaryLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
