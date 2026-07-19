import React, { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import { useGetLabSkillsQuery, useGetLabValuesQuery, useCreateLabRunMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { LabSkill, LabValue } from "@types";

interface CreateRunDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called once all skills in the run have settled (to refetch the log). */
  onComplete: () => void;
}

// Matches {{name}} / {{ name }} placeholders in a skill's content.
const VAR_TOKEN = /\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g;

const referencedVariableNames = (skills: LabSkill[]): string[] => {
  const names = new Set<string>();
  for (const skill of skills) {
    for (const match of skill.content.matchAll(VAR_TOKEN)) {
      names.add(match[1]);
    }
  }
  return Array.from(names);
};

// A value can be a long block (e.g. a whole transcript); keep the label to one
// readable line — the full text is still stored in `value`.
const optionLabel = (opt: LabValue): string => {
  const text = opt.label ? `${opt.label} — ${opt.value}` : opt.value;
  return text.length > 90 ? `${text.slice(0, 90)}…` : text;
};

// Upper bound on runs a single matrix submission can fan out to.
const MAX_MATRIX_RUNS = 200;
// How many run creations to fire concurrently (bounds load on the sync path).
const RUN_CONCURRENCY = 8;

/** Cartesian product of the chosen values for each variable name. Exported for tests. */
export const cartesian = (
  names: string[],
  valuesByName: Record<string, string[]>,
): Record<string, string>[] => {
  let combos: Record<string, string>[] = [{}];
  for (const name of names) {
    const vals = valuesByName[name] ?? [];
    const next: Record<string, string>[] = [];
    for (const combo of combos) for (const v of vals) next.push({ ...combo, [name]: v });
    combos = next;
  }
  return combos;
};

/** Run async tasks with a bounded concurrency. */
const runWithConcurrency = async (
  count: number,
  limit: number,
  task: (index: number) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const worker = async () => {
    while (cursor < count) {
      const i = cursor++;
      await task(i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, count) }, worker));
};

export const CreateRunDrawer: React.FC<CreateRunDrawerProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { data: skillsData } = useGetLabSkillsQuery({ limit: 500 });
  // 500 is the backend's max page size (LabListQueryDto @Max(500)).
  const { data: valuesData } = useGetLabValuesQuery({ limit: 500 });
  const skills = useMemo(() => skillsData?.items ?? [], [skillsData]);
  const values = useMemo(() => valuesData?.items ?? [], [valuesData]);

  const [createRun] = useCreateLabRunMutation();

  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  // variable name -> chosen value texts (a matrix run picks several per variable)
  const [selectedValues, setSelectedValues] = useState<Record<string, string[]>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  // Per-skill failures from the last run attempt (HTTP/network errors — a
  // FAILED LLM call still creates a row and is not counted here). When
  // non-empty we keep the drawer open so the admin sees which skills failed.
  const [failures, setFailures] = useState<{ skillName: string; error: string }[]>([]);

  // Reset the form whenever the drawer is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setSelectedSkillIds(new Set());
      setSelectedValues({});
      setRunning(false);
      setDone(0);
      setFailures([]);
    }
  }, [isOpen]);

  const selectedSkills = useMemo(
    () => skills.filter(s => selectedSkillIds.has(s.id)),
    [skills, selectedSkillIds],
  );

  const refVarNames = useMemo(() => referencedVariableNames(selectedSkills), [selectedSkills]);

  // Group available values by their variable's name.
  const valuesByVar = useMemo(() => {
    const map = new Map<string, LabValue[]>();
    for (const value of values) {
      const name = value.variable?.name;
      if (!name) continue;
      const list = map.get(name) ?? [];
      list.push(value);
      map.set(name, list);
    }
    return map;
  }, [values]);

  const missingValueVars = useMemo(
    () => refVarNames.filter(n => (valuesByVar.get(n)?.length ?? 0) === 0),
    [refVarNames, valuesByVar],
  );

  const allValuesChosen = refVarNames.every(n => (selectedValues[n]?.length ?? 0) > 0);

  // Expand the selections into concrete runs: for each skill, the cartesian
  // product of the chosen values for the variables IT references. A skill with
  // no variables contributes a single run.
  const plannedRuns = useMemo(() => {
    const runs: { skill: LabSkill; variableValues: { name: string; value: string }[] }[] = [];
    for (const skill of selectedSkills) {
      const names = referencedVariableNames([skill]);
      if (names.length === 0) {
        runs.push({ skill, variableValues: [] });
        continue;
      }
      for (const combo of cartesian(names, selectedValues)) {
        runs.push({ skill, variableValues: names.map(name => ({ name, value: combo[name] })) });
      }
    }
    return runs;
  }, [selectedSkills, selectedValues]);

  const total = plannedRuns.length;
  const tooManyRuns = total > MAX_MATRIX_RUNS;
  const canRun =
    !running &&
    selectedSkillIds.size > 0 &&
    missingValueVars.length === 0 &&
    allValuesChosen &&
    total > 0 &&
    !tooManyRuns;

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleValue = useCallback((name: string, value: string) => {
    setSelectedValues(prev => {
      const current = prev[name] ?? [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [name]: next };
    });
  }, []);

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;

    setRunning(true);
    setDone(0);
    setFailures([]);

    // Fan out one run per (skill × value-combination), each its own log row,
    // sharing a batchId. A FAILED LLM call still resolves (the row records the
    // failure); only HTTP errors throw — those are collected below.
    const failed: { skillName: string; error: string }[] = [];
    await runWithConcurrency(plannedRuns.length, RUN_CONCURRENCY, async i => {
      const { skill, variableValues } = plannedRuns[i];
      try {
        await createRun({ skillId: skill.id, batchId, variableValues }).unwrap();
      } catch (error) {
        const message =
          (error as { data?: { message?: string } })?.data?.message ??
          (error as { error?: string })?.error ??
          en.aiLab.runs.runsFailed;
        failed.push({ skillName: skill.name, error: message });
      } finally {
        setDone(d => d + 1);
      }
    });

    setRunning(false);
    // Refresh the log regardless — runs that succeeded now have rows.
    onComplete();

    if (failed.length === 0) {
      toast.success(en.aiLab.runs.runsComplete);
      onClose();
      return;
    }

    // Keep the drawer open and show exactly which runs failed.
    toast.error(
      en.aiLab.runs.runsPartial
        .replace("{failed}", String(failed.length))
        .replace("{total}", String(total)),
    );
    setFailures(failed);
  }, [canRun, plannedRuns, createRun, onComplete, onClose, total]);

  if (!isOpen) return null;

  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black bg-opacity-50" onClick={running ? undefined : onClose} />
      <div className="w-[50%] min-w-[720px] bg-white shadow-xl border-l-[1px] border-border-light flex flex-col">
        <div className="flex items-center justify-between p-6">
          <span className="text-base font-tertiary font-[500]">{en.aiLab.runs.drawerTitle}</span>
        </div>

        <div className="flex-1 min-h-0 px-10 pt-2 overflow-y-auto custom-scrollbar space-y-6">
          {/* Per-skill failures from the last attempt */}
          {failures.length > 0 && (
            <div className="border border-destructive-200 bg-destructive-50 rounded-md px-4 py-3">
              <h3 className="text-sm font-medium text-destructive-700 mb-1">
                {en.aiLab.runs.failuresTitle}
              </h3>
              <p className="text-xs text-destructive-600 mb-2">{en.aiLab.runs.failuresHelp}</p>
              <ul className="space-y-1">
                {failures.map((f, i) => (
                  <li key={`${f.skillName}-${i}`} className="text-xs text-destructive-700">
                    <span className="font-medium">{f.skillName}</span>: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          <div>
            <h3 className="text-sm font-medium text-typography-900 mb-1">
              {en.aiLab.runs.selectSkills}
              <span className="text-destructive-500 ml-1">*</span>
            </h3>
            <p className="text-xs text-typography-400 mb-3">{en.aiLab.runs.selectSkillsHelp}</p>
            {skills.length === 0 ? (
              <p className="text-sm text-typography-600 bg-background-secondary border border-border-light rounded-md px-4 py-3">
                {en.aiLab.runs.noSkills}
              </p>
            ) : (
              <div className="border border-border-light rounded-md divide-y divide-border-light max-h-[220px] overflow-y-auto custom-scrollbar">
                {skills.map(skill => (
                  <label
                    key={skill.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-background-secondary/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4"
                      checked={selectedSkillIds.has(skill.id)}
                      onChange={() => toggleSkill(skill.id)}
                      disabled={running}
                    />
                    <span className="min-w-0">
                      <span className="block text-base text-typography-900">{skill.name}</span>
                      {skill.description && (
                        <span className="block text-xs text-typography-500 line-clamp-1">
                          {skill.description}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Variable values */}
          <div>
            <h3 className="text-sm font-medium text-typography-900 mb-1">
              {en.aiLab.runs.variablesHeading}
            </h3>
            <p className="text-xs text-typography-400 mb-3">{en.aiLab.runs.variablesHelp}</p>
            {refVarNames.length === 0 ? (
              <p className="text-sm text-typography-500">
                {selectedSkillIds.size === 0 ? "" : en.aiLab.runs.noVariablesNeeded}
              </p>
            ) : (
              <div className="space-y-3">
                {missingValueVars.length > 0 && (
                  <p className="text-sm text-destructive-600 bg-destructive-50 border border-destructive-200 rounded-md px-3 py-2">
                    {en.aiLab.runs.missingValues}
                  </p>
                )}
                {refVarNames.map(name => {
                  const opts = valuesByVar.get(name) ?? [];
                  const chosen = selectedValues[name] ?? [];
                  return (
                    <div key={name} className="flex flex-col gap-1.5">
                      <label className="text-sm font-mono text-typography-900">{`{{${name}}}`}</label>
                      {/* Multi-select (matrix runs pick several values per
                          variable); the shared Select is single-value, so a
                          checkbox list is used here intentionally. */}
                      {opts.length === 0 ? (
                        <p className="text-sm text-typography-500">{en.aiLab.values.noVariables}</p>
                      ) : (
                        <div className="border border-border-light rounded-md divide-y divide-border-light max-h-[160px] overflow-y-auto custom-scrollbar">
                          {opts.map(opt => (
                            <label
                              key={opt.id}
                              className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-background-secondary/50"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 w-4 h-4"
                                checked={chosen.includes(opt.value)}
                                onChange={() => toggleValue(name, opt.value)}
                                disabled={running}
                              />
                              <span className="text-sm text-typography-900 min-w-0 break-words">
                                {optionLabel(opt)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Matrix summary */}
          {selectedSkillIds.size > 0 && (
            <p
              className={`text-sm ${tooManyRuns ? "text-destructive-600" : "text-typography-600"}`}
            >
              {tooManyRuns
                ? en.aiLab.runs.tooManyRuns
                    .replace("{runs}", String(total))
                    .replace("{max}", String(MAX_MATRIX_RUNS))
                : en.aiLab.runs.matrixSummary.replace("{runs}", String(total))}
            </p>
          )}
        </div>

        {/* Footer: progress bar while running, else actions */}
        <div className="border-t border-border-light px-10 py-4">
          {running ? (
            <div>
              <div className="flex justify-between text-sm text-typography-700 mb-2">
                <span>
                  {en.aiLab.runs.runningProgress
                    .replace("{done}", String(done))
                    .replace("{total}", String(total))}
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : failures.length > 0 ? (
            <div className="flex gap-3 justify-end">
              <Button variant={ButtonVariant.SECONDARY} onClick={() => setFailures([])}>
                {en.aiLab.runs.dismissFailures}
              </Button>
              <Button variant={ButtonVariant.PRIMARY} onClick={onClose}>
                {en.aiLab.runs.close}
              </Button>
            </div>
          ) : (
            <div className="flex gap-3 justify-end">
              <Button variant={ButtonVariant.SECONDARY} onClick={onClose}>
                {en.common.cancel}
              </Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={handleRun}
                disabled={!canRun}
                title={
                  selectedSkillIds.size === 0
                    ? en.aiLab.runs.validationSkills
                    : !allValuesChosen || missingValueVars.length > 0
                      ? en.aiLab.runs.validationValues
                      : undefined
                }
              >
                {en.aiLab.runs.run}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
