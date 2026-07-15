import React, { useEffect, useMemo } from "react";

import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { DropdownField as SharedDropdownField } from "@ally-ui-mono/ui-shared";
import { useGetScenarioLanguagesQuery } from "@api";
import { FormLabel, VoiceDropdown } from "@components";
import { en } from "@constants";
import { setLanguage, setLanguageVoice } from "@reducer";
import { RoleplayLanguageConfig, RoleplayVoiceConfig } from "@src/types/roleplayStudio";

import { SpecSectionCard } from "./SpecSectionCard";

interface VoiceLanguageSectionProps {
  voice: RoleplayVoiceConfig;
  language: RoleplayLanguageConfig;
  readOnly?: boolean;
}

/**
 * Language + voice picker. Reuses the shared VoiceDropdown (react-hook-form
 * bound, backed by useGetScenarioVoicesQuery); a tiny local form bridges it to
 * the roleplaySpec slice, writing `voice.languageVoices[languageId]`.
 */
export const VoiceLanguageSection: React.FC<VoiceLanguageSectionProps> = ({
  voice,
  language,
  readOnly = false,
}) => {
  const strings = en.roleplayStudio.spec;
  const dispatch = useDispatch();
  const { data: languages } = useGetScenarioLanguagesQuery({ active: true });

  const languageList = useMemo(() => languages ?? [], [languages]);
  const selectedLanguageId = language.languageId !== undefined ? String(language.languageId) : "";
  const selectedLanguage = languageList.find(
    option => String(option.language_id ?? option.value) === selectedLanguageId,
  );
  const currentVoiceId = voice.languageVoices[selectedLanguageId] ?? "";

  // Default the language to the first available one so the voice mapping has
  // a key to write under (mirrors how simulations always have a language).
  useEffect(() => {
    if (readOnly || selectedLanguageId || languageList.length === 0) return;
    const first = languageList[0];
    dispatch(
      setLanguage({
        languageId: first.language_id ?? first.value,
        languageCode: first.translationCode ?? first.value,
      }),
    );
  }, [dispatch, languageList, readOnly, selectedLanguageId]);

  const formMethods = useForm<{ voiceId: string }>({
    defaultValues: { voiceId: currentVoiceId },
  });

  // External changes (e.g. streamed copilot patches) -> local form.
  useEffect(() => {
    if (formMethods.getValues("voiceId") !== currentVoiceId) {
      formMethods.setValue("voiceId", currentVoiceId);
    }
  }, [currentVoiceId, formMethods]);

  // Local form -> slice.
  useEffect(() => {
    const subscription = formMethods.watch((values, { name }) => {
      const voiceId = values.voiceId ?? "";
      if (name !== "voiceId" && voiceId === "") return;
      if (!selectedLanguageId || readOnly) return;
      if (voiceId && voiceId !== currentVoiceId) {
        dispatch(setLanguageVoice({ languageId: selectedLanguageId, voiceId }));
      }
    });
    return () => subscription.unsubscribe();
  }, [currentVoiceId, dispatch, formMethods, readOnly, selectedLanguageId]);

  const handleLanguageChange = (label: string) => {
    if (readOnly) return;
    const option = languageList.find(item => item.label === label);
    if (!option) return;
    dispatch(
      setLanguage({
        languageId: option.language_id ?? option.value,
        languageCode: option.translationCode ?? option.value,
      }),
    );
  };

  return (
    <SpecSectionCard title={strings.voiceAndLanguage} sections={["voice", "language"]}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FormLabel>{en.simulation.languages}</FormLabel>
          <div className="w-64">
            <SharedDropdownField
              options={languageList.map(option => option.label)}
              value={selectedLanguage?.label ?? ""}
              onChange={handleLanguageChange}
              label=""
              disabled={readOnly}
              valueClassName="font-primary text-base text-typography-700"
            />
          </div>
        </div>
        <VoiceDropdown formMethods={formMethods} />
      </div>
    </SpecSectionCard>
  );
};
