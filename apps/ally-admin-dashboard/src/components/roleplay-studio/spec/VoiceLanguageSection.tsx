import React, { useMemo } from "react";

import { useDispatch } from "react-redux";

import { FilterableMultiSelect, Tag } from "@ally-ui-mono/ui-shared";
import { useGetScenarioLanguagesQuery, useGetScenarioVoicesQuery } from "@api";
import { en } from "@constants";
import { setConfiguredLanguages } from "@reducer";
import { RoleplayLanguageConfig, RoleplayVoiceConfig } from "@src/types/roleplayStudio";
import { getSimulationVoiceOptions } from "@utils";

import { SpecSectionCard } from "./SpecSectionCard";

interface VoiceLanguageSectionProps {
  voice: RoleplayVoiceConfig;
  language: RoleplayLanguageConfig;
  readOnly?: boolean;
}

interface LanguageItem {
  id: string;
  label: string;
  languageCode?: string;
}

/**
 * Language + voice configuration.
 *
 * The trainer picks WHICH languages the actor can be played in (a multi-select
 * that stays editable even though the rest of the spec is copilot-driven /
 * read-only). The copilot then assigns one voice per configured language; those
 * voices are shown here read-only. The set of configured languages is stored as
 * the keys of `voice.languageVoices`; the trainer picks one of them at preview.
 */
export const VoiceLanguageSection: React.FC<VoiceLanguageSectionProps> = ({ voice }) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const { data: languages = [] } = useGetScenarioLanguagesQuery({ active: true });
  const { data: voices = [] } = useGetScenarioVoicesQuery({});

  const languageItems = useMemo<LanguageItem[]>(
    () =>
      languages.map(option => ({
        id: String(option.language_id ?? option.value),
        label: option.label,
        languageCode: option.translationCode ?? option.value,
      })),
    [languages],
  );

  const configuredIds = useMemo(
    () => Object.keys(voice.languageVoices ?? {}),
    [voice.languageVoices],
  );

  const selectedItems = useMemo(
    () => languageItems.filter(item => configuredIds.includes(item.id)),
    [languageItems, configuredIds],
  );

  // voiceId -> display name, and languageId -> label, for the read-only display.
  const voiceNameById = useMemo(() => {
    const map: Record<string, string> = {};
    getSimulationVoiceOptions(voices).forEach(option => {
      map[option.value] = option.label;
    });
    return map;
  }, [voices]);

  const languageLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    languageItems.forEach(item => {
      map[item.id] = item.label;
    });
    return map;
  }, [languageItems]);

  const handleChange = (items: LanguageItem[]) =>
    dispatch(
      setConfiguredLanguages(
        items.map(item => ({ languageId: item.id, languageCode: item.languageCode })),
      ),
    );

  return (
    <SpecSectionCard title={strings.voiceAndLanguage} sections={["voice", "language"]}>
      <div className="flex flex-col gap-4">
        <FilterableMultiSelect
          id="roleplay-languages"
          titleText={strings.languages}
          placeholder={strings.languagesPlaceholder}
          items={languageItems}
          itemToString={(item: LanguageItem | null) => item?.label ?? ""}
          selectedItems={selectedItems}
          onChange={({ selectedItems: next }) => handleChange((next ?? []) as LanguageItem[])}
        />

        <div className="flex flex-col gap-2">
          <p className="cds--label" style={{ marginBottom: 0 }}>
            {strings.voicesPerLanguage}
          </p>
          {configuredIds.length === 0 ? (
            <p className="text-typography-500">{strings.emptySection}</p>
          ) : (
            configuredIds.map(id => {
              const voiceId = voice.languageVoices[id];
              return (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="text-typography-800">{languageLabelById[id] ?? id}</span>
                  {voiceId ? (
                    <Tag type="teal" size="sm">
                      {voiceNameById[voiceId] ?? voiceId}
                    </Tag>
                  ) : (
                    <span className="text-xs italic text-typography-500">
                      {strings.voicePending}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </SpecSectionCard>
  );
};
