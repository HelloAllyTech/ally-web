import React from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { en, Permissions } from "@constants";
import { useUser } from "@hooks";
import { hasPermissions } from "@utils";

import { SkillExperimentsTab } from "./experiments/SkillExperimentsTab";
import { PromptManagement } from "./PromptManagement";

export const SYSTEM_SKILLS_EXPERIMENTS_TAB = "experiments";

/**
 * System Skills: the skill list, plus the Auto-improve tab for admins who may
 * see experiments. Without that permission the page is exactly the skill list,
 * with no tab bar — a tab that would only 403 is hidden, not disabled.
 */
export const SystemSkillsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { permissions } = useUser();
  const canViewExperiments = hasPermissions(permissions, [Permissions.VIEW_SKILL_EXPERIMENT]);
  const activeTab =
    canViewExperiments && searchParams.get("tab") === SYSTEM_SKILLS_EXPERIMENTS_TAB
      ? SYSTEM_SKILLS_EXPERIMENTS_TAB
      : "skills";

  const header = (
    <>
      <h1 className="text-2xl text-typography-900 pb-6 font-secondary">
        {en.simulation.scenarioPrompts}
      </h1>
      {canViewExperiments && (
        <Tabs
          className="mb-6"
          items={[
            { id: "skills", label: en.skillExperiments.tabs.skills },
            { id: SYSTEM_SKILLS_EXPERIMENTS_TAB, label: en.skillExperiments.tabs.experiments },
          ]}
          activeId={activeTab}
          onChange={id => setSearchParams(id === SYSTEM_SKILLS_EXPERIMENTS_TAB ? { tab: id } : {})}
          showCount={false}
        />
      )}
    </>
  );

  if (activeTab === SYSTEM_SKILLS_EXPERIMENTS_TAB) {
    return (
      <div className="py-[2px] font-primary relative">
        {header}
        <SkillExperimentsTab />
      </div>
    );
  }
  return <PromptManagement header={header} />;
};
