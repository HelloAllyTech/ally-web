import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useGetScenarioCaseDetailsQuery, useGetScenarioQuery } from "@api";
import { ArrowDownFilled, PlayIcon, Refresh, TickGreenBackground } from "@assets";
import { ScenarioCard } from "@components";
import { useStartSimulation } from "@hooks";
import {
  ACTIVE_TRACK_CONTEXT_KEY,
  ActiveTrackContext,
  StartCaseItemPayload,
  StartRoleplayItemPayload,
  TrackDetailItem,
} from "@types";
import { getFormattedDateTime } from "@utils";

import { RoleplaySessionLogPanel } from "./RoleplaySessionLogPanel";

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
  const [logExpanded, setLogExpanded] = useState(false);

  const isCase = payload.type === "CASE";
  const lastScenarioSessionId = payload.type === "ROLEPLAY" ? payload.lastScenarioSessionId : null;

  const { data: scenario } = useGetScenarioQuery(
    { scenarioId: payload.type === "ROLEPLAY" ? payload.scenarioId : 0, isPrivate: true },
    { skip: isCase },
  );
  const { data: caseDetails } = useGetScenarioCaseDetailsQuery(
    { caseId: payload.type === "CASE" ? payload.caseId : "" },
    { skip: !isCase },
  );

  const coverImage = isCase ? caseDetails?.coverImageUrl : scenario?.coverImageUrl;
  const cardDescription =
    item.description || (isCase ? caseDetails?.description : scenario?.description);

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

  const primaryLabel = isCase ? t("tracks2.roleplay.openCase") : t("tracks2.roleplay.start");

  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center overflow-y-auto px-6 py-10 text-center ${
        logExpanded ? "justify-start" : "justify-center"
      }`}
    >
      <div className="w-full max-w-sm">
        <ScenarioCard
          coverImage={coverImage || ""}
          title={item.title}
          description={cardDescription || ""}
          triggerWarnings={isCase ? undefined : scenario?.triggerWarnings}
          onClick={launch}
        />
      </div>

      <p className="mt-5 max-w-md text-sm text-typography-700">{t("tracks2.roleplay.intro")}</p>

      {alreadyCompleted && lastScenarioSessionId && item.completedAt ? (
        <button
          type="button"
          onClick={() => setLogExpanded(prev => !prev)}
          aria-expanded={logExpanded}
          className="mt-4 flex w-full max-w-sm items-center justify-between gap-3 rounded-2xl border border-success-100 bg-success-50 px-4 py-2.5 text-left transition-colors hover:bg-success-100"
        >
          <span className="flex min-w-0 items-center gap-2">
            <TickGreenBackground className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-success-800">
                {item.title}
              </span>
              <span className="block text-xs text-success-700">
                {t("tracks2.roleplay.completedOn", {
                  date: getFormattedDateTime(item.completedAt, "MMM d, yyyy"),
                })}
              </span>
            </span>
          </span>
          <ArrowDownFilled
            className={`h-3 w-3 shrink-0 text-success-700 transition-transform ${
              logExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        alreadyCompleted && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-success-50 px-4 py-1.5 text-sm font-medium text-success-800">
            <TickGreenBackground className="h-4 w-4" />
            {t("tracks2.roleplay.completed")}
          </div>
        )
      )}

      {logExpanded && lastScenarioSessionId && (
        <RoleplaySessionLogPanel sessionId={lastScenarioSessionId} />
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
