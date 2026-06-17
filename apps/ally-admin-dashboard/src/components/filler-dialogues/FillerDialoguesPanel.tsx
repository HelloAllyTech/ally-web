import { FC, useCallback, useEffect, useMemo, useState } from "react";

import { useWatch } from "react-hook-form";

import { FillerTagPicker } from "@components/filler-tag-picker";

import { LanguageTabPanel } from "../language-tab-panel";
import {
  stringsToFillerTags,
  uniqueFillerNamesPreserveOrder,
  type FillerTag,
  type LanguageOption,
} from "../linguistic-style-samples/scenarioLanguageUtils";
import { useScenarioLanguagesToShow } from "../linguistic-style-samples/useScenarioLanguagesToShow";

/**
 * Per-language "Dialogues" editor shown under the Thinking Filler toggle.
 *
 * Mirrors AllowedFillerWordsPanel: dialogues are stored as a per-language map
 * (fillerDialogues: { [languageId]: string[] }); Core flattens to the active
 * language before sending to the agent. Each dialogue is one tag.
 */
const FILLER_DIALOGUES_FIELD = "fillerDialogues";
const FILLER_DIALOGUES_MAX = 20;

interface FillerDialoguesPanelProps {
  formMethods: any;
}

export const FillerDialoguesPanel: FC<FillerDialoguesPanelProps> = ({ formMethods }) => {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(null);
  /** Accumulated dialogue names per language so removed items stay searchable in the picker. */
  const [hintNamesByLang, setHintNamesByLang] = useState<Record<string, string[]>>({});

  const { setValue, control } = formMethods;
  const { languagesToShow, isLoading } = useScenarioLanguagesToShow(formMethods);

  const fillerDialogues =
    (useWatch({ control, name: FILLER_DIALOGUES_FIELD }) as Record<string, string[]>) ?? {};

  useEffect(() => {
    setHintNamesByLang(prev => {
      let next = prev;
      let changed = false;
      for (const [langId, arr] of Object.entries(fillerDialogues)) {
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
  }, [fillerDialogues]);

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

  const tagsForActiveLanguage = useMemo(() => {
    if (!activeLanguageId) return [];
    return stringsToFillerTags(fillerDialogues[activeLanguageId]);
  }, [activeLanguageId, fillerDialogues]);

  const handleTagsChange = useCallback(
    (tags: FillerTag[]) => {
      if (!activeLanguageId) return;
      const names = uniqueFillerNamesPreserveOrder(tags.map(t => t.name));
      setValue(FILLER_DIALOGUES_FIELD, {
        ...fillerDialogues,
        [activeLanguageId]: names,
      });
    },
    [activeLanguageId, fillerDialogues, setValue],
  );

  if (isLoading || languagesToShow.length === 0) {
    return null;
  }

  return (
    <div className="w-full flex flex-col gap-4" data-testid="filler-dialogues-panel">
      <div className="flex justify-between items-center py-2 w-full gap-4 flex-wrap">
        <span className="font-regular text-base text-typography-900">Dialogues</span>
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
            <div className="min-h-[40px]">
              <FillerTagPicker
                tags={tagsForActiveLanguage}
                updateTags={handleTagsChange}
                maxTags={FILLER_DIALOGUES_MAX}
                supplementalTagNames={hintNamesByLang[activeLanguageId] ?? []}
              />
            </div>
          </div>
        )}
      </LanguageTabPanel>
    </div>
  );
};
