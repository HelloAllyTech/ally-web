import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { TextInput } from "@ally-ui-mono/ui-shared";
import { useGetCharactersQuery } from "@api";
import { ArrowSolid } from "@assets";
import { CustomDropdownField, InputField } from "@components";
import {
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  PROMPT_VARIABLE_MANDATORY_MAP,
  en,
  CUSTOM_CHARACTER_ID,
  DEFAULT_LANGUAGE,
  FORM_FIELD_IDS,
} from "@constants";
import { useClickOutside, useIsPlaceholderUsed } from "@hooks";
import { CharacterData } from "@types";
import { camelToSnakeCase } from "@utils/common";

interface CharacterProfileSelectorProps {
  label: string;
  id: string;
  formMethods: any;
  isMandatory?: boolean;
}

const PAGE_SIZE = 100;

const formFieldIds = {
  NAME: "name",
  AGE: "age",
  GENDER: "gender",
  PROFESSION: "profession",
  CURRENT_LOCATION: "currentLocation",
  GENDER_IDENTITY: "genderIdentity",
  SEXUAL_ORIENTATION: "sexualOrientation",
  COVER_IMAGE_URL: "coverImageUrl",
  COVER_VIDEO_URL: "coverVideoUrl",
  CHARACTER_PROFILE_TEXT: "characterProfileText",
};

const formFieldNames = {
  NAME: "Name",
  AGE: "Age",
  GENDER: "Gender",
  PROFESSION: "Profession",
  CURRENT_LOCATION: "Current location",
  GENDER_IDENTITY: "Gender identity",
  SEXUAL_ORIENTATION: "Sexual orientation",
  COVER_IMAGE_URL: "Cover Image",
  COVER_VIDEO_URL: "Cover Video",
  CHARACTER_PROFILE_TEXT: "Character Backstory",
};

export const CharacterProfileSelector: React.FC<CharacterProfileSelectorProps> = ({
  id,
  formMethods,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCharacterDropdownOpen, setIsCharacterDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const characterDropdownRef = useRef<HTMLDivElement>(null);

  const {
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = formMethods;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch characters with search
  const { data: charactersData, isLoading } = useGetCharactersQuery({
    limit: PAGE_SIZE,
    offset: 0,
    search: debouncedSearchQuery,
  });

  // Close character dropdown on outside click
  useClickOutside(characterDropdownRef, () => {
    setIsCharacterDropdownOpen(false);
    setSearchQuery("");
  });

  // Persona sub-fields are body-driven, exactly like the rest of the studio
  // form (see FormField + useIsPlaceholderUsed): each hides when the selected
  // main-agent variant doesn't reference its placeholder — e.g. removing
  // `{sexual_orientation}` from the prompt drops the field — unless the field
  // is marked mandatory in SIMULATION_CREATOR_FIELD_GROUPS. We never hide while
  // the variant is loading / unselected / missing, mirroring FormField's
  // "only hide once kind === 'loaded'" rule.
  const selectedMainPromptCode = watch("selectedMainPromptCode") as string | undefined;
  const nameLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.NAME),
  );
  const ageLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.AGE),
  );
  const genderLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.GENDER),
  );
  const professionLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.PROFESSION),
  );
  const locationLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.CURRENT_LOCATION),
  );
  const genderIdentityLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.GENDER_IDENTITY),
  );
  const sexualOrientationLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.SEXUAL_ORIENTATION),
  );
  const characterProfileTextLookup = useIsPlaceholderUsed(
    selectedMainPromptCode,
    camelToSnakeCase(formFieldIds.CHARACTER_PROFILE_TEXT),
  );

  const isPersonaFieldVisible = (
    fieldId: string,
    lookup: ReturnType<typeof useIsPlaceholderUsed>,
  ): boolean => {
    // Mandatory fields (declared in SIMULATION_CREATOR_FIELD_GROUPS) always show.
    if (PROMPT_VARIABLE_MANDATORY_MAP.get(camelToSnakeCase(fieldId))) return true;
    // Otherwise hide only once the variant is loaded and doesn't reference it.
    return !(lookup.kind === "loaded" && !lookup.isUsed);
  };

  // The character preselect dropdown only prefills the persona fields below
  // (and the separately-rendered Character Backstory). When the active
  // main-agent variant references none of them, every field is hidden and the
  // preselect dropdown has nothing to populate, so it should not appear.
  const anyPersonaFieldVisible =
    isPersonaFieldVisible(formFieldIds.NAME, nameLookup) ||
    isPersonaFieldVisible(formFieldIds.AGE, ageLookup) ||
    isPersonaFieldVisible(formFieldIds.GENDER, genderLookup) ||
    isPersonaFieldVisible(formFieldIds.PROFESSION, professionLookup) ||
    isPersonaFieldVisible(formFieldIds.CURRENT_LOCATION, locationLookup) ||
    isPersonaFieldVisible(formFieldIds.GENDER_IDENTITY, genderIdentityLookup) ||
    isPersonaFieldVisible(formFieldIds.SEXUAL_ORIENTATION, sexualOrientationLookup) ||
    isPersonaFieldVisible(formFieldIds.CHARACTER_PROFILE_TEXT, characterProfileTextLookup);

  // Media fields are intentionally excluded from character comparison:
  // they can differ between the simulation and character (simulation-level overrides)
  const mediaFieldIds = [formFieldIds.COVER_IMAGE_URL, formFieldIds.COVER_VIDEO_URL];
  const comparableFieldIds = Object.values(formFieldIds).filter(
    fieldId => !mediaFieldIds.includes(fieldId),
  );

  // Voice, language characteristics, linguistic style samples and knowledge
  // sources live on the character in a flat/default-language shape, but the
  // simulation form keys the first three by language (see LanguageVoiceMapping)
  // and stores knowledge sources as {id, title, content} rows rather than the
  // character's {id, title, text}. They're merged into the default-language
  // slot only, the same way Agent Builder Copilot applies these same fields
  // (see agentBuilderApply.ts's "linguistic_style_samples" case) — trainers
  // add other languages by hand. They're deliberately not added to
  // `formFieldIds`: that map also drives the manual-edit / perfect-match
  // comparison below, which only does scalar string equality and can't
  // meaningfully compare these language-keyed objects and arrays.
  const applyComplexCharacterFields = useCallback(
    (characterData: CharacterData) => {
      const lang = DEFAULT_LANGUAGE.value;

      if (characterData.voiceId) {
        const current = (getValues(FORM_FIELD_IDS.LANGUAGES_VOICES) ?? {}) as Record<
          string,
          string
        >;
        setValue(
          FORM_FIELD_IDS.LANGUAGES_VOICES,
          { ...current, [lang]: characterData.voiceId },
          { shouldDirty: true, shouldTouch: true },
        );
      }

      if (characterData.languageCharacteristics) {
        const current = (getValues("languageCharacteristics") ?? {}) as Record<string, string>;
        setValue(
          "languageCharacteristics",
          { ...current, [lang]: characterData.languageCharacteristics },
          { shouldDirty: true, shouldTouch: true },
        );
      }

      if (characterData.linguisticStyleSamples?.length) {
        const current = (getValues(FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES) ?? {}) as Record<
          string,
          string[]
        >;
        setValue(
          FORM_FIELD_IDS.LINGUISTIC_STYLE_SAMPLES,
          { ...current, [lang]: characterData.linguisticStyleSamples },
          { shouldDirty: true, shouldTouch: true },
        );
      }

      if (characterData.knowledgeSources?.length) {
        const rows = characterData.knowledgeSources.map(source => ({
          id: source.id,
          title: source.title,
          content: source.text ?? "",
        }));
        setValue(FORM_FIELD_IDS.KNOWLEDGE_SOURCE, rows, { shouldDirty: true, shouldTouch: true });
      }
    },
    [getValues, setValue],
  );

  // Handle character selection
  const handleCharacterSelect = useCallback(
    (characterId: string, characterData?: CharacterData) => {
      setSelectedCharacterId(characterId);

      // Store the character ID in the main field
      setValue(id, characterId);

      if (characterId === CUSTOM_CHARACTER_ID) {
        Object.values(formFieldIds).forEach(fieldId => {
          setValue(fieldId, "", { shouldDirty: true, shouldTouch: true });
        });
      } else if (characterData) {
        // Prefill form fields using existing field IDs
        Object.values(formFieldIds).forEach(fieldId => {
          const value = characterData[fieldId as keyof CharacterData];

          // For media fields, only update if the character has a non-empty value.
          // Otherwise keep the simulation's existing media as a fallback.
          if (mediaFieldIds.includes(fieldId) && !value) {
            return;
          }

          // Ensure we never set null or undefined - always use empty string as fallback
          setValue(fieldId, value ?? "", {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        });

        applyComplexCharacterFields(characterData);
      }

      // Close dropdown and reset search after selection
      setIsCharacterDropdownOpen(false);
      setSearchQuery("");
    },
    [id, setValue, applyComplexCharacterFields],
  );

  // Get selected character
  const selectedCharacter = charactersData?.characters?.find(
    char => char.id === selectedCharacterId,
  );

  const watchedValues = watch(Object.values(formFieldIds));
  const watchedValuesString = JSON.stringify(watchedValues);
  const currentName = watch(formFieldIds.NAME);
  const previousNameRef = useRef(currentName);

  // Watch fields and switch to custom if modified manually.
  // Media fields are excluded because they may intentionally differ (simulation-level overrides).
  useEffect(() => {
    if (selectedCharacterId && selectedCharacterId !== CUSTOM_CHARACTER_ID && selectedCharacter) {
      const currentValues = getValues();
      const hasChanged = comparableFieldIds.some(fieldId => {
        const formValue = currentValues[fieldId] ?? "";
        const characterValue = selectedCharacter[fieldId as keyof CharacterData] ?? "";
        return String(formValue) !== String(characterValue);
      });

      if (hasChanged) {
        setSelectedCharacterId(CUSTOM_CHARACTER_ID);
        setValue(id, CUSTOM_CHARACTER_ID);
      }
    }
  }, [watchedValuesString, selectedCharacterId, selectedCharacter, getValues, id, setValue]);

  // Auto-select character if name perfectly matches, or if all comparable fields perfectly match.
  // Media fields are excluded from comparison since they may differ at the simulation level.
  useEffect(() => {
    if (selectedCharacterId === CUSTOM_CHARACTER_ID || !selectedCharacterId) {
      if (charactersData?.characters) {
        const currentValues = getValues();

        // Strategy 1: All comparable (non-media) fields match an existing character -> revert to that character
        const perfectMatch = charactersData.characters.find(char => {
          return comparableFieldIds.every(fieldId => {
            const formValue = currentValues[fieldId] ?? "";
            const characterValue = char[fieldId as keyof CharacterData] ?? "";
            return String(formValue) === String(characterValue);
          });
        });

        if (perfectMatch && perfectMatch.id) {
          handleCharacterSelect(perfectMatch.id, perfectMatch);
          previousNameRef.current = currentName; // Sync ref
          return;
        }

        // If there's no selected character (initial load or before user selection)
        if (!selectedCharacterId) {
          const hasAnyValue = comparableFieldIds.some(fieldId => {
            const val = currentValues[fieldId];
            return val !== "" && val !== null && val !== undefined;
          });

          if (hasAnyValue) {
            // We have form data but it didn't perfectly match any character.
            // This means an existing simulation with customized character data was loaded,
            // or the user started typing manually. Set dropdown to Custom without erasing fields.
            setSelectedCharacterId(CUSTOM_CHARACTER_ID);
            setValue(id, CUSTOM_CHARACTER_ID);
          }
          previousNameRef.current = currentName;
          return; // Skip Strategy 2 on initial programmatic load to avoid overwriting simulation data
        }

        // Strategy 2: If the name just changed and it matches an existing character's name
        if (currentName !== previousNameRef.current) {
          previousNameRef.current = currentName;

          if (currentName) {
            const nameMatch = charactersData.characters.find(
              char => char.name?.trim().toLowerCase() === currentName.trim().toLowerCase(),
            );

            if (nameMatch && nameMatch.id) {
              handleCharacterSelect(nameMatch.id, nameMatch);
            }
          }
        }
      }
    } else {
      previousNameRef.current = currentName;
    }
  }, [
    watchedValuesString,
    currentName,
    charactersData?.characters,
    selectedCharacterId,
    getValues,
    handleCharacterSelect,
  ]);

  const getDisplayLabel = () => {
    if (selectedCharacterId === CUSTOM_CHARACTER_ID) return "Custom";
    if (selectedCharacter) {
      return `${selectedCharacter.name} (${selectedCharacter.gender}, ${selectedCharacter.age}, ${selectedCharacter.profession})`;
    }
    return "Select";
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header row: label + inline character selector.
          Hidden entirely when the active main-agent variant references none of
          the persona fields below — there is nothing to label or prefill. */}
      {anyPersonaFieldVisible && (
        <div className="flex items-center justify-between">
          <span className="text-typography-900 text-base">Character Profile</span>
          <div className="relative" ref={characterDropdownRef}>
            <div
              className="flex items-center gap-2 text-sm text-typography-600 cursor-pointer hover:text-typography-900 transition-colors"
              onClick={() => setIsCharacterDropdownOpen(prev => !prev)}
            >
              <span>{getDisplayLabel()}</span>
              <span
                className={`transition-transform ${isCharacterDropdownOpen ? "rotate-180" : ""}`}
              >
                <ArrowSolid />
              </span>
            </div>
            {isCharacterDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[280px] bg-white border border-border-light rounded-md shadow-lg max-h-[400px] z-10 flex flex-col">
                <div className="px-3 py-2 border-b border-border-light bg-white sticky top-0">
                  <input
                    type="text"
                    placeholder="Search characters..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded border border-border-light px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="overflow-y-auto custom-scrollbar">
                  {isLoading ? (
                    <div className="px-3 py-4 text-sm text-typography-600 text-center">
                      Loading...
                    </div>
                  ) : charactersData && charactersData?.characters?.length > 0 ? (
                    <>
                      <div
                        key={CUSTOM_CHARACTER_ID}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                          selectedCharacterId === CUSTOM_CHARACTER_ID
                            ? "bg-primary-50 text-primary font-weight-400"
                            : "text-typography-900 hover:bg-background-secondary"
                        }`}
                        onClick={() => handleCharacterSelect(CUSTOM_CHARACTER_ID)}
                      >
                        Custom
                      </div>
                      {charactersData.characters.map(character => (
                        <div
                          key={character.id}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                            selectedCharacterId === character.id
                              ? "bg-primary-50 text-primary font-weight-400"
                              : "text-typography-900 hover:bg-background-secondary"
                          }`}
                          onClick={() => handleCharacterSelect(character.id, character)}
                        >
                          {`${character?.name} (${character?.gender}, ${character?.age}, ${character?.profession})`}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-4 text-sm text-typography-600 text-center">
                      {debouncedSearchQuery
                        ? en.common.noCharactersFoundMatchingYourSearch
                        : en.common.noResultsFound}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* All fields in one unified 2-column grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6">
        {/* Name */}
        {isPersonaFieldVisible(formFieldIds.NAME, nameLookup) && (
          <div>
            <InputField
              label={formFieldNames.NAME}
              id={formFieldIds.NAME}
              formMethods={formMethods}
              placeholder="Enter name"
            />
          </div>
        )}

        {/* Age */}
        {isPersonaFieldVisible(formFieldIds.AGE, ageLookup) && (
          <div>
            <label className="text-typography-900 text-base mb-2 flex items-center gap-1">
              {formFieldNames.AGE}
            </label>
            <Controller
              name={formFieldIds.AGE}
              control={formMethods.control}
              defaultValue=""
              rules={{
                // Age is optional; only validate the format when a value is entered.
                validate: value => {
                  if (value === "" || value == null) return true;
                  const num = typeof value === "number" ? value : parseInt(String(value), 10);
                  if (isNaN(num) || num < 0) return "Please enter a valid age";
                  return true;
                },
              }}
              render={({ field }) => (
                <input
                  type="number"
                  placeholder="--"
                  value={field.value === null || field.value === undefined ? "" : field.value}
                  onChange={e => {
                    const val = e.target.value;
                    field.onChange(val === "" ? "" : parseInt(val, 10) || "");
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className="w-full rounded border border-border-light px-3 py-1 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                  // Scrolling over a focused number input silently changes its
                  // value in the browser — blur so the page scrolls instead.
                  onWheel={e => e.currentTarget.blur()}
                />
              )}
            />
            {errors[formFieldIds.AGE]?.message && (
              <p className="text-destructive-500 text-sm mt-1">
                {errors[formFieldIds.AGE].message}
              </p>
            )}
          </div>
        )}

        {/* Gender */}
        {isPersonaFieldVisible(formFieldIds.GENDER, genderLookup) && (
          <div>
            <label className="text-typography-900 text-base mb-2 flex items-center gap-1">
              {formFieldNames.GENDER}
            </label>
            <Controller
              name={formFieldIds.GENDER}
              control={formMethods.control}
              defaultValue=""
              render={({ field }) => (
                <CustomDropdownField
                  options={GENDER_OPTIONS}
                  placeholder="Select gender"
                  customStyle={{ height: "34px" }}
                  defaultOption={
                    field.value
                      ? GENDER_OPTIONS.find(opt => opt.value === field.value) || null
                      : null
                  }
                  onHandleSelect={option => field.onChange(option.value)}
                />
              )}
            />
          </div>
        )}

        {/* Profession */}
        {isPersonaFieldVisible(formFieldIds.PROFESSION, professionLookup) && (
          <div>
            <label className="text-typography-900 text-base mb-2 flex items-center gap-1">
              {formFieldNames.PROFESSION}
            </label>
            <Controller
              name={formFieldIds.PROFESSION}
              control={formMethods.control}
              defaultValue=""
              render={({ field }) => (
                <TextInput
                  id={formFieldIds.PROFESSION}
                  labelText={formFieldNames.PROFESSION}
                  hideLabel
                  placeholder="Enter profession"
                  value={field.value === null || field.value === undefined ? "" : field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className="w-full"
                />
              )}
            />
            {errors[formFieldIds.PROFESSION]?.message && (
              <p className="text-destructive-500 text-sm mt-1">
                {String(errors[formFieldIds.PROFESSION].message)}
              </p>
            )}
          </div>
        )}

        {/* Current location */}
        {isPersonaFieldVisible(formFieldIds.CURRENT_LOCATION, locationLookup) && (
          <div>
            <InputField
              label={formFieldNames.CURRENT_LOCATION}
              id={formFieldIds.CURRENT_LOCATION}
              formMethods={formMethods}
              placeholder="Enter location"
            />
          </div>
        )}

        {/* Gender identity */}
        {isPersonaFieldVisible(formFieldIds.GENDER_IDENTITY, genderIdentityLookup) && (
          <div>
            <label className="text-typography-900 text-base mb-2 flex items-center gap-1">
              {formFieldNames.GENDER_IDENTITY}
            </label>
            <Controller
              name={formFieldIds.GENDER_IDENTITY}
              control={formMethods.control}
              defaultValue=""
              render={({ field }) => (
                <CustomDropdownField
                  options={GENDER_IDENTITY_OPTIONS}
                  placeholder="Select gender identity"
                  customStyle={{ height: "34px" }}
                  defaultOption={
                    field.value
                      ? GENDER_IDENTITY_OPTIONS.find(opt => opt.value === field.value) || null
                      : null
                  }
                  onHandleSelect={option => field.onChange(option.value)}
                />
              )}
            />
          </div>
        )}

        {/* Sexual orientation */}
        {isPersonaFieldVisible(formFieldIds.SEXUAL_ORIENTATION, sexualOrientationLookup) && (
          <div>
            <label className="text-typography-900 text-base mb-2 flex items-center gap-1">
              {formFieldNames.SEXUAL_ORIENTATION}
            </label>
            <Controller
              name={formFieldIds.SEXUAL_ORIENTATION}
              control={formMethods.control}
              defaultValue=""
              render={({ field }) => (
                <CustomDropdownField
                  options={SEXUAL_ORIENTATION_OPTIONS}
                  placeholder="Select sexual orientation"
                  customStyle={{ height: "34px" }}
                  defaultOption={
                    field.value
                      ? SEXUAL_ORIENTATION_OPTIONS.find(opt => opt.value === field.value) || null
                      : null
                  }
                  onHandleSelect={option => field.onChange(option.value)}
                />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
};
