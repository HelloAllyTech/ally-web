import React, { useMemo } from "react";

import { useSearchParams } from "react-router-dom";

import { Tabs } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";

import { SkillsTab } from "./SkillsTab";
import { VariablesTab } from "./VariablesTab";
import { ValuesTab } from "./ValuesTab";
import { RunsTab } from "./RunsTab";

enum AILabTab {
  SKILLS = "skills",
  VARIABLES = "variables",
  VALUES = "values",
  RUNS = "runs",
}

const TAB_ITEMS = [
  { id: AILabTab.SKILLS, label: en.aiLab.tabs.skills },
  { id: AILabTab.VARIABLES, label: en.aiLab.tabs.variables },
  { id: AILabTab.VALUES, label: en.aiLab.tabs.values },
  { id: AILabTab.RUNS, label: en.aiLab.tabs.runs },
];

const VALID_TABS = new Set<string>(TAB_ITEMS.map(t => t.id));

export const AILab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = useMemo(() => {
    const requested = searchParams.get("tab");
    return requested && VALID_TABS.has(requested) ? requested : AILabTab.SKILLS;
  }, [searchParams]);

  const renderTab = () => {
    switch (activeTab) {
      case AILabTab.VARIABLES:
        return <VariablesTab />;
      case AILabTab.VALUES:
        return <ValuesTab />;
      case AILabTab.RUNS:
        return <RunsTab />;
      case AILabTab.SKILLS:
      default:
        return <SkillsTab />;
    }
  };

  return (
    <div className="py-[2px] font-primary relative">
      <h1 className="text-2xl text-typography-900 pb-6 font-secondary">{en.aiLab.title}</h1>
      <Tabs
        items={TAB_ITEMS}
        activeId={activeTab}
        onChange={id => setSearchParams({ tab: id })}
        showCount={false}
      />
      {renderTab()}
    </div>
  );
};
