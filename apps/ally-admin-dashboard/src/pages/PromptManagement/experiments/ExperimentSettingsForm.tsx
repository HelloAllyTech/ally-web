import React, { useEffect, useMemo, useState } from "react";

import { useGetLlmModelsQuery } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { ConfigureSkillExperimentRequest, SkillExperimentSettings } from "@types";

import { FieldHelp } from "./FieldHelp";

type NumericKey = keyof SkillExperimentSettings;

/** Mirrors ally-be SKILL_EXPERIMENT_LIMITS; the server enforces the same bounds. */
const FIELDS: Array<{
  key: NumericKey;
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
}> = (() => {
  const c = en.skillExperiments.settings;
  return [
    {
      key: "targetScore",
      label: c.targetScore,
      help: c.targetScoreHelp,
      min: 50,
      max: 100,
      step: 1,
    },
    {
      key: "minSamplesPerVariant",
      label: c.minSamples,
      help: c.minSamplesHelp,
      min: 10,
      max: 500,
      step: 1,
    },
    {
      key: "challengerTrafficPercent",
      label: c.traffic,
      help: c.trafficHelp,
      min: 5,
      max: 50,
      step: 1,
    },
    { key: "maxVariants", label: c.maxVariants, help: c.maxVariantsHelp, min: 1, max: 30, step: 1 },
    {
      key: "maxConsecutiveLosses",
      label: c.maxLosses,
      help: c.maxLossesHelp,
      min: 1,
      max: 10,
      step: 1,
    },
    {
      key: "minImprovement",
      label: c.minImprovement,
      help: c.minImprovementHelp,
      min: 0,
      max: 20,
      step: 0.5,
    },
  ];
})();

interface Values extends Record<NumericKey, string> {
  judgeModel: string;
  designerModel: string;
}

interface ExperimentSettingsFormProps {
  settings: SkillExperimentSettings;
  judgeModel: string | null;
  designerModel: string | null;
  /** True while a run is live: the judge model is locked. */
  live: boolean;
  canEdit: boolean;
  saving: boolean;
  onSave: (patch: ConfigureSkillExperimentRequest) => void;
  onDirtyChange: (dirty: boolean) => void;
}

const toValues = (
  settings: SkillExperimentSettings,
  judgeModel: string | null,
  designerModel: string | null,
): Values => ({
  ...(Object.fromEntries(FIELDS.map(f => [f.key, String(settings[f.key])])) as Record<
    NumericKey,
    string
  >),
  judgeModel: judgeModel ?? "",
  designerModel: designerModel ?? "",
});

export const ExperimentSettingsForm: React.FC<ExperimentSettingsFormProps> = ({
  settings,
  judgeModel,
  designerModel,
  live,
  canEdit,
  saving,
  onSave,
  onDirtyChange,
}) => {
  const copy = en.skillExperiments.settings;
  const initial = useMemo(
    () => toValues(settings, judgeModel, designerModel),
    [settings, judgeModel, designerModel],
  );
  const [values, setValues] = useState<Values>(initial);
  useEffect(() => setValues(initial), [initial]);

  const { data: models = [] } = useGetLlmModelsQuery();

  const errors = FIELDS.flatMap(f => {
    const n = Number(values[f.key]);
    return values[f.key] === "" || !Number.isFinite(n) || n < f.min || n > f.max
      ? [copy.invalid(f.label, f.min, f.max)]
      : [];
  });
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  const save = () => {
    const patch: ConfigureSkillExperimentRequest = {};
    for (const f of FIELDS) {
      if (values[f.key] !== initial[f.key]) patch[f.key] = Number(values[f.key]);
    }
    if (values.judgeModel !== initial.judgeModel) patch.judgeModel = values.judgeModel;
    if (values.designerModel !== initial.designerModel) patch.designerModel = values.designerModel;
    onSave(patch);
  };

  const modelSelect = (
    field: "judgeModel" | "designerModel",
    label: string,
    help: string,
    disabled: boolean,
  ) => (
    <label className="flex flex-col gap-1 text-xs text-typography-600">
      <span className="flex items-center gap-1">
        {label}
        <FieldHelp text={help} />
      </span>
      <select
        className="rounded border border-border-light px-2 py-1.5 text-sm text-typography-900 disabled:bg-neutral-50"
        value={values[field]}
        disabled={disabled}
        onChange={e => setValues(prev => ({ ...prev, [field]: e.target.value }))}
      >
        <option value="">{copy.defaultModel}</option>
        {/* Keep a saved model selectable even if the catalog no longer lists it. */}
        {values[field] && !models.some(m => m.model === values[field]) && (
          <option value={values[field]}>{values[field]}</option>
        )}
        {models.map(m => (
          <option key={`${m.provider}:${m.model}`} value={m.model}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="flex flex-col gap-3" aria-labelledby="settings-heading">
      <h3 id="settings-heading" className="text-base font-medium text-typography-900">
        {copy.heading}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(f => (
          <label key={f.key} className="flex flex-col gap-1 text-xs text-typography-600">
            <span className="flex items-center gap-1">
              {f.label}
              <FieldHelp text={f.help} />
            </span>
            <input
              type="number"
              className="rounded border border-border-light px-2 py-1.5 text-sm text-typography-900 disabled:bg-neutral-50"
              min={f.min}
              max={f.max}
              step={f.step}
              value={values[f.key]}
              disabled={!canEdit}
              onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
            />
          </label>
        ))}
        {modelSelect("judgeModel", copy.judgeModel, copy.judgeModelHelp, !canEdit || live)}
        {modelSelect("designerModel", copy.designerModel, copy.designerModelHelp, !canEdit)}
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            variant={ButtonVariant.SECONDARY}
            disabled={!dirty || errors.length > 0 || saving}
            title={errors[0]}
            onClick={save}
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
