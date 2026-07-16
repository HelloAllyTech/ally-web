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
  // variable name -> chosen value text
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  // Reset the form whenever the drawer is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setSelectedSkillIds(new Set());
      setSelectedValues({});
      setRunning(false);
      setDone(0);
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

  const allValuesChosen = refVarNames.every(n => !!selectedValues[n]);
  const canRun =
    !running && selectedSkillIds.size > 0 && missingValueVars.length === 0 && allValuesChosen;

  const toggleSkill = useCallback((id: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const total = selectedSkillIds.size;

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    const batchId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : undefined;

    setRunning(true);
    setDone(0);

    // Fan out one run per skill (each becomes its own log row). Each skill only
    // gets the variables IT references, so a variable-free skill's row records
    // no variables. A FAILED LLM call still resolves (the row records the
    // failure); only HTTP errors throw.
    let hadError = false;
    await Promise.all(
      selectedSkills.map(async skill => {
        const names = referencedVariableNames([skill]);
        const variableValues = names.map(name => ({ name, value: selectedValues[name] }));
        try {
          await createRun({ skillId: skill.id, batchId, variableValues }).unwrap();
        } catch {
          hadError = true;
        } finally {
          setDone(d => d + 1);
        }
      }),
    );

    setRunning(false);
    if (hadError) toast.error(en.aiLab.runs.runsFailed);
    else toast.success(en.aiLab.runs.runsComplete);
    onComplete();
    onClose();
  }, [canRun, selectedSkills, selectedValues, createRun, onComplete, onClose]);

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
                  return (
                    <div key={name} className="flex flex-col gap-1.5">
                      <label className="text-sm font-mono text-typography-900">{`{{${name}}}`}</label>
                      <select
                        value={selectedValues[name] ?? ""}
                        onChange={e =>
                          setSelectedValues(prev => ({ ...prev, [name]: e.target.value }))
                        }
                        disabled={running || opts.length === 0}
                        className="border border-border-light rounded-md px-3 py-2 w-full outline-none text-base bg-white disabled:bg-background-secondary"
                      >
                        <option value="" disabled>
                          {opts.length === 0
                            ? en.aiLab.values.noVariables
                            : en.aiLab.values.variablePlaceholder}
                        </option>
                        {opts.map(opt => (
                          <option key={opt.id} value={opt.value}>
                            {opt.label ? `${opt.label} — ${opt.value}` : opt.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
