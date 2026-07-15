import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { FillerTagPicker } from "@components/filler-tag-picker";
import { en, ENHANCE_TYPE } from "@constants";

import { EnhanceButton } from "../enhance-button";
import { LanguageTabPanel } from "../language-tab-panel";
import {
  ALLOWED_FILLER_WORDS_FIELD,
  ALLOWED_FILLER_WORDS_MAX,
  stringsToFillerTags,
  uniqueFillerNamesPreserveOrder,
  type FillerTag,
  type LanguageOption,
} from "./scenarioLanguageUtils";
import { useScenarioLanguagesToShow } from "./useScenarioLanguagesToShow";

interface AllowedFillerWordsPanelProps {
  formMethods: any;
  /** View Details mode: language tabs stay navigable, tags aren't editable. */
  readOnly?: boolean;
}

export const AllowedFillerWordsPanel: FC<AllowedFillerWordsPanelProps> = ({
  formMethods,
  readOnly = false,
}) => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  /** Accumulated filler names per language (AI + user) so removed items stay searchable in the picker. */
  const [fillerHintNamesByLang, setFillerHintNamesByLang] = useState<Record<string, string[]>>({});

  const { setValue, control } = formMethods;
  const { languagesToShow, isLoading } = useScenarioLanguagesToShow(formMethods);

  const allowedFillerWords =
    (useWatch({ control, name: ALLOWED_FILLER_WORDS_FIELD }) as Record<string, string[]>) ?? {};

  useEffect(() => {
    setFillerHintNamesByLang(prev => {
      let next = prev;
      let changed = false;
      for (const [langId, arr] of Object.entries(allowedFillerWords)) {
        const incoming = uniqueFillerNamesPreserveOrder(
          (arr ?? []).map(s => String(s).trim()).filter(Boolean),
        );
        const prevList = next[langId] ?? [];
        const merged = uniqueFillerNamesPreserveOrder([...prevList, ...incoming]);
        if (merged.length !== prevList.length || merged.some((n, i) => n !== prevList[i])) {
          if (!changed) {
            next = { ...prev };
            changed = true;
          }
          next[langId] = merged;
        }
      }
      return changed ? next : prev;
    });
  }, [allowedFillerWords]);

  const activeLanguageId = useMemo(() => {
    if (
      selectedLanguageId &&
      (languagesToShow as LanguageOption[]).some(l => String(l.language_id) === selectedLanguageId)
    ) {
      return selectedLanguageId;
    }
    return languagesToShow.length > 0
      ? String((languagesToShow[0] as LanguageOption).language_id)
      : null;
  }, [languagesToShow, selectedLanguageId]);

  const fillerTagsForActiveLanguage = useMemo(() => {
    if (!activeLanguageId) return [];
    return stringsToFillerTags(allowedFillerWords[activeLanguageId]);
  }, [activeLanguageId, allowedFillerWords]);

  const handleFillerTagsChange = useCallback(
    (tags: FillerTag[]) => {
      if (!activeLanguageId) return;
      const names = uniqueFillerNamesPreserveOrder(tags.map(t => t.name));
      setValue(ALLOWED_FILLER_WORDS_FIELD, {
        ...allowedFillerWords,
        [activeLanguageId]: names,
      });
    },
    [activeLanguageId, allowedFillerWords, setValue],
  );

  // Enhance treats the active language's filler words as a newline-joined
  // blob; the improved text is split back into a unique, capped list.
  const enhanceCurrentValue = (
    activeLanguageId ? (allowedFillerWords[activeLanguageId] ?? []) : []
  ).join("\n");
  const handleEnhanceApply = useCallback(
    (improved: string) => {
      if (!activeLanguageId) return;
      const names = uniqueFillerNamesPreserveOrder(
        improved
          .split(/[\n,]/)
          .map(s => s.trim())
          .filter(Boolean),
      ).slice(0, ALLOWED_FILLER_WORDS_MAX);
      setValue(ALLOWED_FILLER_WORDS_FIELD, {
        ...allowedFillerWords,
        [activeLanguageId]: names,
      });
    },
    [activeLanguageId, allowedFillerWords, setValue],
  );

  if (isLoading || languagesToShow.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4" data-testid="allowed-filler-words-panel">
      <div className="flex justify-between items-center py-2 w-full gap-4 flex-wrap">
        <span className="font-regular text-base text-typography-900">
          {en.simulation.allowedFillersSectionTitle}
        </span>
        {activeLanguageId && !readOnly && (
          <EnhanceButton
            enhanceType={ENHANCE_TYPE.ALLOWED_FILLER_WORDS}
            label={en.simulation.allowedFillersSectionTitle}
            currentValue={enhanceCurrentValue}
            onApply={handleEnhanceApply}
          />
        )}
      </div>
      <LanguageTabPanel
        tabs={(languagesToShow as LanguageOption[]).map(l => ({
          id: String(l.language_id),
          label: l.label ?? String(l.language_id),
        }))}
        activeTabId={activeLanguageId}
        onTabChange={setSelectedLanguageId}
      >
        {activeLanguageId && (
          <div className="p-4">
            {/* Tag add/remove is the only interaction; inert wrapper keeps the
                tags readable per language while the tabs above stay clickable. */}
            <div className={`min-h-[40px] ${readOnly ? "pointer-events-none" : ""}`}>
              <FillerTagPicker
                tags={fillerTagsForActiveLanguage}
                updateTags={handleFillerTagsChange}
                maxTags={ALLOWED_FILLER_WORDS_MAX}
                supplementalTagNames={fillerHintNamesByLang[activeLanguageId] ?? []}
              />
            </div>
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
