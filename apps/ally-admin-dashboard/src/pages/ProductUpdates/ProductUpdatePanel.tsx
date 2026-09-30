import React, { useEffect, useMemo, useState } from "react";

import { toast } from "sonner";

import {
  Checkbox,
  Select,
  SelectItem,
  TextArea,
  TextInput,
  Tooltip,
} from "@ally-ui-mono/ui-shared";
import {
  ProductUpdate,
  ProductUpdateAudience,
  ProductUpdateKind,
  ProductUpdateSource,
  ProductUpdateSurface,
  UpdateProductUpdateBody,
  useGetProductUpdateQuery,
  useUpdateProductUpdateMutation,
} from "@api";
import { TooltipIcon } from "@assets";
import { EntitySidePanel } from "@components";
import { en } from "@constants";
import { formatDate, formatDateTime } from "@utils";

import { getAudienceOptions, getKindOptions, getSurfaceOptions } from "./options";

/** Below this the automation itself is unsure; flag it so a person reads the wording. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

interface FormValues {
  title: string;
  summary: string;
  teamNotes: string;
  kind: ProductUpdateKind;
  audience: ProductUpdateAudience;
  surfaces: ProductUpdateSurface[];
  area: string;
  hidden: boolean;
}

const toFormValues = (update: ProductUpdate): FormValues => ({
  title: update.title,
  summary: update.summary,
  teamNotes: update.teamNotes ?? "",
  kind: update.kind,
  audience: update.audience,
  surfaces: update.surfaces,
  area: update.area,
  hidden: update.hidden,
});

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(x => b.includes(x));

/** Only the fields that differ from the saved update — the server locks exactly what is sent. */
export const diffFormValues = (
  values: FormValues,
  original: FormValues,
  surfaceOrder: ProductUpdateSurface[],
): UpdateProductUpdateBody => {
  const body: UpdateProductUpdateBody = {};
  if (values.title.trim() !== original.title) body.title = values.title.trim();
  if (values.summary.trim() !== original.summary) body.summary = values.summary.trim();
  if (values.teamNotes.trim() !== original.teamNotes.trim()) {
    body.teamNotes = values.teamNotes.trim();
  }
  if (values.kind !== original.kind) body.kind = values.kind;
  if (values.audience !== original.audience) body.audience = values.audience;
  if (!sameSet(values.surfaces, original.surfaces)) {
    body.surfaces = surfaceOrder.filter(s => values.surfaces.includes(s));
  }
  if (values.area !== original.area) body.area = values.area;
  if (values.hidden !== original.hidden) body.hidden = values.hidden;
  return body;
};

const HelpTooltip: React.FC<{ label: string }> = ({ label }) => (
  <Tooltip label={label} align="top">
    <button type="button" className="cursor-pointer inline-flex items-center">
      <TooltipIcon />
    </button>
  </Tooltip>
);

const CountedField: React.FC<{
  label: string;
  htmlFor: string;
  used: number;
  max: number;
  help?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, used, max, help, children }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm text-typography-900 font-primary">
        {label}
      </label>
      <span
        className={`text-xs ${used > max ? "text-destructive-500" : "text-typography-400"}`}
        data-testid={`${htmlFor}-counter`}
      >
        {en.productUpdates.panel.counter(used, max)}
      </span>
    </div>
    {children}
    {help && <span className="text-xs text-typography-400">{help}</span>}
  </div>
);

const SourceRow: React.FC<{ source: ProductUpdateSource }> = ({ source }) => {
  const t = en.productUpdates;
  const name =
    source.prNumber !== null
      ? `${source.repo} #${source.prNumber}`
      : `${source.repo} ${t.panel.push}`;
  const subject = source.subjects[0];
  return (
    <li className="py-2 border-b border-border-light last:border-b-0 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2">
        {source.prUrl ? (
          <a
            href={source.prUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary-600 hover:underline font-medium"
          >
            {name}
          </a>
        ) : (
          <span className="font-medium">{name}</span>
        )}
        {source.author && <span className="text-typography-700">{source.author}</span>}
        <span className="ml-auto text-xs text-typography-700">
          {source.liveAt
            ? t.panel.liveOnDate(formatDate(source.liveAt))
            : source.deployables.length
              ? t.panel.waitingOn(source.deployables.join(", "))
              : t.panel.waitingGeneric}
        </span>
      </div>
      {subject && <div className="text-typography-700 break-words">{subject}</div>}
    </li>
  );
};

const ReadOnlyRow: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex gap-3 text-sm">
    <span className="w-[140px] shrink-0 text-typography-700">{label}</span>
    <span className="text-typography-900 break-words min-w-0">{children}</span>
  </div>
);

interface ProductUpdatePanelProps {
  /** The row that was clicked; null closes the panel. */
  update: ProductUpdate | null;
  onClose: () => void;
}

export const ProductUpdatePanel: React.FC<ProductUpdatePanelProps> = ({ update, onClose }) => {
  const t = en.productUpdates;
  const isOpen = update !== null;
  const original = useMemo(() => (update ? toFormValues(update) : null), [update]);
  const [values, setValues] = useState<FormValues | null>(original);

  useEffect(() => {
    setValues(original);
  }, [original]);

  // The list row has no `sources`; the single-update endpoint does.
  const {
    data: detail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useGetProductUpdateQuery(update?.id ?? "", { skip: !update });
  const [saveUpdate, { isLoading: isSaving }] = useUpdateProductUpdateMutation();

  const surfaceOptions = getSurfaceOptions();
  const shown = update ? (detail ?? update) : null;

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues(prev => (prev ? { ...prev, [key]: value } : prev));

  const changes = useMemo(
    () =>
      values && original
        ? diffFormValues(
            values,
            original,
            getSurfaceOptions().map(o => o.value),
          )
        : {},
    [values, original],
  );
  const dirty = Object.keys(changes).length > 0;

  const invalidReason = useMemo(() => {
    if (!values) return undefined;
    const limits = t.limits;
    if (!values.title.trim()) return t.panel.titleRequired;
    if (values.title.trim().length > limits.title) {
      return t.panel.tooLong(t.panel.titleLabel, limits.title);
    }
    // The backend refuses an update without a summary: it is the line the
    // public changelog shows under the title.
    if (!values.summary.trim()) return t.panel.summaryRequired;
    if (values.summary.trim().length > limits.summary) {
      return t.panel.tooLong(t.panel.summaryLabel, limits.summary);
    }
    if (values.teamNotes.trim().length > limits.teamNotes) {
      return t.panel.tooLong(t.panel.teamNotesLabel, limits.teamNotes);
    }
    if (values.surfaces.length === 0) return t.panel.surfacesRequired;
    return undefined;
  }, [values, t]);

  const handleSave = async () => {
    if (!update || !dirty || invalidReason) return;
    const result = await saveUpdate({ id: update.id, data: changes });
    if ("error" in result && result.error) {
      toast.error(t.toasts.saveFailed);
      return;
    }
    toast.success(t.toasts.saved);
    onClose();
  };

  const toggleSurface = (surface: ProductUpdateSurface, checked: boolean) => {
    if (!values) return;
    set(
      "surfaces",
      checked ? [...values.surfaces, surface] : values.surfaces.filter(s => s !== surface),
    );
  };

  const lowConfidence = shown ? shown.confidence < LOW_CONFIDENCE_THRESHOLD : false;

  return (
    <EntitySidePanel
      isOpen={isOpen}
      title={t.panel.title}
      dirty={dirty}
      saveDisabled={!dirty || Boolean(invalidReason) || isSaving}
      saveDisabledReason={invalidReason}
      unsavedChangesWarning={t.panel.unsavedChangesWarning}
      onClose={onClose}
      onSave={handleSave}
    >
      {values && shown && (
        <>
          <CountedField
            label={t.panel.titleLabel}
            htmlFor="product-update-title"
            used={values.title.length}
            max={t.limits.title}
          >
            <TextInput
              id="product-update-title"
              labelText={t.panel.titleLabel}
              hideLabel
              value={values.title}
              invalid={values.title.length > t.limits.title}
              onChange={e => set("title", e.target.value)}
            />
          </CountedField>

          <CountedField
            label={t.panel.summaryLabel}
            htmlFor="product-update-summary"
            used={values.summary.length}
            max={t.limits.summary}
          >
            <TextArea
              id="product-update-summary"
              labelText={t.panel.summaryLabel}
              hideLabel
              rows={4}
              value={values.summary}
              invalid={values.summary.length > t.limits.summary}
              onChange={e => set("summary", e.target.value)}
            />
          </CountedField>

          <CountedField
            label={t.panel.teamNotesLabel}
            htmlFor="product-update-team-notes"
            used={values.teamNotes.length}
            max={t.limits.teamNotes}
            help={t.panel.teamNotesHelp}
          >
            <TextArea
              id="product-update-team-notes"
              labelText={t.panel.teamNotesLabel}
              hideLabel
              rows={6}
              value={values.teamNotes}
              invalid={values.teamNotes.length > t.limits.teamNotes}
              onChange={e => set("teamNotes", e.target.value)}
            />
          </CountedField>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-update-kind" className="text-sm text-typography-900">
                {t.panel.kindLabel}
              </label>
              <Select
                id="product-update-kind"
                labelText={t.panel.kindLabel}
                hideLabel
                value={values.kind}
                onChange={e => set("kind", e.target.value as ProductUpdateKind)}
              >
                {getKindOptions().map(o => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="product-update-audience" className="text-sm text-typography-900">
                  {t.panel.audienceLabel}
                </label>
                <HelpTooltip label={t.panel.audienceHelp} />
              </div>
              <Select
                id="product-update-audience"
                labelText={t.panel.audienceLabel}
                hideLabel
                value={values.audience}
                onChange={e => set("audience", e.target.value as ProductUpdateAudience)}
              >
                {getAudienceOptions().map(o => (
                  <SelectItem key={o.value} value={o.value} text={o.label} />
                ))}
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="product-update-area" className="text-sm text-typography-900">
              {t.panel.areaLabel}
            </label>
            <Select
              id="product-update-area"
              labelText={t.panel.areaLabel}
              hideLabel
              value={values.area}
              onChange={e => set("area", e.target.value)}
            >
              {/* The automation may have filed it under an area outside the fixed list. */}
              {!t.areas.includes(values.area) && (
                <SelectItem value={values.area} text={values.area} />
              )}
              {t.areas.map(area => (
                <SelectItem key={area} value={area} text={area} />
              ))}
            </Select>
          </div>

          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm text-typography-900 mb-1">{t.panel.surfacesLabel}</legend>
            {surfaceOptions.map(o => (
              <Checkbox
                key={o.value}
                id={`product-update-surface-${o.value}`}
                labelText={o.label}
                checked={values.surfaces.includes(o.value)}
                onChange={(_event: unknown, { checked }: { checked: boolean }) =>
                  toggleSurface(o.value, checked)
                }
              />
            ))}
            {values.surfaces.length === 0 && (
              <span className="text-xs text-destructive-500">{t.panel.surfacesRequired}</span>
            )}
          </fieldset>

          <div className="flex items-center gap-1.5">
            <Checkbox
              id="product-update-hidden"
              labelText={t.panel.hiddenLabel}
              checked={values.hidden}
              onChange={(_event: unknown, { checked }: { checked: boolean }) =>
                set("hidden", checked)
              }
            />
            <HelpTooltip label={t.panel.hiddenHelp} />
          </div>

          <div className="border-t border-border-light pt-4 flex flex-col gap-2">
            <h3 className="text-sm font-medium text-typography-900">{t.panel.fromAutomation}</h3>
            <ReadOnlyRow label={t.panel.confidence}>
              {Math.round(shown.confidence * 100)}%
              {lowConfidence && (
                <span className="ml-2 text-destructive-500" role="status">
                  {t.panel.lowConfidence}
                </span>
              )}
            </ReadOnlyRow>
            <ReadOnlyRow label={t.panel.reason}>{shown.decisionReason || t.panel.none}</ReadOnlyRow>
            <ReadOnlyRow label={t.panel.model}>{shown.model || t.panel.none}</ReadOnlyRow>
            <ReadOnlyRow label={t.panel.firstMerged}>
              {formatDateTime(shown.firstMergedAt)}
            </ReadOnlyRow>
            <ReadOnlyRow label={t.panel.lastMerged}>
              {formatDateTime(shown.lastMergedAt)}
            </ReadOnlyRow>
            <ReadOnlyRow label={t.panel.liveOn}>
              {shown.liveAt ? formatDateTime(shown.liveAt) : t.panel.notYet}
            </ReadOnlyRow>
            <ReadOnlyRow label={t.panel.publishedOn}>
              {shown.publishedAt ? formatDateTime(shown.publishedAt) : t.panel.notYet}
            </ReadOnlyRow>
            {shown.editedFields.length > 0 && (
              <ReadOnlyRow label={t.panel.editedFields}>
                {shown.editedFields.join(", ")}
              </ReadOnlyRow>
            )}
          </div>

          <div className="border-t border-border-light pt-4">
            <h3 className="text-sm font-medium text-typography-900">
              {t.panel.merges} ({shown.sourceCount})
            </h3>
            {isLoadingDetail ? (
              <p className="text-sm text-typography-700 mt-2">{t.panel.loadingMerges}</p>
            ) : isDetailError ? (
              <p className="text-sm text-destructive-500 mt-2">{t.panel.mergesFailed}</p>
            ) : detail?.sources && detail.sources.length > 0 ? (
              <ul className="mt-1">
                {detail.sources.map(source => (
                  <SourceRow key={source.id} source={source} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-typography-700 mt-2">{t.panel.noMerges}</p>
            )}
          </div>
        </>
      )}
    </EntitySidePanel>
  );
};
