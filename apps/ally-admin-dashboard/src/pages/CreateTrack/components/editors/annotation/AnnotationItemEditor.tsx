import { FC, useMemo, useState } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import { ArtifactLabelPalette, ArtifactMarker, TextArea, Tooltip } from "@ally-ui-mono/ui-shared";
import { TooltipIcon } from "@assets";
import {
  ANNOTATION_KIND_OPTIONS,
  ANNOTATION_REVEAL_OPTIONS,
  DEFAULT_ANNOTATION_SETTINGS,
  MAX_ANNOTATION_UNITS,
} from "@constants";
import {
  AnnotationArtifactKind,
  AnnotationFormValue,
  AnnotationLabelDef,
  AnnotationRevealKey,
  AnnotationTarget,
  TrackFormValues,
  TrackItemType,
} from "@types";

import { resegmentArtifact } from "../../../annotationSegmentation";
import { ItemEditorFrame } from "../ItemEditorFrame";
import { AnnotationLabelsEditor } from "./AnnotationLabelsEditor";

interface AnnotationItemEditorProps {
  sectionIndex: number;
  itemIndex: number;
  onDelete: () => void;
}

const sectionClass = "border-t border-border-light pt-4 flex flex-col gap-3";
const headingClass = "text-sm font-semibold text-typography-900";
const subClass = "text-xs text-typography-500";
const inputClass =
  "border border-border-light rounded-md px-2 py-1 text-sm outline-none focus:border-primary-400 disabled:opacity-60";

const EMPTY: AnnotationFormValue = {
  kind: "TRANSCRIPT",
  intro: "",
  units: [],
  labels: [],
  targets: [],
  settings: { ...DEFAULT_ANNOTATION_SETTINGS },
  sourceText: "",
};

/**
 * Authoring for the Annotation component, in the order the work actually
 * happens: paste the artifact, say what to look for, mark the answer, set the
 * rules. The answer key is laid down with the very same widget the learner
 * marks with, which is what stops the author's mental model drifting from the
 * thing learners see.
 */
export const AnnotationItemEditor: FC<AnnotationItemEditorProps> = ({
  sectionIndex,
  itemIndex,
  onDelete,
}) => {
  const { control, setValue } = useFormContext<TrackFormValues>();
  const base = `sections.${sectionIndex}.items.${itemIndex}.annotation` as const;

  const annotation =
    (useWatch({ control, name: base }) as AnnotationFormValue | undefined) ?? EMPTY;

  const [armedLabelId, setArmedLabelId] = useState<string | null>(null);
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const patch = (next: Partial<AnnotationFormValue>) => {
    setValue(base, { ...annotation, ...next }, { shouldDirty: true });
  };

  const overCap = annotation.units.length > MAX_ANNOTATION_UNITS;

  /** Re-segment on every keystroke so the author sees the learner's view live. */
  const applySource = (raw: string, kind: AnnotationArtifactKind) => {
    const { units, targets, droppedTargetCount } = resegmentArtifact({
      raw,
      kind,
      existingUnits: annotation.units,
      existingTargets: annotation.targets,
    });
    patch({ sourceText: raw, kind, units, targets });
    setDropNotice(
      droppedTargetCount
        ? `${droppedTargetCount} answer ${
            droppedTargetCount === 1 ? "mark was" : "marks were"
          } removed — their lines are gone.`
        : null,
    );
  };

  const toggleTarget = (unitId: string, labelId: string) => {
    const exists = annotation.targets.some(
      target => target.unitId === unitId && target.labelId === labelId,
    );
    patch({
      targets: exists
        ? annotation.targets.filter(
            target => !(target.unitId === unitId && target.labelId === labelId),
          )
        : [...annotation.targets, { unitId, labelId }],
    });
  };

  const setLabels = (labels: AnnotationLabelDef[]) => patch({ labels });

  const removeLabel = (labelId: string) => {
    if (armedLabelId === labelId) setArmedLabelId(null);
    patch({
      labels: annotation.labels.filter(label => label.id !== labelId),
      targets: annotation.targets.filter(target => target.labelId !== labelId),
    });
  };

  const setNote = (unitId: string, labelId: string, note: string) => {
    patch({
      targets: annotation.targets.map(target =>
        target.unitId === unitId && target.labelId === labelId ? { ...target, note } : target,
      ),
    });
  };

  const setSettings = (next: Partial<AnnotationFormValue["settings"]>) => {
    patch({ settings: { ...annotation.settings, ...next } });
  };

  const targetsByUnit = useMemo(() => {
    const map = new Map<string, AnnotationTarget[]>();
    for (const target of annotation.targets) {
      const list = map.get(target.unitId) ?? [];
      list.push(target);
      map.set(target.unitId, list);
    }
    return map;
  }, [annotation.targets]);

  const labelById = useMemo(
    () => new Map(annotation.labels.map(label => [label.id, label])),
    [annotation.labels],
  );

  const namedLabels = annotation.labels.filter(label => label.text.trim());

  return (
    <ItemEditorFrame
      sectionIndex={sectionIndex}
      itemIndex={itemIndex}
      type={TrackItemType.ANNOTATED_ARTIFACT}
      onDelete={onDelete}
    >
      {/* ---- Source ---- */}
      <div className="flex flex-col gap-3">
        <p className={headingClass}>The artifact</p>

        <div className="flex flex-wrap gap-2">
          {ANNOTATION_KIND_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              aria-pressed={annotation.kind === option.value}
              onClick={() => applySource(annotation.sourceText, option.value)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                annotation.kind === option.value
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-border-light text-typography-700 hover:bg-secondary-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={subClass}>
          {ANNOTATION_KIND_OPTIONS.find(o => o.value === annotation.kind)?.hint}
        </p>

        <TextArea
          id={`${base}.intro`}
          labelText="What the learner is looking for"
          value={annotation.intro ?? ""}
          onChange={event => patch({ intro: event.target.value })}
          rows={2}
          placeholder="e.g. Where does the caller minimise what they're feeling?"
          className="w-full"
        />

        <TextArea
          id={`${base}.sourceText`}
          labelText="Paste the transcript or note"
          value={annotation.sourceText}
          onChange={event => applySource(event.target.value, annotation.kind)}
          rows={8}
          placeholder={
            annotation.kind === "TRANSCRIPT"
              ? "Caller: I don't really know why I called.\nVolunteer: Take your time."
              : "One paragraph per block.\n\nSeparate them with a blank line."
          }
          className="w-full font-mono"
        />

        <div className="flex items-center gap-3">
          <span className={overCap ? "text-xs font-medium text-destructive-500" : subClass}>
            {annotation.units.length} of {MAX_ANNOTATION_UNITS} lines
          </span>
          {overCap && (
            <span className="text-xs text-destructive-500">
              Trim the artifact before publishing.
            </span>
          )}
        </div>
        {dropNotice && <p className="text-xs text-destructive-500">{dropNotice}</p>}
      </div>

      {/* ---- Labels ---- */}
      <div className={sectionClass}>
        <AnnotationLabelsEditor
          labels={annotation.labels}
          onChange={setLabels}
          onRemoveLabel={removeLabel}
        />
      </div>

      {/* ---- Answer key ---- */}
      <div className={sectionClass}>
        <p className={headingClass}>The answer key</p>
        <p className={subClass}>
          Pick a label, then tap the lines it applies to. Add a note to each one — that note is what
          the learner reads when the answer is revealed, and it is the part they remember.
        </p>

        {!annotation.units.length || !namedLabels.length ? (
          <p className="rounded-md border border-dashed border-border-light px-3 py-6 text-center text-sm text-typography-500">
            {!annotation.units.length
              ? "Paste an artifact above to start marking."
              : "Name at least one label above to start marking."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <ArtifactMarker
              units={annotation.units}
              labels={namedLabels}
              marks={annotation.targets.map(target => ({
                unitId: target.unitId,
                labelId: target.labelId,
              }))}
              armedLabelId={armedLabelId}
              onToggleMark={toggleTarget}
              renderUnitFooter={unitId => (
                <div className="flex flex-col gap-1.5">
                  {(targetsByUnit.get(unitId) ?? []).map(target => (
                    <input
                      key={target.labelId}
                      value={target.note ?? ""}
                      onChange={event => setNote(unitId, target.labelId, event.target.value)}
                      placeholder={`Why is this "${
                        labelById.get(target.labelId)?.text ?? "marked"
                      }"?`}
                      className={`${inputClass} w-full bg-white`}
                    />
                  ))}
                </div>
              )}
            />

            <div className="lg:sticky lg:top-4 lg:self-start">
              <ArtifactLabelPalette
                labels={namedLabels}
                armedLabelId={armedLabelId}
                onArm={setArmedLabelId}
              />
              <p className="mt-2 text-xs text-typography-500">
                {annotation.targets.length} mark
                {annotation.targets.length === 1 ? "" : "s"} in the key
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ---- Settings ---- */}
      <div className={sectionClass}>
        <p className={headingClass}>Scoring</p>

        <div className="flex flex-wrap items-end gap-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-typography-700">Pass score (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={annotation.settings.passScore}
              onChange={event => setSettings({ passScore: Number(event.target.value) })}
              onWheel={event => event.currentTarget.blur()}
              className={`${inputClass} w-24`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-typography-700">
              Attempts (blank = unlimited)
            </span>
            <input
              type="number"
              min={1}
              value={annotation.settings.maxAttempts ?? ""}
              onChange={event =>
                setSettings({
                  maxAttempts: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              onWheel={event => event.currentTarget.blur()}
              className={`${inputClass} w-24`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-typography-700">
              Cost of a wrong mark
              <Tooltip
                label="Points deducted for each line marked that isn't in the answer key. Without a cost, marking every line with every label scores 100%. Set to 0 for a low-stakes practice run."
                align="top"
              >
                <button type="button" className="cursor-pointer inline-flex items-center">
                  <TooltipIcon />
                </button>
              </Tooltip>
            </span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={annotation.settings.falsePositivePenalty}
              onChange={event => setSettings({ falsePositivePenalty: Number(event.target.value) })}
              onWheel={event => event.currentTarget.blur()}
              className={`${inputClass} w-24`}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <span className="text-xs font-medium text-typography-700">Show the answer key</span>
          {ANNOTATION_REVEAL_OPTIONS.map(option => (
            <label key={option.value} className="flex items-start gap-2">
              <input
                type="radio"
                name={`${base}.revealKey`}
                checked={annotation.settings.revealKey === option.value}
                onChange={() => setSettings({ revealKey: option.value as AnnotationRevealKey })}
                className="mt-1 accent-primary-500"
              />
              <span>
                <span className="block text-sm text-typography-800">{option.label}</span>
                <span className={subClass}>{option.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <p className={`${subClass} pt-1`}>
          Learners are told the pass score and the cost of a wrong mark before they start, but never
          how many lines are in the key — that would turn it into a hunt.
        </p>
      </div>
    </ItemEditorFrame>
  );
};
