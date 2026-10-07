import React from "react";

import { useSearchParams } from "react-router-dom";

import { useGetSkillExperimentsQuery } from "@api";
import { en } from "@constants";
import { ConnectedSkillRow } from "@types";
import { formatRelativeTime } from "@utils";

import { ExperimentErrorState } from "./ExperimentErrorState";
import { ExperimentStatusBadge } from "./ExperimentStatusBadge";
import { SkillExperimentDrawer } from "./SkillExperimentDrawer";

/** The open drawer lives in the URL so the skill's side panel can link straight to it. */
export const SKILL_EXPERIMENT_PARAM = "skill";

const LIST_POLL_MS = 60_000;

const bestVersion = (row: ConnectedSkillRow): string => {
  const e = row.experiment;
  if (!e || e.status === "off" || !e.championLabel) return en.skillExperiments.never;
  return e.championScore === null
    ? e.championLabel
    : `${e.championLabel} · ${e.championScore.toFixed(1)}`;
};

/**
 * Every skill that can be auto-improved, and where each one's loop stands.
 * Paused rows sort first: they are the ones waiting on an admin.
 */
export const SkillExperimentsTab: React.FC = () => {
  const copy = en.skillExperiments;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, isError, refetch } = useGetSkillExperimentsQuery(undefined, {
    pollingInterval: LIST_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  const openId = searchParams.get(SKILL_EXPERIMENT_PARAM);

  const setOpen = (promptId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (promptId) next.set(SKILL_EXPERIMENT_PARAM, promptId);
    else next.delete(SKILL_EXPERIMENT_PARAM);
    setSearchParams(next);
  };

  const rows = [...(data ?? [])].sort(
    (a, b) => Number(b.experiment?.status === "paused") - Number(a.experiment?.status === "paused"),
  );
  const openRow = rows.find(r => r.promptId === openId);

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm text-typography-700">{copy.intro}</p>

      {isLoading && <p className="text-sm text-typography-500">{copy.loading}</p>}
      {isError && <ExperimentErrorState message={copy.loadError} onRetry={refetch} />}
      {data && rows.length === 0 && <p className="text-sm text-typography-500">{copy.empty}</p>}

      {rows.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border-light text-xs text-typography-600">
            <tr>
              <th className="py-2 pr-4 font-medium">{copy.columns.skill}</th>
              <th className="py-2 pr-4 font-medium">{copy.columns.runsIn}</th>
              <th className="py-2 pr-4 font-medium">{copy.columns.status}</th>
              <th className="py-2 pr-4 font-medium">{copy.columns.best}</th>
              <th className="py-2 pr-4 font-medium">{copy.columns.target}</th>
              <th className="py-2 font-medium">{copy.columns.lastActivity}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const e = row.experiment;
              const live = !!e && e.status !== "off";
              return (
                <tr key={row.promptCode} className="border-b border-border-light">
                  <td className="py-3 pr-4">
                    {row.promptId ? (
                      <button
                        type="button"
                        className="text-left font-medium text-typography-900 hover:underline"
                        onClick={() => setOpen(row.promptId)}
                      >
                        {row.name}
                      </button>
                    ) : (
                      <span className="text-typography-500">{row.name}</span>
                    )}
                    <div className="text-xs text-typography-500">{row.outputDescription}</div>
                  </td>
                  <td className="py-3 pr-4 text-typography-700">
                    {copy.runtime[row.runtime] ?? row.runtime}
                  </td>
                  <td className="py-3 pr-4">
                    <ExperimentStatusBadge status={e?.status ?? "off"} />
                  </td>
                  <td className="py-3 pr-4 text-typography-800">{bestVersion(row)}</td>
                  <td className="py-3 pr-4 text-typography-700">
                    {live ? e!.targetScore : copy.never}
                  </td>
                  <td className="py-3 text-typography-600">
                    {e?.lastTickAt ? formatRelativeTime(e.lastTickAt) : copy.never}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {data && <p className="text-xs text-typography-500">{copy.notConnectedNote}</p>}

      {openId && (
        <SkillExperimentDrawer
          promptId={openId}
          skillName={openRow?.name ?? ""}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
};
