import React from "react";

import { Link } from "react-router-dom";

import { useGetSkillExperimentsQuery } from "@api";
import { en, Permissions, ROUTES } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

/**
 * Shown in a skill's side panel while auto-improve is running on it: editing
 * the text here restarts the experiment, which an admin should know before
 * they type — and the experiment is one click away.
 */
export const SkillExperimentNotice: React.FC<{ promptId?: string }> = ({ promptId }) => {
  const { permissions } = useUser();
  const canView = hasPermissions(permissions, [Permissions.VIEW_SKILL_EXPERIMENT]);
  const { data } = useGetSkillExperimentsQuery(undefined, { skip: !canView || !promptId });

  const experiment = data?.find(row => row.promptId === promptId)?.experiment;
  if (!promptId || !experiment || experiment.status === "off") return null;

  const copy = en.skillExperiments;
  return (
    <div
      role="status"
      className="flex flex-col gap-1 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span className="font-medium">
        {copy.sidePanel.running(copy.status[experiment.status].toLowerCase())}
      </span>
      <span>{copy.sidePanel.editWarning}</span>
      <Link
        className="self-start underline"
        to={`${ROUTES.MANAGE_PROMPTS}?tab=experiments&skill=${promptId}`}
      >
        {copy.sidePanel.open}
      </Link>
    </div>
  );
};
