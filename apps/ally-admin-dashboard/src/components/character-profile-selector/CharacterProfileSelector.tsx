import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { useGetCharactersQuery } from "@api";
import { ArrowSolid } from "@assets";
import {
  GENDER_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
  en,
} from "@constants";
import { useClickOutside } from "@hooks";

interface CharacterProfileSelectorProps {
  label: string;
  id: string;
  formMethods: any;
  isMandatory?: boolean;
}

interface Character {
  id: string;
  name: string;
  age: number;
  gender: string;
  profession: string;
  currentLocation: string;
  genderIdentity: string;
  sexualOrientation: string;
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

  const { setValue } = formMethods;

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
    searchName: debouncedSearchQuery,
  });

  // Close character dropdown on outside click
  useClickOutside(characterDropdownRef, () => {
    setIsCharacterDropdownOpen(false);
    setSearchQuery("");
  });

  // Handle character selection
  const handleCharacterSelect = useCallback(
    (character: Character) => {
      setSelectedCharacterId(character.id);

      // Prefill form fields using existing field IDs
      Object.values(formFieldIds).forEach(fieldId => {
        setValue(fieldId, character[fieldId as keyof Character] || "");
      });

      // Store the character ID in the main field
      setValue(id, character.id);

      // Close dropdown and reset search after selection
      setIsCharacterDropdownOpen(false);
      setSearchQuery("");
    },
    [id, setValue],
  );

  // Get selected character
  const selectedCharacter = charactersData?.find(char => char.id === selectedCharacterId);

  // Get gender label
  const getGenderLabel = (value: string) => {
    const option = GENDER_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Get gender identity label
  const getGenderIdentityLabel = (value: string) => {
    const option = GENDER_IDENTITY_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  // Get sexual orientation label
  const getSexualOrientationLabel = (value: string) => {
    const option = SEXUAL_ORIENTATION_OPTIONS.find(opt => opt.value === value);
    return option?.label || value;
  };

  return (
    <div className="w-full">
      <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
        {label} {isMandatory && <span className="text-destructive-500">*</span>}
      </label>

      <div className="space-y-6 border border-border-light rounded-md p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-typography-900 text-base font-medium mb-2 block">
              Select character
            </label>
            <div className="relative" ref={characterDropdownRef}>
              <div
                className="w-full rounded border border-border-light px-3 py-2 bg-white text-base cursor-pointer flex items-center justify-between hover:border-border-dark transition-colors"
                onClick={() => setIsCharacterDropdownOpen(prev => !prev)}
              >
                <span className={selectedCharacter ? "text-typography-900" : "text-typography-500"}>
                  {selectedCharacter
                    ? `${selectedCharacter?.name} (${selectedCharacter?.gender}, ${selectedCharacter?.age}, ${selectedCharacter?.profession})`
                    : "Select"}
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
                    ) : charactersData && charactersData.length > 0 ? (
                      charactersData.map(character => (
                        <div
                          key={character.id}
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                            selectedCharacterId === character.id
                              ? "bg-primary-50 text-primary font-medium"
                              : "text-typography-900 hover:bg-background-secondary"
                          }`}
                          onClick={() => handleCharacterSelect(character)}
                        >
                          {`${character?.name} (${character?.gender}, ${character?.age}, ${character?.profession})`}
                        </div>
                      ))
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
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.NAME} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.NAME}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Anjali"
                    className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                    readOnly
                  />
                )}
              />
            </div>
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.AGE} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.AGE}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    placeholder="27"
                    className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                    readOnly
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.GENDER} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.GENDER}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type="text"
                      value={field.value ? getGenderLabel(field.value) : ""}
                      placeholder="Female"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary bg-background-secondary cursor-not-allowed"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-typography-600 pointer-events-none">
                      <ArrowSolid />
                    </span>
                  </div>
                )}
              />
            </div>
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 block">
                {formFieldNames.PROFESSION}
              </label>
              <Controller
                name={formFieldIds.PROFESSION}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="e.g. Software Engineer"
                    className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-typography-400"
                    readOnly
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.CURRENT_LOCATION} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.CURRENT_LOCATION}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Kolkata, India"
                    className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                    readOnly
                  />
                )}
              />
            </div>
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.GENDER_IDENTITY} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.GENDER_IDENTITY}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type="text"
                      value={field.value ? getGenderIdentityLabel(field.value) : ""}
                      placeholder="Select"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary bg-background-secondary cursor-not-allowed"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-typography-600 pointer-events-none">
                      <ArrowSolid />
                    </span>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
                {formFieldNames.SEXUAL_ORIENTATION} <span className="text-destructive-500">*</span>
              </label>
              <Controller
                name={formFieldIds.SEXUAL_ORIENTATION}
                control={formMethods.control}
                defaultValue=""
                render={({ field }) => (
                  <div className="relative">
                    <input
                      {...field}
                      type="text"
                      value={field.value ? getSexualOrientationLabel(field.value) : ""}
                      placeholder="Select"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary bg-background-secondary cursor-not-allowed"
                      readOnly
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-typography-600 pointer-events-none">
                      <ArrowSolid />
                    </span>
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
