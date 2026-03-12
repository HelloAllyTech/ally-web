import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { useGetCharactersQuery } from "@api";
import { ArrowSolid } from "@assets";
import { CustomDropdownField, InputField } from "@components";
import {
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  en,
  CUSTOM_CHARACTER_ID,
} from "@constants";
import { useClickOutside } from "@hooks";
import { CharacterData } from "@types";

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
};

const formFieldNames = {
  NAME: "Name",
  AGE: "Age",
  GENDER: "Gender",
  PROFESSION: "Profession",
  CURRENT_LOCATION: "Current location",
  GENDER_IDENTITY: "Gender identity",
  SEXUAL_ORIENTATION: "Sexual orientation",
};

export const CharacterProfileSelector: React.FC<CharacterProfileSelectorProps> = ({
  label,
  id,
  formMethods,
  isMandatory = false,
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
          // Ensure we never set null or undefined - always use empty string as fallback
          setValue(fieldId, value ?? "", { shouldValidate: true, shouldDirty: true, shouldTouch: true });
        });
      }

      // Close dropdown and reset search after selection
      setIsCharacterDropdownOpen(false);
      setSearchQuery("");
    },
    [id, setValue],
  );

  // Get selected character
  const selectedCharacter = charactersData?.characters?.find(
    char => char.id === selectedCharacterId,
  );

  const watchedValues = watch(Object.values(formFieldIds));
  const watchedValuesString = JSON.stringify(watchedValues);
  const currentName = watch(formFieldIds.NAME);
  const previousNameRef = useRef(currentName);

  // Watch fields and switch to custom if modified manually
  useEffect(() => {
    if (selectedCharacterId && selectedCharacterId !== CUSTOM_CHARACTER_ID && selectedCharacter) {
      const currentValues = getValues();
      const hasChanged = Object.values(formFieldIds).some(fieldId => {
        const formValue = currentValues[fieldId];
        const characterValue = selectedCharacter[fieldId as keyof CharacterData] ?? "";
        return String(formValue) !== String(characterValue);
      });

      if (hasChanged) {
        setSelectedCharacterId(CUSTOM_CHARACTER_ID);
        setValue(id, CUSTOM_CHARACTER_ID);
      }
    }
  }, [watchedValuesString, selectedCharacterId, selectedCharacter, getValues, id, setValue]);

  // Auto-select character if name perfectly matches, or if all fields perfectly match
  useEffect(() => {
    if (selectedCharacterId === CUSTOM_CHARACTER_ID || !selectedCharacterId) {
      if (charactersData?.characters) {
        const currentValues = getValues();
        
        // Strategy 1: All fields match an existing character perfectly -> revert to that character
        const perfectMatch = charactersData.characters.find(char => {
          return Object.values(formFieldIds).every(fieldId => {
            const formValue = currentValues[fieldId];
            const characterValue = char[fieldId as keyof CharacterData] ?? "";
            return String(formValue) === String(characterValue);
          });
        });

        if (perfectMatch && perfectMatch.id) {
          handleCharacterSelect(perfectMatch.id, perfectMatch);
          previousNameRef.current = currentName; // Sync ref
          return;
        }

        // Strategy 2: If the name just changed and it matches an existing character's name
        if (currentName !== previousNameRef.current) {
          previousNameRef.current = currentName;
          
          if (currentName) {
            const nameMatch = charactersData.characters.find(
              char => char.name?.trim().toLowerCase() === currentName.trim().toLowerCase()
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
  }, [watchedValuesString, currentName, charactersData?.characters, selectedCharacterId, getValues, handleCharacterSelect]);

  const getDisplayLabel = () => {
    if (selectedCharacterId === CUSTOM_CHARACTER_ID) return "Custom";
    if (selectedCharacter) {
      return `${selectedCharacter.name} (${selectedCharacter.gender}, ${selectedCharacter.age}, ${selectedCharacter.profession})`;
    }
    return "Select";
  };

  return (
    <div className="w-full">
      <label className="text-typography-900 font-weight-400 text-base mb-2 flex items-center gap-1">
        {label} {isMandatory && <span className="text-destructive-500">*</span>}
      </label>

      <div className="space-y-6 border border-border-light rounded-md p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-typography-900 font-weight-400 text-base mb-2 block">
              Select character
            </label>
            <div className="relative" ref={characterDropdownRef}>
              <div
                className="w-full rounded border border-border-light px-3 py-1 bg-white text-base cursor-pointer flex items-center justify-between hover:border-border-dark transition-colors"
                onClick={() => setIsCharacterDropdownOpen(prev => !prev)}
              >
                <span className={selectedCharacterId ? "text-typography-900" : "text-typography-500"}>
                  {getDisplayLabel()}
                </span>
                <span
                  className={`text-typography-600 transition-transform ${isCharacterDropdownOpen ? "rotate-180" : ""}`}
                >
                  <ArrowSolid />
                </span>
              </div>

              {isCharacterDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 w-full bg-white border border-border-light rounded-md shadow-lg max-h-[400px] z-10 flex flex-col">
                  {/* Search input - sticky at top */}
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

                  {/* Character list - scrollable */}
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
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputField
                label={formFieldNames.NAME}
                id={formFieldIds.NAME}
                formMethods={formMethods}
                placeholder="Enter name"
                isMandatory
              />
            </div>
            <div>
              <label className="text-typography-900 font-weight-400 text-base mb-2 flex items-center gap-1">
                {formFieldNames.AGE} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.AGE}
                control={formMethods.control}
                defaultValue=""
                rules={{
                  required: "Age is required",
                  validate: value => {
                    if (value === "" || value == null) return "Age is required";
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
                  />
                )}
              />
              {errors[formFieldIds.AGE]?.message && (
                <p className="text-destructive-500 text-sm mt-1">
                  {errors[formFieldIds.AGE].message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-typography-900 font-weight-400 text-base mb-2 flex items-center gap-1">
                {formFieldNames.GENDER} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.GENDER}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <CustomDropdownField
                    options={GENDER_OPTIONS}
                    placeholder="Select gender"
                    customStyle={{
                      height: "34px",
                    }}
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
            <div>
              <label className="text-typography-900 text-base font-weight-400 mb-2 block">
                {formFieldNames.PROFESSION}
              </label>
              <Controller
                name={formFieldIds.PROFESSION}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    type="text"
                    placeholder="Enter profession"
                    value={field.value === null || field.value === undefined ? "" : field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                    className="w-full rounded border border-border-light px-3 py-1 text-base focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-typography-400"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <InputField
                label={formFieldNames.CURRENT_LOCATION}
                id={formFieldIds.CURRENT_LOCATION}
                formMethods={formMethods}
                placeholder="Enter location"
                isMandatory
              />
            </div>
            <div>
              <label className="text-typography-900 text-base font-weight-400 mb-2 flex items-center gap-1">
                {formFieldNames.GENDER_IDENTITY} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.GENDER_IDENTITY}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <CustomDropdownField
                    options={GENDER_IDENTITY_OPTIONS}
                    placeholder="Select gender identity"
                    customStyle={{
                      height: "34px",
                    }}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-typography-900 text-base font-weight-400 mb-2 flex items-center gap-1">
                {formFieldNames.SEXUAL_ORIENTATION} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.SEXUAL_ORIENTATION}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <CustomDropdownField
                    options={SEXUAL_ORIENTATION_OPTIONS}
                    placeholder="Select sexual orientation"
                    customStyle={{
                      height: "34px",
                    }}
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
          </div>
        </div>
      </div>
    </div>
  );
};
