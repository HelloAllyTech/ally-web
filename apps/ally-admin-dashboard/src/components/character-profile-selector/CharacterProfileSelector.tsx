import { useCallback, useEffect, useRef, useState } from "react";

import { Controller } from "react-hook-form";

import { useGetCharactersQuery } from "@api";
import { ArrowSolid, Tick } from "@assets";
import { GENDER_OPTIONS, en } from "@constants";
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

const PAGE_SIZE = 30;

const GENDER_FILTER_VALUES = {
  ALL: "all",
  MALE: "male",
  FEMALE: "female",
  NON_BINARY: "non-binary",
};

const GENDER_FILTER_LABELS = {
  ALL: "All",
  MALE: "Male",
  FEMALE: "Female",
  NON_BINARY: "Non-binary",
};

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
  const [genderFilter, setGenderFilter] = useState<string>(GENDER_FILTER_VALUES.ALL);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const characterListRef = useRef<HTMLDivElement>(null);

  // Fetch characters
  const { data: charactersData, isLoading } = useGetCharactersQuery({
    limit: PAGE_SIZE,
    offset,
    searchName: "",
  });

  const { setValue } = formMethods;

  //TODO: Update characters list when data changes
  useEffect(() => {
    if (charactersData) {
      if (offset === 0) {
        setAllCharacters(charactersData);
      } else {
        setAllCharacters(prev => [...prev, ...charactersData]);
      }
      setHasMore(charactersData.length === PAGE_SIZE);
    }
  }, [charactersData, offset]);

  // Filter characters by gender
  const filteredCharacters = allCharacters.filter(char => {
    if (genderFilter === GENDER_FILTER_VALUES.ALL) return true;
    return char.gender === genderFilter;
  });

  // Close gender dropdown on outside click
  useClickOutside(genderDropdownRef, () => setIsGenderDropdownOpen(false));

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
    },
    [id, setValue],
  );

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!characterListRef.current || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = characterListRef.current;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      setOffset(prev => prev + PAGE_SIZE);
    }
  }, [isLoading, hasMore]);

  useEffect(() => {
    const listElement = characterListRef.current;
    if (listElement) {
      listElement.addEventListener("scroll", handleScroll);
      return () => listElement.removeEventListener("scroll", handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  // Get gender label
  const getGenderLabel = (value: string) => {
    if (value === GENDER_FILTER_VALUES.ALL) return GENDER_FILTER_LABELS.ALL;
    const option = GENDER_OPTIONS.find(opt => opt.value === value);
    return option?.label || GENDER_FILTER_LABELS.ALL;
  };

  return (
    <div className="w-full">
      <label className="text-typography-900 text-base font-medium mb-2 flex items-center gap-1">
        {label} {isMandatory && <span className="text-destructive-500">*</span>}
      </label>

      <div className="border border-border-light rounded-lg overflow-hidden">
        <div className="grid grid-cols-[380px_1fr] h-[615px]">
          {/* Left side - Character list */}
          <div className="border-r border-border-light bg-background-secondary flex flex-col h-full">
            {/* Filter by gender */}
            <div className="p-4 bg-white flex-shrink-0">
              <label className="text-typography-700 text-sm font-medium mb-2 block">
                {en.simulation.filterByGender}
              </label>
              <div className="relative" ref={genderDropdownRef}>
                <div
                  className="w-full rounded border border-border-light px-3 py-2 bg-white text-base cursor-pointer flex items-center justify-between hover:border-border-dark transition-colors"
                  onClick={() => setIsGenderDropdownOpen(prev => !prev)}
                >
                  <span className="text-typography-900">{getGenderLabel(genderFilter)}</span>
                  <span
                    className={`text-typography-600 transition-transform ${isGenderDropdownOpen ? "rotate-180" : ""}`}
                  >
                    <ArrowSolid />
                  </span>
                </div>

                {isGenderDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-border-light rounded-md shadow-lg max-h-[200px] overflow-auto z-10 custom-scrollbar">
                    <div
                      className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                        genderFilter === GENDER_FILTER_VALUES.ALL
                          ? "bg-primary-50 text-primary font-medium"
                          : "text-typography-900 hover:bg-background-secondary"
                      }`}
                      onClick={() => {
                        setGenderFilter(GENDER_FILTER_VALUES.ALL);
                        setIsGenderDropdownOpen(false);
                      }}
                    >
                      {GENDER_FILTER_LABELS.ALL}
                    </div>
                    {GENDER_OPTIONS.map(option => (
                      <div
                        key={option.value}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                          genderFilter === option.value
                            ? "bg-primary-50 text-primary font-medium"
                            : "text-typography-900 hover:bg-background-secondary"
                        }`}
                        onClick={() => {
                          setGenderFilter(option.value);
                          setIsGenderDropdownOpen(false);
                        }}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Characters label */}
            <div className="px-4 py-3 bg-white flex-shrink-0">
              <h3 className="text-typography-900 text-base font-semibold">
                {en.common.characters}
              </h3>
            </div>

            {/* Character list */}
            <div
              ref={characterListRef}
              className="h-[465px] overflow-y-auto p-4 custom-scrollbar bg-white"
            >
              {filteredCharacters.length === 0 && !isLoading ? (
                <div className="p-4 text-center text-typography-600 text-sm">
                  {en.common.noResultsFound}
                </div>
              ) : (
                filteredCharacters.map(character => (
                  <div
                    key={character.id}
                    className={`px-4 py-3 mb-2 cursor-pointer transition-colors border border-border-light rounded-lg bg-white hover:bg-background-secondary ${
                      selectedCharacterId === character.id ? "bg-primary-50" : ""
                    }`}
                    onClick={() => handleCharacterSelect(character)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-typography-900 text-base font-semibold mb-1">
                          {character.name}
                        </h4>
                        <p className="text-typography-600 text-sm">
                          {character.age} years •{" "}
                          {character.gender.charAt(0).toUpperCase() + character.gender.slice(1)}
                        </p>
                      </div>
                      {selectedCharacterId === character.id && (
                        <div className="text-primary ml-2">
                          <Tick />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="p-4 text-center text-typography-600 text-sm">Loading...</div>
              )}
            </div>
          </div>

          {/* Right side - Form fields */}
          <div className="bg-white overflow-y-auto custom-scrollbar">
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="text-typography-900 text-base font-medium mb-2 block">
                  {formFieldNames.NAME}
                </label>
                <Controller
                  name={formFieldIds.NAME}
                  control={formMethods.control}
                  defaultValue=""
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Priya Sharma"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                      readOnly
                    />
                  )}
                />
              </div>

              {/* Age and Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-typography-900 text-base font-medium mb-2 block">
                    {formFieldNames.AGE}
                  </label>
                  <Controller
                    name={formFieldIds.AGE}
                    control={formMethods.control}
                    defaultValue=""
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="22"
                        className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                        readOnly
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="text-typography-900 text-base font-medium mb-2 block">
                    {formFieldNames.GENDER}
                  </label>
                  <Controller
                    name={formFieldIds.GENDER}
                    control={formMethods.control}
                    defaultValue=""
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        placeholder="Female"
                        className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                        readOnly
                      />
                    )}
                  />
                </div>
              </div>

              {/* Profession */}
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
                      placeholder="Software Engineer"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                      readOnly
                    />
                  )}
                />
              </div>

              {/* Current location */}
              <div>
                <label className="text-typography-900 text-base font-medium mb-2 block">
                  {formFieldNames.CURRENT_LOCATION}
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

              {/* Gender identity */}
              <div>
                <label className="text-typography-900 text-base font-medium mb-2 block">
                  {formFieldNames.GENDER_IDENTITY}
                </label>
                <Controller
                  name={formFieldIds.GENDER_IDENTITY}
                  control={formMethods.control}
                  defaultValue=""
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Agender"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                      readOnly
                    />
                  )}
                />
              </div>

              {/* Sexual orientation */}
              <div>
                <label className="text-typography-900 text-base font-medium mb-2 block">
                  {formFieldNames.SEXUAL_ORIENTATION}
                </label>
                <Controller
                  name={formFieldIds.SEXUAL_ORIENTATION}
                  control={formMethods.control}
                  defaultValue=""
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Straight"
                      className="w-full rounded border border-border-light px-3 py-2 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                      readOnly
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
