import React, { useMemo, useRef, useState } from "react";

import { useDispatch } from "react-redux";

import { CarbonDropdown, FilterableMultiSelect, Tag } from "@ally-ui-mono/ui-shared";
import { useGetAgentTestCasesQuery } from "@api";
import { en } from "@constants";
import { setAgentTestCaseIds } from "@reducer";
import { AgentTestCase } from "@src/types/simulation";

import { SpecSectionCard } from "./SpecSectionCard";

interface AgentTestCasesSectionProps {
  agentTestCaseIds: string[];
}

const ALL_CATEGORIES = "__all__";

/**
 * Trainer-facing agent test-case picker: a searchable multi-select of the whole
 * agent-test-case library with a category filter. The copilot's recommended set
 * (the ids already on the spec when it loaded) is preselected and badged
 * "Recommended". Stays editable even though the rest of the spec is read-only,
 * since choosing which behavioral checks to rehearse against is the trainer's
 * call. Selections persist to `spec.agentTestCaseIds` via the draft autosave.
 */
export const AgentTestCasesSection: React.FC<AgentTestCasesSectionProps> = ({
  agentTestCaseIds,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const { data } = useGetAgentTestCasesQuery();
  const library = useMemo(() => data?.data ?? [], [data]);

  // "Recommended" = the copilot's picks present when this spec first loaded.
  const recommendedRef = useRef<Set<string>>(new Set(agentTestCaseIds));
  const recommended = recommendedRef.current;

  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const categories = useMemo(
    () => Array.from(new Set(library.map(tc => tc.category).filter(Boolean))).sort(),
    [library],
  );

  const selectedCases = useMemo(() => {
    const ids = new Set(agentTestCaseIds);
    return library.filter(tc => ids.has(tc.id));
  }, [library, agentTestCaseIds]);

  // Dropdown items: category-filtered, but always union the current selection so
  // Carbon's controlled selection never references an item that isn't listed.
  const items = useMemo(() => {
    const byCategory =
      category === ALL_CATEGORIES ? library : library.filter(tc => tc.category === category);
    const map = new Map<string, AgentTestCase>();
    [...byCategory, ...selectedCases].forEach(tc => map.set(tc.id, tc));
    return Array.from(map.values());
  }, [library, category, selectedCases]);

  const handleChange = (next: AgentTestCase[]) =>
    dispatch(setAgentTestCaseIds(next.map(tc => tc.id)));

  return (
    <SpecSectionCard
      title={strings.agentTestCases}
      sections={["agentTestCaseIds"]}
      defaultExpanded={false}
    >
      <div className="flex flex-col gap-4">
        <div className="w-56">
          <CarbonDropdown
            id="roleplay-testcase-category"
            size="sm"
            titleText={strings.agentTestCasesCategory}
            label={strings.agentTestCasesAllCategories}
            items={[ALL_CATEGORIES, ...categories]}
            selectedItem={category}
            itemToString={(item: string | null) =>
              item && item !== ALL_CATEGORIES ? item : strings.agentTestCasesAllCategories
            }
            onChange={({ selectedItem }) => setCategory(selectedItem ?? ALL_CATEGORIES)}
          />
        </div>

        <FilterableMultiSelect
          id="roleplay-testcases"
          titleText={strings.agentTestCases}
          placeholder={strings.agentTestCasesPlaceholder}
          items={items}
          itemToString={(item: AgentTestCase | null) => item?.title ?? ""}
          itemToElement={(item: AgentTestCase) => (
            <span className="flex w-full items-center justify-between gap-2">
              <span className="truncate">{item.title}</span>
              <span className="flex shrink-0 items-center gap-1">
                {item.category && (
                  <Tag type="gray" size="sm">
                    {item.category}
                  </Tag>
                )}
                {recommended.has(item.id) && (
                  <Tag type="blue" size="sm">
                    {strings.agentTestCasesRecommended}
                  </Tag>
                )}
              </span>
            </span>
          )}
          selectedItems={selectedCases}
          onChange={({ selectedItems }) => handleChange((selectedItems ?? []) as AgentTestCase[])}
        />
      </div>
    </SpecSectionCard>
  );
};
