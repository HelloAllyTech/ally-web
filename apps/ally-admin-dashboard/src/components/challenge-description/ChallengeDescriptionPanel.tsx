import { FC, useCallback, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  useGetAutofillModelsQuery,
  useGetAvailableLanguageVoicesQuery,
  useRegenerateFieldMutation,
} from "@api";
import { WandStars } from "@assets";
import { AutofillModelSelect } from "@components/autofill-model-select";
import {
  DEFAULT_AUTOFILL_MODEL,
  FALLBACK_AUTOFILL_MODEL_OPTIONS,
  en,
  FORM_FIELD_IDS,
  REGENERATE_TYPE,
} from "@constants";
import { RegenerateFieldResponse } from "@types";
import { isNonEmptyString } from "@utils";

import { buildScenarioContext } from "../linguistic-style-samples/scenarioLanguageUtils";
import { RichTextEditor } from "../rich-text-editor";

import type { LanguageOption } from "../linguistic-style-samples/scenarioLanguageUtils";

const TRANSLATION_DESCRIPTION_FIELD = "translationDescription" as const;
const PRIMARY_LANGUAGE_FIELD = "challengeDescriptionPrimaryLanguageId" as const;

const DESCRIPTION_MAX_LENGTH = 1000;

function parseDescriptionResponse(response: RegenerateFieldResponse): string | null {
  if (response.fieldName !== REGENERATE_TYPE.DESCRIPTION) return null;
  const content = response.content as unknown;
  if (typeof content === "string") return content;
  return null;
}

interface ChallengeDescriptionPanelProps {
  formMethods: any;
  isMandatory?: boolean;
  label?: string;
  placeholder?: string;
  maxLength?: number;
}

export const ChallengeDescriptionPanel: FC<ChallengeDescriptionPanelProps> = ({
  formMethods,
  isMandatory = false,
  label = "Challenge Description",
  placeholder,
  maxLength = DESCRIPTION_MAX_LENGTH,
}) => {
  const [regenerateField] = useRegenerateFieldMutation();
  const { data: apiModels } = useGetAutofillModelsQuery();
  const allModelOptions = apiModels?.length ? apiModels : FALLBACK_AUTOFILL_MODEL_OPTIONS;
  const [regenerating, setRegenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_AUTOFILL_MODEL);
  const selectedProvider =
    allModelOptions.find(m => m.value === selectedModel)?.provider ?? "openai";
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);

  const { setValue, control, getValues } = formMethods;
  const description =
    (useWatch({ control, name: FORM_FIELD_IDS.DESCRIPTION }) as string | undefined) ?? "";
  const { data: catalogLanguages = [], isLoading: catalogLoading } =
    useGetAvailableLanguageVoicesQuery({
      active: true,
      voicesNeeded: true,
    }) as { data: LanguageOption[]; isLoading: boolean };

  const challengeDescriptionPrimaryLanguageId = useWatch({
    control,
    name: PRIMARY_LANGUAGE_FIELD,
  }) as number | null | undefined;
  const translationDescription =
    (useWatch({ control, name: TRANSLATION_DESCRIPTION_FIELD }) as
      | Record<string, string>
      | undefined) ?? {};

  const scenarioLanguageTabs = useMemo(() => {
    const catalog = catalogLanguages as LanguageOption[];
    return [...catalog]
      .map(lang => {
        const id = String(lang.language_id);
        const code =
          [lang.value, lang.translationCode].map(s => String(s ?? "").trim()).find(Boolean) ?? "";
        return {
          languageId: id,
          label: lang.label ?? `Language ${id}`,
          value: code,
        };
      })
      .sort((a, b) => Number(a.languageId) - Number(b.languageId));
  }, [catalogLanguages]);

  const resolvedPrimaryId = useMemo(() => {
    if (challengeDescriptionPrimaryLanguageId != null) {
      return String(challengeDescriptionPrimaryLanguageId);
    }
    const catalog = catalogLanguages as LanguageOption[];
    const enFirst = catalog.find(
      l =>
        String(l.value ?? "")
          .toLowerCase()
          .includes("en") ||
        String((l as { translationCode?: string }).translationCode ?? "") === "en",
    );
    if (enFirst) return String(enFirst.language_id);
    return catalog[0] ? String(catalog[0].language_id) : null;
  }, [challengeDescriptionPrimaryLanguageId, catalogLanguages]);

  const effectivePrimaryId = useMemo(() => {
    if (resolvedPrimaryId) return resolvedPrimaryId;
    return scenarioLanguageTabs[0]?.languageId ?? null;
  }, [resolvedPrimaryId, scenarioLanguageTabs]);

  const activeLanguageId = useMemo(() => {
    if (selectedLanguageId && scenarioLanguageTabs.some(t => t.languageId === selectedLanguageId)) {
      return selectedLanguageId;
    }
    return scenarioLanguageTabs[0]?.languageId ?? null;
  }, [scenarioLanguageTabs, selectedLanguageId]);

  const isPrimaryTab = activeLanguageId != null && activeLanguageId === effectivePrimaryId;

  const valueForActiveTab = useMemo(() => {
    if (!activeLanguageId) return "";
    if (isPrimaryTab) return description;
    return translationDescription[activeLanguageId] ?? "";
  }, [activeLanguageId, isPrimaryTab, description, translationDescription]);

  const flushValueToForm = useCallback(
    (langId: string, value: string) => {
      const primary = effectivePrimaryId;
      if (primary != null && langId === primary) {
        setValue(FORM_FIELD_IDS.DESCRIPTION, value, {
          shouldDirty: true,
          shouldTouch: true,
        });
        return;
      }
      const prev = (getValues(TRANSLATION_DESCRIPTION_FIELD) ?? {}) as Record<string, string>;
      setValue(
        TRANSLATION_DESCRIPTION_FIELD,
        { ...prev, [langId]: value },
        { shouldDirty: true, shouldTouch: true },
      );
    },
    [getValues, effectivePrimaryId, setValue],
  );

  const handleChange = useCallback(
    (next: string) => {
      if (!activeLanguageId) return;
      flushValueToForm(activeLanguageId, next);
    },
    [activeLanguageId, flushValueToForm],
  );

  const tabsWithLocale = useMemo(
    () => scenarioLanguageTabs.filter(t => !!t.value?.trim()),
    [scenarioLanguageTabs],
  );

  const hasAnyContent = useMemo(() => {
    if (isNonEmptyString(description)) return true;
    for (const v of Object.values(translationDescription ?? {})) {
      if (isNonEmptyString(v)) return true;
    }
    return false;
  }, [description, translationDescription]);

  const autofillLabel = regenerating
    ? en.simulation.generating
    : hasAnyContent
      ? en.simulation.regenerate
      : en.simulation.generate;

  const handleGenerate = useCallback(async () => {
    if (tabsWithLocale.length === 0 || regenerating || catalogLoading) return;
    setRegenerating(true);
    try {
      const results = await Promise.allSettled(
        tabsWithLocale.map(tab =>
          regenerateField({
            fieldName: REGENERATE_TYPE.DESCRIPTION,
            scenarioContext: buildScenarioContext(
              formMethods,
              tab.languageId,
              tab.value,
              tab.label,
            ),
            model: selectedModel,
            provider: selectedProvider,
          }).unwrap(),
        ),
      );

      let successCount = 0;
      results.forEach((result, index) => {
        const tab = tabsWithLocale[index];
        if (result.status === "fulfilled") {
          const value = parseDescriptionResponse(result.value);
          if (value && value.trim().length > 0) {
            flushValueToForm(tab.languageId, value);
            successCount++;
          } else {
            toast.warning(`${en.errors.failedToRegenerate} (${tab.label})`);
          }
        } else {
          toast.error(`${en.errors.failedToRegenerate} (${tab.label})`);
        }
      });

      if (successCount > 0) {
        toast.success(`${label} ${en.simulation.regeneratedSuccessfully}`);
      }
    } finally {
      setRegenerating(false);
    }
  }, [
    catalogLoading,
    flushValueToForm,
    formMethods,
    label,
    regenerateField,
    regenerating,
    selectedModel,
    selectedProvider,
    tabsWithLocale,
  ]);

  if (catalogLoading) {
    return (
      <div
        className="w-full text-sm text-typography-600"
        data-testid="challenge-description-loading"
      >
        Loading languages…
      </div>
    );
  }

  if (scenarioLanguageTabs.length === 0) {
    return (
      <div className="w-full text-sm text-typography-600">
        No languages with voices are available in the catalog yet. Add scenario voices in admin to
        edit the challenge description per language.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" data-testid="challenge-description-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-typography-900 text-base cursor-pointer flex items-center gap-1">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <AutofillModelSelect
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={regenerating}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={regenerating || catalogLoading || tabsWithLocale.length === 0}
            className="inline-flex items-center gap-1 text-sm border rounded-2xl px-3 py-1.5 transition-opacity border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {regenerating ? (
              <div className="w-4 h-4 border-2 border-dashed border-primary-300 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WandStars />
            )}{" "}
            {autofillLabel}
          </button>
        </div>
      </div>
      <div className="border border-border-light rounded-md overflow-hidden bg-white">
        <div className="flex border-b border-border-light overflow-x-auto">
          {scenarioLanguageTabs.map(tab => {
            const isActive = activeLanguageId === tab.languageId;
            return (
              <button
                key={tab.languageId}
                type="button"
                onClick={() => setSelectedLanguageId(tab.languageId)}
                className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary-500 border-b-2 border-primary-500 bg-primary-50/30"
                    : "text-typography-600 hover:text-typography-800 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {activeLanguageId && (
          <div className="p-4">
            <RichTextEditor
              value={valueForActiveTab}
              onChange={handleChange}
              placeholder={placeholder}
              maxLength={maxLength}
            />
          </div>
        )}
      </div>
    </div>
  );
};
