import { FC } from "react";

import { useTranslation } from "react-i18next";

import { useGetRoleplayCoachingQuery } from "@api";
import type { RoleplayCoachingBehavior } from "@types";

interface RoleplayCoachingTabProps {
  sessionId?: string;
}

const BehaviorList: FC<{
  title: string;
  emptyText: string;
  behaviors: RoleplayCoachingBehavior[];
  tone: "positive" | "growth";
}> = ({ title, emptyText, behaviors, tone }) => (
  <section className="flex flex-col gap-3">
    <h3 className="font-primary text-lg font-medium text-black">{title}</h3>
    {behaviors.length === 0 ? (
      <p className="font-primary text-sm text-gray-500">{emptyText}</p>
    ) : (
      <ul className="flex flex-col gap-3">
        {behaviors.map(behavior => (
          <li
            key={behavior.behaviorId}
            className={`rounded-xl border p-4 ${
              tone === "positive" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-primary text-base font-medium text-black">{behavior.name}</span>
              {behavior.observedCount > 0 && (
                <span className="font-primary text-xs text-gray-600">
                  ×{behavior.observedCount}
                </span>
              )}
            </div>
            {behavior.description && (
              <p className="mt-1 font-primary text-sm text-gray-600">{behavior.description}</p>
            )}
            {behavior.examples.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {behavior.examples.map((ex, i) => (
                  <li key={i} className="font-primary text-sm italic text-gray-700">
                    “{ex}”
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    )}
  </section>
);

/**
 * Learner-facing coaching for a Roleplay Studio v2 session: spec-based rubric
 * behaviors (strengths / growth), the emotional state journey, disclosures the
 * trainee earned, and the Director's per-turn coaching. Renders nothing useful
 * for non-v2 sessions (guarded by `available` from the API) — the parent only
 * shows this tab when coaching is available.
 */
export const RoleplayCoachingTab: FC<RoleplayCoachingTabProps> = ({ sessionId }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useGetRoleplayCoachingQuery(
    { sessionId: sessionId ?? "" },
    { skip: !sessionId },
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="font-primary text-sm text-gray-500">{t("common.loading")}</span>
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="font-primary text-sm text-gray-500">
          {t("postSim.roleplayCoaching.unavailable")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-6 overflow-y-auto pb-6">
      {typeof data.cumulativeScore === "number" && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <span className="font-primary text-sm text-gray-600">
            {t("postSim.roleplayCoaching.overallScore")}
          </span>
          <span className="ml-2 font-primary text-lg font-semibold text-black">
            {data.cumulativeScore}
          </span>
        </div>
      )}

      <BehaviorList
        title={t("postSim.roleplayCoaching.strengths")}
        emptyText={t("postSim.roleplayCoaching.noStrengths")}
        behaviors={data.strengths}
        tone="positive"
      />

      <BehaviorList
        title={t("postSim.roleplayCoaching.growthAreas")}
        emptyText={t("postSim.roleplayCoaching.noGrowth")}
        behaviors={data.growthAreas}
        tone="growth"
      />

      {data.stateJourney.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-primary text-lg font-medium text-black">
            {t("postSim.roleplayCoaching.stateJourney")}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {data.stateJourney.map((state, i) => (
              <span key={`${state}-${i}`} className="flex items-center gap-2">
                <span className="rounded-full bg-purple-100 px-3 py-1 font-primary text-sm text-purple-800">
                  {state}
                </span>
                {i < data.stateJourney.length - 1 && <span className="text-gray-400">→</span>}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.disclosures.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-primary text-lg font-medium text-black">
            {t("postSim.roleplayCoaching.disclosures")}
          </h3>
          <ul className="flex flex-col gap-1">
            {data.disclosures.map(d => (
              <li key={d.secretId} className="font-primary text-sm text-gray-700">
                • {d.topic}
                {typeof d.turnIndex === "number" && (
                  <span className="ml-2 text-xs text-gray-500">
                    {t("postSim.roleplayCoaching.turn", { turn: d.turnIndex })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.coachingNotes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-primary text-lg font-medium text-black">
            {t("postSim.roleplayCoaching.coachingNotes")}
          </h3>
          <ul className="flex flex-col gap-2">
            {data.coachingNotes.map((note, i) => (
              <li
                key={i}
                className="rounded-lg border border-gray-200 bg-white p-3 font-primary text-sm text-gray-700"
              >
                {note.feedback}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default RoleplayCoachingTab;
