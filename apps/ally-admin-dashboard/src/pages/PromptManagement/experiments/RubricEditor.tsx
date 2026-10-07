import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { RubricCriterion } from "@types";

import { FieldHelp } from "./FieldHelp";

/** Mirrors ally-be SKILL_EXPERIMENT_LIMITS. */
export const RUBRIC_MAX_CRITERIA = 10;
const WEIGHTS = [1, 2, 3, 4, 5];

interface Row {
  /** Kept from the server so renaming a criterion doesn't change its judge key mid-history. */
  key?: string;
  name: string;
  description: string;
  weight: number;
}

/**
 * The judge answers under a snake_case key (ally-be validates
 * `^[a-z][a-z0-9_]{0,39}$`); admins only ever type a name, so the key is derived.
 */
export function criterionKey(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 38);
  return /^[a-z]/.test(slug) ? slug : `c_${slug}`.slice(0, 40);
}

export function toRubric(rows: Row[]): RubricCriterion[] {
  return rows.map(row => ({
    key: row.key ?? criterionKey(row.name),
    name: row.name.trim(),
    description: row.description.trim(),
    weight: row.weight,
  }));
}

export function rubricErrors(rows: Row[]): string[] {
  const copy = en.skillExperiments.rubric.errors;
  const errors: string[] = [];
  if (!rows.length) errors.push(copy.empty);
  if (rows.some(r => !r.name.trim())) errors.push(copy.nameRequired);
  if (rows.some(r => !r.description.trim())) errors.push(copy.descriptionRequired);
  const keys = toRubric(rows).map(r => r.key);
  if (new Set(keys).size !== keys.length) errors.push(copy.duplicate);
  return errors;
}

interface RubricEditorProps {
  value: RubricCriterion[];
  /** Set while a run is live: the rubric is read-only and this says why. */
  lockedReason?: string;
  canEdit: boolean;
  saving: boolean;
  onSave: (rubric: RubricCriterion[]) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export const RubricEditor: React.FC<RubricEditorProps> = ({
  value,
  lockedReason,
  canEdit,
  saving,
  onSave,
  onDirtyChange,
}) => {
  const copy = en.skillExperiments.rubric;
  const [rows, setRows] = useState<Row[]>(value);

  // A save or refetch replaces the server copy; take it as the new baseline.
  useEffect(() => setRows(value), [value]);

  const dirty = useMemo(
    () => JSON.stringify(toRubric(rows)) !== JSON.stringify(value),
    [rows, value],
  );
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const errors = rubricErrors(rows);
  const readOnly = !canEdit || !!lockedReason;
  const update = (index: number, patch: Partial<Row>) =>
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <section className="flex flex-col gap-3" aria-labelledby="rubric-heading">
      <div className="flex items-center gap-2">
        <h3 id="rubric-heading" className="text-base font-medium text-typography-900">
          {copy.heading}
        </h3>
        <FieldHelp text={copy.help} />
      </div>
      {lockedReason && <p className="text-sm text-typography-600">{lockedReason}</p>}

      {rows.map((row, index) => (
        <div
          key={row.key ?? `new-${index}`}
          className="flex flex-col gap-2 rounded-md border border-border-light p-3"
        >
          <div className="flex items-end gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-typography-600">
              {copy.name}
              <input
                className="rounded border border-border-light px-2 py-1.5 text-sm text-typography-900 disabled:bg-neutral-50"
                value={row.name}
                maxLength={80}
                disabled={readOnly}
                onChange={e => update(index, { name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-typography-600">
              <span className="flex items-center gap-1">
                {copy.weight}
                <FieldHelp text={copy.weightHelp} />
              </span>
              <select
                className="rounded border border-border-light px-2 py-1.5 text-sm text-typography-900 disabled:bg-neutral-50"
                value={row.weight}
                disabled={readOnly}
                onChange={e => update(index, { weight: Number(e.target.value) })}
              >
                {WEIGHTS.map(w => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            {!readOnly && (
              <button
                type="button"
                className="pb-1.5 text-sm text-destructive-700 hover:underline"
                onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}
                aria-label={copy.remove(row.name)}
              >
                ✕
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1 text-xs text-typography-600">
            {copy.description}
            <textarea
              className="min-h-[56px] rounded border border-border-light px-2 py-1.5 text-sm text-typography-900 disabled:bg-neutral-50"
              value={row.description}
              maxLength={600}
              disabled={readOnly}
              onChange={e => update(index, { description: e.target.value })}
            />
          </label>
        </div>
      ))}

      {!readOnly && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm text-typography-700 hover:text-typography-900 disabled:opacity-50"
            disabled={rows.length >= RUBRIC_MAX_CRITERIA}
            title={rows.length >= RUBRIC_MAX_CRITERIA ? copy.max(RUBRIC_MAX_CRITERIA) : undefined}
            onClick={() => setRows(prev => [...prev, { name: "", description: "", weight: 2 }])}
          >
            + {copy.add}
          </button>
          <Button
            variant={ButtonVariant.SECONDARY}
            disabled={!dirty || errors.length > 0 || saving}
            title={errors[0]}
            onClick={() => onSave(toRubric(rows))}
          >
            {copy.save}
          </Button>
        </div>
      )}
      {dirty && errors.length > 0 && (
        <ul className="text-xs text-destructive-700" role="alert">
          {errors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </section>
  );
};
