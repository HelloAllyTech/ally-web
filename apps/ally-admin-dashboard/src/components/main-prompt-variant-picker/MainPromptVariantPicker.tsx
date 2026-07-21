import React, { useMemo } from "react";

import { UseFormReturn } from "react-hook-form";

import {
  useGetLanguagesQuery,
  useGetPromptsByTypeQuery,
  useGetPromptTranslationsQuery,
} from "@api";

import { FormLabel } from "../form-label";

type Variant = "GENERIC" | "MULTILINGUAL";

interface Props {
  /** RHF field id — the variant map (e.g. "mainPromptVariantByLanguage"). */
  id: string;
  label: string;
  formMethods: UseFormReturn<any>;
  isMandatory?: boolean;
}

/**
 * Per-language choice of GENERIC (English source — the model speaks the target
 * language) vs MULTILINGUAL (the translated prompt body) for the selected skill
 * version. The language list is driven by the selected main-agent prompt's
 * translations: a language can only pick MULTILINGUAL once its translation is
 * `ready`. Value shape: Record<languageId, Variant>; a missing entry = GENERIC.
 */
export const MainPromptVariantPicker: React.FC<Props> = ({
  id,
  label,
  formMethods,
  isMandatory = false,
}) => {
  const selectedCode = formMethods.watch("selectedMainPromptCode") as string | undefined;
  const { data: prompts } = useGetPromptsByTypeQuery("main_agent");
  const { data: languages } = useGetLanguagesQuery({});

  const promptId = useMemo(
    () => prompts?.find(p => p.promptCode === selectedCode)?.id,
    [prompts, selectedCode],
  );

  const { data: translations } = useGetPromptTranslationsQuery(promptId ?? "", {
    skip: !promptId,
  });

  const languageLabel = useMemo(() => {
    const map = new Map<number, string>();
    (languages ?? []).forEach(l => {
      if (typeof l.id === "number") map.set(l.id, l.label);
    });
    return (langId: number) => map.get(langId) ?? `Language ${langId}`;
  }, [languages]);

  const rows = useMemo(
    () =>
      [...(translations ?? [])].sort((a, b) =>
        languageLabel(a.languageId).localeCompare(languageLabel(b.languageId)),
      ),
    [translations, languageLabel],
  );

  const value = (formMethods.watch(id) ?? {}) as Record<string, Variant>;

  const setVariant = (languageId: number, variant: Variant) => {
    formMethods.setValue(id, { ...value, [String(languageId)]: variant }, { shouldDirty: true });
  };

  const optionButton = (languageId: number, variant: Variant, text: string, disabled: boolean) => {
    const active = (value[String(languageId)] ?? "GENERIC") === variant;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVariant(languageId, variant)}
        className={`px-3 py-1 text-sm border transition-colors ${
          active
            ? "bg-primary-500 text-white border-primary-500"
            : "bg-white text-typography-800 border-border-light hover:bg-neutral-100"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""} first:rounded-l last:rounded-r`}
        title={disabled ? "Translation not ready for this language yet" : undefined}
      >
        {text}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <FormLabel isMandatory={isMandatory}>{label}</FormLabel>
      <p className="text-sm text-typography-600">
        Choose, per language, whether this simulation uses the English source prompt (Generic) or
        its translated version (Multilingual). English sessions always use the source.
      </p>

      {!promptId ? (
        <p className="text-sm text-typography-600">Select a Skill Version first.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-typography-600">
          No translations available for this skill version — every language uses the Generic
          (English) prompt. Enable and generate translations in Prompt Management to offer a
          Multilingual option.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(row => {
            const ready = row.status === "ready";
            return (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border-light bg-neutral-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-typography-900">
                  {languageLabel(row.languageId)}
                  {!ready && (
                    <span className="ml-2 text-xs text-typography-500">
                      (translation {row.status})
                    </span>
                  )}
                </span>
                <div className="flex">
                  {optionButton(row.languageId, "GENERIC", "Generic", false)}
                  {optionButton(row.languageId, "MULTILINGUAL", "Multilingual", !ready)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MainPromptVariantPicker;
