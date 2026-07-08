import React, { useMemo, useState } from "react";

import { ArrowDown } from "@icons";
import { useNavigate } from "react-router-dom";

import { en, ROUTES } from "@constants";
import { AgentTestCase } from "@src/types/simulation";

interface TestCaseSelectProps {
  /** Full live library (query owned by the parent — this stays controlled). */
  testCases: AgentTestCase[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const matchesSearch = (testCase: AgentTestCase, needle: string): boolean => {
  if (!needle) return true;
  return [testCase.title, testCase.category, testCase.condition, testCase.test].some(field =>
    (field ?? "").toLowerCase().includes(needle),
  );
};

/**
 * Searchable multi-select over the agent test case library, grouped by
 * category. Each row has a checkbox plus a SIBLING expand chevron (so
 * expanding never toggles the selection) revealing the Condition/Test text.
 */
export const TestCaseSelect: React.FC<TestCaseSelectProps> = ({
  testCases,
  selectedIds,
  onChange,
  isLoading = false,
  disabled = false,
}) => {
  const strings = en.roleplayStudio.rehearsal;
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const byCategory = new Map<string, AgentTestCase[]>();
    testCases.forEach(testCase => {
      if (!matchesSearch(testCase, needle)) return;
      const category = testCase.category?.trim() || "—";
      const bucket = byCategory.get(category);
      if (bucket) bucket.push(testCase);
      else byCategory.set(category, [testCase]);
    });
    return [...byCategory.entries()];
  }, [testCases, search]);

  const toggleSelected = (id: string) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(selected => selected !== id)
        : [...selectedIds, id],
    );

  const toggleExpanded = (id: string) =>
    setExpandedIds(previous =>
      previous.includes(id) ? previous.filter(expanded => expanded !== id) : [...previous, id],
    );

  return (
    <div className="flex flex-col gap-2" data-testid="test-case-select">
      <div className="flex items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder={strings.searchTestCases}
          aria-label={strings.searchTestCases}
          disabled={disabled}
          className="min-w-0 flex-1 rounded-md border border-border-light px-3 py-1.5 text-sm outline-none focus:border-primary-500"
        />
        {selectedIds.length > 0 && (
          <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-500">
            {strings.testCasesSelected(selectedIds.length)}
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate(ROUTES.AGENT_TEST_CASES)}
          className="shrink-0 text-sm text-primary-500 hover:underline"
        >
          {strings.manageTestCases}
        </button>
      </div>

      <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col gap-2 animate-pulse" data-testid="test-case-select-loading">
            <div className="h-9 rounded bg-neutral-100" />
            <div className="h-9 rounded bg-neutral-100" />
          </div>
        ) : testCases.length === 0 ? (
          <p className="text-sm text-typography-700">{strings.noTestCases}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-typography-700">{strings.noTestCaseMatches}</p>
        ) : (
          groups.map(([category, cases]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-typography-600">
                {category}
              </span>
              {cases.map(testCase => {
                const checked = selectedIds.includes(testCase.id);
                const expanded = expandedIds.includes(testCase.id);
                return (
                  <div
                    key={testCase.id}
                    className={`rounded border transition-colors ${
                      checked ? "border-primary bg-primary-50" : "border-border-light"
                    }`}
                  >
                    <div className="flex items-start gap-2 px-3 py-2">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleSelected(testCase.id)}
                          className="accent-primary mt-0.5"
                        />
                        <span className="min-w-0 text-sm text-typography-900">
                          {testCase.title}
                        </span>
                      </label>
                      {/* Sibling of the label — clicking it must not toggle the checkbox. */}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(testCase.id)}
                        aria-expanded={expanded}
                        aria-label={testCase.title}
                        data-testid={`test-case-expand-${testCase.id}`}
                        className="shrink-0 rounded p-0.5 text-typography-600 hover:text-typography-900"
                      >
                        <ArrowDown
                          size={16}
                          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>
                    {expanded && (
                      <div className="flex flex-col gap-1.5 border-t border-border-light px-3 py-2">
                        <div>
                          <span className="text-xs font-medium text-typography-700">
                            {strings.condition}
                          </span>
                          <p className="text-xs text-typography-800 whitespace-pre-wrap">
                            {testCase.condition || "—"}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-typography-700">
                            {strings.test}
                          </span>
                          <p className="text-xs text-typography-800 whitespace-pre-wrap">
                            {testCase.test || "—"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
